# External agent access

Continuity exposes one safety decision through three different entry points.
They share the same evidence and never grant an outside agent permission to
sign the human operator's launch transaction.

| Entry point | What it is for | Payment |
| --- | --- | --- |
| MCP | Claude, Codex, Inspector, or another MCP client calls Continuity tools directly | None |
| ClawPump skill | A ClawPump agent learns when and how to request and explain a Continuity scan | Normal agent/model usage |
| ClawPump x402 Cloud | A public caller pays before the ClawPump agent runs the skill | Price configured by the agent owner |

## MCP proof — complete

The deployed Streamable HTTP endpoint is:

```text
https://continuity-alpha-rouge.vercel.app/api/mcp
```

An external MCP Inspector connected successfully and called the lifecycle and
Sentinel tools. The captured proof is stored in:

- [`evidence/mcp-inspector/01-connected-server.png`](evidence/mcp-inspector/01-connected-server.png)
- [`evidence/mcp-inspector/02-lifecycle-registry.png`](evidence/mcp-inspector/02-lifecycle-registry.png)
- [`evidence/mcp-inspector/03-sentinel-scan.png`](evidence/mcp-inspector/03-sentinel-scan.png)

The scan was persisted with trigger `MCP`, verdict `LAUNCH_BLOCKED`, and action
`REVIEW_MANIFEST`. A safety refusal is a successful integration result: the
external client received the deterministic answer and proof without wallet
authority.

## Install and run the ClawPump skill

The skill source is [`../skills/continuity-sentinel/SKILL.md`](../skills/continuity-sentinel/SKILL.md).
It tells the agent to fetch a fresh Continuity scan, return the exact verdict
and hashes, and never sign a transaction.

1. Open the **Continuity Sentinel** agent in the ClawPump dashboard.
2. Open **Skills** and choose **Create Skill**.
3. Name it `Continuity Sentinel`.
4. Paste the complete contents of `skills/continuity-sentinel/SKILL.md`.
5. Save it and make sure it is enabled for that agent.
6. Confirm the agent has an active model/provider connection.
7. In the agent chat, send:

```text
Run the Continuity Sentinel skill for CONT/SPCXx. Return the verdict, reason
codes, evidence hash, record hash, and nextRunAt. Do not sign or submit any
transaction.
```

8. Confirm the reply contains live values, not only a general explanation.
9. Open Continuity **Activity** and wait up to 15 seconds for the new external
   scan record to appear automatically.

ClawPump also exposes official custom-skill tools (`create_custom_skill`,
`update_custom_skill`, and `list_custom_skills`) if the dashboard editor is not
used. The dashboard wording can change, but the saved skill, enabled state, and
agent result are the evidence that matters.

### Capture these screenshots

1. ClawPump Skills page showing `Continuity Sentinel` enabled.
2. The agent reply showing verdict, reason codes, evidence hash, record hash,
   and next run time.
3. Continuity Activity showing the matching persisted run.

Do not include an API key, provider key, private key, session token, or full
authorization header in any screenshot.

## Publish and test the paid x402 service

x402 is not tested from the Continuity Launch page. ClawPump places a payment
gate in front of the Sentinel agent and runs it only after the payment
handshake succeeds.

### Seller setup

1. Open the **Continuity Sentinel** agent in ClawPump.
2. Open **Cloud Service**.
3. Connect the settlement wallet requested by ClawPump.
4. Confirm the agent has an active model/provider connection.
5. Turn **Service active** on.
6. Set the lowest practical test price, for example `$0.01` per request.
7. Use this description:

```text
Checks whether a stock-token quote asset is safe for an agent market and
returns a source-backed Continuity verdict and proof hashes.
```

8. Save changes and copy the generated
   `https://x402.clawpump.tech/v1/<agent-slug>` endpoint.

### Prove payment discovery

Run this with the generated endpoint:

```bash
curl -i -X POST 'PASTE_X402_ENDPOINT_HERE' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Run Continuity Sentinel for CONT/SPCXx and return the verdict and proof hashes.",
    "history": []
  }'
```

The unpaid request should return HTTP `402` with the amount, token, network,
and payment destination. This proves that the service is protected, but it does
not prove a payment completed.

### Complete one paid call

The simplest buyer is a separate ClawPump agent with the built-in `x402` skill:

1. Enable the buyer agent's `x402` skill.
2. Make sure its wallet has enough USDC for the quoted price.
3. Ask it to inspect the endpoint with `x402_pay_check`.
4. Compare the returned endpoint, network, token, amount, and recipient.
5. Approve only that exact amount.
6. Ask it to call `x402_pay` with `confirm_payment: true` and
   `max_amount_usd` equal to the approved cap.
7. Confirm the paid response contains the Continuity verdict and proof hashes.
8. Confirm the seller's Cloud Service request/revenue record appears and the
   configured settlement wallet receives the payment.

ClawPump's official x402 tools hard-cap the approved spend. Never paste a
private key into a chat, terminal capture, source file, or screenshot.

### Capture these items

1. Cloud Service active screen showing the public endpoint and price.
2. Unpaid terminal response showing HTTP `402` and redacted payment terms.
3. Buyer approval/paid result showing the Continuity verdict and hashes.
4. Seller request/revenue record.
5. Settlement transaction signature or receipt, if ClawPump exposes one.
6. Continuity Activity showing the matching scan record.

Send the settlement signature to the maintainer for the mainnet evidence index.

## Official references

- [ClawPump custom skills and MCP tools](https://clawpump.tech/docs)
- [ClawPump guide: custom skills and x402 Cloud](https://www.clawpump.tech/guide)
- [ClawPump Partner API](https://www.clawpump.tech/developers)
- [Official ClawPump agent skill: x402 payment flow](https://github.com/Clawpump/claw-agent/blob/main/skills/clawpump/SKILL.md)
