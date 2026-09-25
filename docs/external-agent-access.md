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

## ClawPump skill proof — complete

On 25 September 2026, the deployed **Continuity Sentinel** agent successfully
used the installed skill from ClawPump Chat. It returned:

- verdict: `LAUNCH_BLOCKED`;
- reason codes: `CONFIG_HASH_MISMATCH` and `LIFECYCLE_REVIEW_REQUIRED`;
- evidence hash: `a5071619…013818`;
- record hash: `075dbddb…39e607`; and
- next run: `2026-09-26T00:18:59.857Z`.

Continuity's public run history contains the same complete hashes under run ID
`418a803d-8916-4484-8a42-5c093c1d7351`, trigger `ON_DEMAND`, and durable
storage scope `SUPABASE_DURABLE`. The screenshot is preserved at
[`evidence/clawpump/01-sentinel-skill-run.png`](evidence/clawpump/01-sentinel-skill-run.png).
The enabled custom-skill state is preserved at
[`evidence/clawpump/00-custom-skill-enabled.png`](evidence/clawpump/00-custom-skill-enabled.png).

`LAUNCH_BLOCKED` is a successful integration result: the agent reached
Continuity and honestly returned the current safety decision. No transaction
was created, signed, or submitted.

The captured build reported `CONFIG_HASH_MISMATCH` whenever full post-launch
configuration-hash decoding was unavailable. The subsequent policy correction
separates absence of attestation from proof of a mismatch: future runs return
`CONFIG_ATTESTATION_PENDING` and `MANUAL_REVIEW` unless a real mismatch is
observed. The screenshot remains valid transport and persistence proof; it is
not evidence that the live pool was corrupted.

### Reproduce the skill run

The skill source is [`../skills/continuity-sentinel/SKILL.md`](../skills/continuity-sentinel/SKILL.md).
It tells the agent to fetch a fresh Continuity scan, return the exact verdict
and hashes, and never sign a transaction.

1. Open the **Continuity Sentinel** agent in the ClawPump dashboard.
2. Open **Skills** and choose **Create Skill**.
3. Name it `Continuity Sentinel`.
4. Paste the complete contents of `skills/continuity-sentinel/SKILL.md`.
5. Save it and make sure it is enabled for that agent.
6. Confirm the agent has an active model/provider connection.
7. Deploy the current Continuity build. The skill's interactive path uses the
   read-only `GET /api/v1/scans/quote-rail` entry because ClawPump Chat's public
   fetcher does not issue POST requests. The paid x402 path remains `POST`.
8. In the agent chat, send:

```text
Run the Continuity Sentinel skill for CONT/SPCXx. Return the verdict, reason
codes, evidence hash, record hash, and nextRunAt. Do not sign or submit any
transaction.
```

9. Confirm the reply contains live values, not only a general explanation.
10. Open Continuity **Activity** and wait up to 15 seconds for the new external
   scan record to appear automatically.

If the reply says `HTTP 405`, the deployed Continuity version or the saved
ClawPump skill is stale. Redeploy Continuity, replace the saved skill with the
current `SKILL.md`, and run the same prompt again. Do not point the chat agent at
`/api/mcp`; MCP is a separate protocol used by MCP clients such as Inspector.

ClawPump also exposes official custom-skill tools (`create_custom_skill`,
`update_custom_skill`, and `list_custom_skills`) if the dashboard editor is not
used. The dashboard wording can change, but the saved skill, enabled state, and
agent result are the evidence that matters.

### Additional screenshots for a demo

1. ClawPump Skills page showing `Continuity Sentinel` enabled.
2. The agent reply showing verdict, reason codes, evidence hash, record hash,
   and next run time.
3. Continuity Activity showing the matching persisted run.

Do not include an API key, provider key, private key, session token, or full
authorization header in any screenshot.

## x402 Cloud Service proof — deployment and discovery complete

The Continuity Sentinel Cloud Service is active at:

```text
https://x402-gateway-production-2907.up.railway.app/v1/continuity-sentinel-58a43244
```

Its configured price is `$0.10` per request. The active-service screen is
preserved at
[`evidence/clawpump/02-x402-cloud-service-active.png`](evidence/clawpump/02-x402-cloud-service-active.png).

On 25 September 2026, an unpaid POST using the Continuity scan prompt returned
the expected HTTP `402`. The JSON body identified the service as active and
ready and named the configured settlement wallet. This proves endpoint
deployment, request-schema validation, and payment discovery without spending
funds.

The same response also exposed a settlement mismatch that blocks the paid
test. Its service metadata labels the payment network as Solana mainnet, while
the signed `Payment-Required` header asks for network
`solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` and asset
`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`—Solana devnet and devnet USDC.
The signed resource URL also uses `http://` while the public endpoint is HTTPS.
Continuity will not authorize payment until ClawPump returns one internally
consistent mainnet quote. The redacted discovery record is at
[`evidence/clawpump/03-x402-discovery.txt`](evidence/clawpump/03-x402-discovery.txt).

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
6. Set the lowest practical test price. The verified deployment currently uses
   `$0.10` per request.
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

Before paying, compare the signed `Payment-Required` network and asset with the
Cloud Service's displayed settlement network. Stop if one says mainnet and the
other says devnet, as the verified 25 September response currently does.

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
