import { createMcpHandler } from "@modelcontextprotocol/server";
import { createContinuityMcpServer } from "@/services/continuity-mcp";

export const dynamic = "force-dynamic";

const handler = createMcpHandler(() => createContinuityMcpServer());

export async function POST(request: Request) {
  return handler.fetch(request);
}

export async function GET(request: Request) {
  return handler.fetch(request);
}

export async function DELETE(request: Request) {
  return handler.fetch(request);
}
