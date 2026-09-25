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
3. Confirm **Markets**, **Launch**, and **Activity** are the only product tabs.
4. Under **Stock coverage**, open SpaceX and verify the `SPACEX → SPCXx`
   lifecycle evidence.
5. Under **Protected markets**, confirm `CONT/SPCXx` is active. Open **Trade**
   to verify Jupiter receives the exact SPCXx/CONT pair, **Pool** to inspect the
   live DBC account, and **Launch** to inspect the confirmed transaction.
6. Open **Launch** and confirm it starts the five-step **Create a protected
   market** flow rather than showing the completed CONT reference launch.
7. Open **Activity** and confirm the latest Sentinel history loads.

Expected cost: none. Expected onchain transaction: none.

## 2. Launch a second protected market

Use a new base token and a new ClawPump agent, while keeping `SPCXx` as the
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

1. choose **Streamable HTTP**;
2. enter `https://continuity-alpha-rouge.vercel.app/api/mcp`;
3. connect and list tools;
4. run `list_market_lifecycle` with `{}`;
5. run `get_market_evidence` with `{ "slug": "spacex" }`;
6. run `run_quote_rail_scan` with
   `{ "idempotencyKey": "submission-mcp-2026-09-25" }`.

Capture the tool list and the final scan result showing the verdict, evidence
hash, record hash, and next run time. Refresh **Activity** to confirm the MCP run
was persisted.

Expected cost: none. Expected onchain transaction: none.

## 5. Install and run the Continuity Sentinel skill on ClawPump

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

## 6. Prove the paid x402 service

x402 is tested from ClawPump, not from the Continuity Launch page. ClawPump puts
a payment gate in front of the Sentinel agent: a buyer pays a very small amount,
then receives the read-only Continuity answer.

### Publish the seller endpoint

1. In ClawPump, open the Continuity Sentinel agent's **Cloud Service** page.
2. Connect the settlement wallet requested by ClawPump.
3. Ensure the agent has an active model or provider connection.
4. Turn **Service active** on.
5. Set the lowest practical test price, such as `$0.01` per request.
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

## Final evidence required before recording the video

- production Markets screenshot with active `CONT/SPCXx`;
- finalized launch transaction on Solscan;
- second protected market (`ORBIT/SPCXx`) and its launch transaction;
- fresh scheduled Sentinel result;
- external MCP tool call and persisted MCP run;
- enabled ClawPump custom skill and one agent result;
- x402 HTTP 402 discovery plus one successful paid request.

The second launch is complete only when it appears under **Protected markets**
after a page refresh. Record its ClawPump funding and Continuity launch
transactions in `docs/mainnet-transaction-evidence.md`.
