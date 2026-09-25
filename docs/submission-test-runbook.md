# Submission test runbook

Use this checklist after deploying the latest commit to Vercel. It is ordered by
submission value. The second launch below is a deliberate confidence test, not
a requirement of the protocol.

## Vercel environment checklist

Add these server-side values to the production deployment:

```dotenv
CLAWPUMP_API_KEY=secret-from-clawpump
CLAWPUMP_AGENT_ID=58a43244-1c49-4e4c-b9c3-8f1e5c3dc51d
PYTH_PRO_API_KEY=secret-from-pyth
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_YOUR_SERVER_KEY
CRON_SECRET=a-long-random-secret

METEORA_DBC_CONFIG_ADDRESS=GVmofTcACEyQEdPGTLqiXeZNYBiCEX8wcr7mAkgHSYc
METEORA_DBC_POOL_ADDRESS=HSokfXowJKiSvDoQtR3oVTuvBJ7kneUqZVE9pypZCnib

SOLANA_CLUSTER=mainnet-beta
SOLANA_RPC_URL=https://solana-rpc.publicnode.com
NEXT_PUBLIC_SOLANA_CLUSTER=mainnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://solana-rpc.publicnode.com
NEXT_PUBLIC_SITE_URL=https://continuity-alpha-rouge.vercel.app
```

Keep these two existing reference-launch values for historical/replay support;
the new custom launch does not use them to define ORBIT:

```dotenv
CONT_OPERATOR_WALLET=HknktYe69MFMHiP6wktLoYia4W85FGH5pYXBFFMWJTgk
CONT_TOKEN_METADATA_URI=https://continuity-alpha-rouge.vercel.app/token/cont.json
```

`JUPITER_API_KEY` is optional. The app uses Jupiter's public Lite API when it is
absent. Never prefix a secret with `NEXT_PUBLIC_`.

The copyable RPC above is PublicNode's current public Solana mainnet endpoint.
It was verified for RPC health, a fresh confirmed blockhash, and browser CORS
from the deployed Continuity origin on 25 September 2026. It is suitable for
the submission demo without creating another account. A public endpoint still
has no private service-level agreement; after submission, replace the
server-side URL with a dedicated provider endpoint and use an origin-restricted
browser key for `NEXT_PUBLIC_SOLANA_RPC_URL`.

## 1. Production product smoke test

1. Open `https://continuity-alpha-rouge.vercel.app/app`.
2. Confirm it redirects to `/app/markets`.
3. Confirm **Markets**, **Launch**, **Treasury**, and **Activity** are the only
   product tabs.
4. Under **Stock coverage**, open SpaceX and verify the `SPACEX → SPCXx`
   lifecycle evidence.
5. Under **Protected markets**, confirm `CONT/SPCXx` is active. Open **Trade**
   to verify Jupiter receives the exact SPCXx/CONT pair, **Pool** to inspect the
   live DBC account, and **Launch** to inspect the confirmed transaction.
6. Open **Launch** and confirm it starts the five-step **Create a protected
   market** flow rather than showing the completed CONT reference launch.
7. Open **Activity** and confirm the latest Sentinel history loads.

Expected cost: none. Expected onchain transaction: none.

## 2. Launch a second protected market — complete

The `ORBIT/SPCXx` confidence launch is complete. These steps are retained so a
judge can reproduce the flow with a new base token and agent, while keeping `SPCXx` as the
verified stock quote. The other seven current PreStocks mints are monitored, but
their live audits currently fail Meteora DBC quote-badge and transfer-fee checks.
Continuity must not label them launch-ready until those onchain requirements
change.

### Test profile

- ClawPump agent name: `Orbit Guardian`
- Persona:

```text
A cautious, concise agent that checks tokenized-stock lifecycle evidence before
suggesting market actions. It never signs transactions or claims that a stock
token is safe without a current Continuity verdict.
```

- Agent skills: keep the default ClawPump skills; Continuity Sentinel may be
  added after the launch
- Token name: `Orbit Guard`
- Token symbol: `ORBIT`
- Token description:

```text
Agent token for Orbit Guardian, a lifecycle-aware monitor for protected
stock-quoted markets.
```

- Stock quote: `SPCXx`

### Steps

1. Open **Launch** and connect the human operator wallet.
2. In **Agent & token**, choose **Create a ClawPump agent** and use the profile
   above.
3. Copy the new agent wallet from ClawPump. If the safety check reports that it
   does not yet exist on Solana, send `0.005 SOL` to that exact wallet and save
   the funding signature.
4. Enter the ORBIT token values above and continue.
5. In **Stock quote**, select `SPCXx`. Review the exact mint and source evidence.
6. In **Market setup**, review the opening fee, graduation target, permanent
   liquidity, and DAMM v2 destination. Use each `?` control for plain-language
   help.
7. Run **Safety check**. Do not continue unless both wallets are ready and the
   Solana simulation passes.
8. In **Approve**, compare the market, costs, mints, and pool accounts, then
   approve the single wallet request.
9. Wait for final confirmation. Refresh **Markets** and confirm `ORBIT/SPCXx`
   appears under **Protected markets** with an active Sentinel status. Open its
   **Trade**, **Pool**, and **Launch** links to verify the post-launch path.
10. Send the maintainer:
    - the new ClawPump agent ID and wallet;
    - its funding signature, if one was needed;
    - the ORBIT launch signature;
    - the base mint, DBC config, and virtual-pool addresses shown by Continuity.

Expected mainnet transactions: one agent-wallet funding transfer if needed, and
one operator-approved Meteora launch. Stop and send a screenshot if the safety
check does not pass; do not bypass a failed gate.

## 3. Verify automatic monitoring

Continuity is configured to run one automatic check every day on Vercel's free
plan. That single job checks the lifecycle policy and then loops through every
registered protected market. You do not trigger each ClawPump agent separately.

The command below is only an immediate **check now** test for the final demo. It
does not replace the automatic schedule:

```bash
curl -sS https://continuity-alpha-rouge.vercel.app/api/v1/sentinel/schedule \
  -H "Authorization: Bearer $CRON_SECRET"
```

The response should contain:

- a lifecycle verdict and record hash;
- the next scheduled run time;
- a `CONT/SPCXx` market result;
- an active/current pool state, unless the live evidence genuinely changed.

Refresh **Activity** and **Markets** after the call. Save the JSON response and
one screenshot. In Vercel, open **Project → Settings → Cron Jobs** and confirm
`/api/v1/sentinel/schedule` is enabled. Never paste or record `CRON_SECRET`.

Expected cost: none. Expected onchain transaction: none.

## 4. Test Continuity from an external MCP client

MCP is a standard connection that lets an AI application use Continuity's
read-only tools. This test proves that an application outside our own website
can connect. Use the official MCP Inspector as the quickest independent client:

```bash
npx -y @modelcontextprotocol/inspector
```

In the Inspector:

1. on the **Servers** screen, click **Add Servers** in the top-right;
2. choose **Streamable HTTP** and name the server `continuity`;
3. enter `https://continuity-alpha-rouge.vercel.app/api/mcp` as the URL;
4. leave authentication, headers, command, and arguments empty, then save;
5. switch the new `continuity` server on and open its **Tools** view;
6. list tools and confirm the three tools below appear;
7. run `list_market_lifecycle` with `{}`;
8. run `get_market_evidence` with `{ "slug": "spacex" }`;
9. run `run_quote_rail_scan` with
   `{ "idempotencyKey": "submission-mcp-2026-09-25" }`.

Capture the tool list and the final scan result showing the verdict, evidence
hash, record hash, and next run time. Open **Activity** and leave it visible;
Sentinel history polls Supabase and should show the new `MCP` row within about
15 seconds without a manual refresh. A blocked or review-required safety verdict
is still a successful MCP test: it proves the external client received the
deterministic decision without receiving wallet authority.

### Verified external MCP proof — 25 September 2026

The deployed endpoint returned HTTP 200 for all three tools from an independent
client. The persisted scan returned:

- run ID: `0f564b58-b05a-4dc7-ac06-fc14b693bc33`;
- trigger: `MCP`;
- verdict: `LAUNCH_BLOCKED`;
- action: `REVIEW_MANIFEST`;
- evidence hash: `023eca5d071ab7d52ae5bd6b31839929735a553287a5e53792764c4e860fbb29`;
- record hash: `a6417b0083d6e2eb32ec5bfb08a6f5c702285443fac88173d5964730a29d7b86`;
- execution: no transaction created and no wallet signature requested.

This is application evidence, not an onchain transaction, so it is recorded in
this runbook rather than the mainnet transaction ledger.

### Captured MCP Inspector evidence

The submitted external-client test is preserved in the repository:

1. [Connected Continuity server](evidence/mcp-inspector/01-connected-server.png)
   — Streamable HTTP connection to the deployed `/api/mcp` endpoint.
2. [Lifecycle registry result](evidence/mcp-inspector/02-lifecycle-registry.png)
   — independently returned current and historical lifecycle records.
3. [Sentinel scan result](evidence/mcp-inspector/03-sentinel-scan.png)
   — MCP-triggered decision with evidence and reason codes, with no transaction
   or wallet authority granted.

The captured Inspector scan has run ID
`0350e889-e3b9-42a4-afe9-40c78e93d236`, trigger `MCP`, action
`REVIEW_MANIFEST`, and verdict `LAUNCH_BLOCKED`. Together with the independently
verified hash-chained run above, it proves both repeatable client access and
durable server-side persistence.

These three captures are sufficient MCP proof. A separate screenshot is useful
only if the demo also shows the matching `MCP` entry appearing automatically in
the in-product Sentinel history.

Expected cost: none. Expected onchain transaction: none.

## 5. Install and run the Continuity Sentinel skill on ClawPump — complete

The successful production run is preserved at
[`evidence/clawpump/01-sentinel-skill-run.png`](evidence/clawpump/01-sentinel-skill-run.png).
ClawPump returned `LAUNCH_BLOCKED` with evidence hash `a5071619…013818` and
record hash `075dbddb…39e607`. Continuity persisted the exact hashes under run
ID `418a803d-8916-4484-8a42-5c093c1d7351` in `SUPABASE_DURABLE` storage. A
blocked safety verdict proves the integration worked; this test was not
expected to authorize a launch.

The captured version treated missing post-launch hash decoding as
`CONFIG_HASH_MISMATCH`. The corrected policy now reports
`CONFIG_ATTESTATION_PENDING` and manual review unless an actual mismatch is
proven. The captured hashes still prove the agent response and durable record
are identical.

The following steps reproduce the completed test:

The skill is a plain instruction file already stored in this repository at
`skills/continuity-sentinel/SKILL.md`. Installing it means copying that file's
contents into the ClawPump skill editor; it is not an npm package and it does
not give the agent a private key.

1. Open the **Continuity Sentinel** agent in ClawPump.
2. Open **Skills** and choose **Create Skill**.
3. Name it `Continuity Sentinel`.
4. Paste the complete contents of
   `skills/continuity-sentinel/SKILL.md` into the skill editor.
5. Save it, enable it for the agent, and confirm the agent has an active model.
6. In agent chat, send:

```text
Run the Continuity Sentinel skill for CONT/SPCXx. Return the verdict, reason
codes, evidence hash, record hash, and nextRunAt. Do not sign or submit any
transaction.
```

7. Confirm the answer contains live Continuity values rather than a generic
   explanation.
8. Create a scheduled automation with the same prompt, then manually trigger it
   once if ClawPump offers **Run now**.
9. Capture the enabled skill, the agent result, and the automation/run record.

Expected cost: model usage only. Expected onchain transaction: none.

The maintained evidence checklist, official-source links, and alternative MCP
tool route are in [`external-agent-access.md`](external-agent-access.md).

## 6. Prove the paid x402 service

x402 is tested from ClawPump, not from the Continuity Launch page. ClawPump puts
a payment gate in front of the Sentinel agent: a buyer pays a very small amount,
then receives the read-only Continuity answer.

### Publish the seller endpoint

1. In ClawPump, open the Continuity Sentinel agent's **Cloud Service** page.
2. Connect the settlement wallet requested by ClawPump.
3. Ensure the agent has an active model or provider connection.
4. Turn **Service active** on.
5. Set the lowest practical test price. The current verified deployment uses
   `$0.10` per request.
6. Use this public description:

```text
Checks whether a stock-token quote asset is still safe for an agent market and
returns a source-backed Continuity verdict and proof hashes.
```

7. Save and copy the generated `https://x402.clawpump.tech/v1/...` endpoint.

### Verify payment discovery

```bash
curl -i -X POST 'PASTE_X402_ENDPOINT_HERE' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Run Continuity Sentinel for CONT/SPCXx and return the verdict and proof hashes.",
    "history": []
  }'
```

The unpaid request must return HTTP `402` with payment requirements. Capture
the status and redacted payment terms.

Verified on 25 September 2026: the deployed Continuity Sentinel endpoint
returned HTTP `402` and reported the service active and ready. Do **not** move
to the paid step yet: the service body labels settlement as Solana mainnet but
the signed payment header quotes Solana devnet and devnet USDC. ClawPump must
return a consistent mainnet payment requirement first. The safe discovery
record is in
[`evidence/clawpump/03-x402-discovery.txt`](evidence/clawpump/03-x402-discovery.txt).

### Complete one paid request

Use a separate ClawPump buyer agent with its built-in x402 capability, or
another x402-aware Solana wallet/client. Give it the generated endpoint and the
same message. Review the quoted network, asset, amount, and recipient before
approving. Do not expose a private key or paste one into a screenshot.

The paid retry should return the Continuity Sentinel answer. Capture:

- the 402 discovery response;
- the successful paid response;
- the ClawPump Cloud Service request/revenue record;
- the settlement signature if ClawPump exposes one.

If a buyer agent needs funding, fund only the exact quoted payment plus the
small buffer shown by ClawPump. Send the funding and settlement signatures to
the maintainer so they can be added to the mainnet evidence document.

For the current ClawPump buyer-agent flow, enable its built-in `x402` skill,
run `x402_pay_check` first, verify the quote with the user, then run `x402_pay`
with `confirm_payment: true` and a matching `max_amount_usd` cap. See
[`external-agent-access.md`](external-agent-access.md) for the exact evidence
screenshots and official references.

## Final evidence required before recording the video

- production Markets screenshot with active `CONT/SPCXx`;
- finalized launch transaction on Solscan;
- second protected market (`ORBIT/SPCXx`) and its launch transaction;
- fresh scheduled Sentinel result;
- external MCP tool call and persisted MCP run;
- enabled ClawPump custom skill and one agent result;
- x402 HTTP 402 discovery (complete) plus one successful paid request after the
  current mainnet/devnet settlement mismatch is fixed.

The second launch is complete only when it appears under **Protected markets**
after a page refresh. Record its ClawPump funding and Continuity launch
transactions in `docs/mainnet-transaction-evidence.md`.
