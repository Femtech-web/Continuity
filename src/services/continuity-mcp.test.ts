import assert from "node:assert/strict";
import test from "node:test";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { createContinuityMcpServer } from "./continuity-mcp.ts";

function parseServerSentEvent(body: string) {
  const dataLine = body
    .split("\n")
    .find((line) => line.startsWith("data: "));

  assert.ok(dataLine, "MCP response must contain an SSE data event");
  return JSON.parse(dataLine.slice("data: ".length)) as {
    result?: {
      tools?: Array<{
        name: string;
        annotations?: Record<string, boolean>;
      }>;
    };
  };
}

test("publishes only the intended read-only Continuity tools", async () => {
  const handler = createMcpHandler(() => createContinuityMcpServer());

  try {
    const response = await handler.fetch(new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    }));

    assert.equal(response.status, 200);

    const payload = parseServerSentEvent(await response.text());
    const tools = payload.result?.tools ?? [];

    assert.deepEqual(
      tools.map((tool) => tool.name),
      ["list_market_lifecycle", "get_market_evidence", "run_quote_rail_scan"],
    );

    for (const tool of tools) {
      assert.equal(tool.annotations?.readOnlyHint, true);
    }

    const scanTool = tools.find((tool) => tool.name === "run_quote_rail_scan");
    assert.equal(scanTool?.annotations?.destructiveHint, false);
    assert.equal(scanTool?.annotations?.idempotentHint, true);
  } finally {
    await handler.close();
  }
});
