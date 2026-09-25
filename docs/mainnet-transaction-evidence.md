# Mainnet transaction evidence

This file is the public, human-readable index of Continuity's deliberate
mainnet tests. It complements the durable launch attempts, protected-market
records, Sentinel runs, and decision receipts stored in Supabase.

Do not add seed phrases, private keys, API keys, signed transaction payloads,
session cookies, bearer tokens, or unredacted provider responses here.

## Recording rules

Record every transaction Continuity deliberately asks a wallet to approve,
including failed transactions that reached Solana. Do not invent a signature
for a local validation or RPC failure that never reached the network.

For each attempt:

1. copy addresses and signatures from the confirmed application response or a
   Solana explorer, not from memory;
2. label the cluster explicitly;
3. record the reviewed configuration and transaction hashes before approval;
4. link the source lifecycle evidence and relevant app receipt;
5. state whether simulation, submission, and confirmation each succeeded;
6. capture failure logs without secrets when an attempt fails;
7. record the resulting Meteora addresses only after independent RPC or
   explorer verification; and
8. add the UTC time and the person who verified the entry.

## ClawPump agent funding

Only funding sent directly to the Continuity Sentinel / ClawPump agent belongs
in this public record. Exchange purchases, fiat on-ramps, bridges, and transfers
into the human operator wallet are private operational setup and are omitted.

| UTC time | Purpose | From network | Destination | Amount | Signature / transaction | Status | Verified by |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-09-25 10:08:52 UTC | Fund Continuity Sentinel from human operator | Solana mainnet | `2WS9kyBPFwgfoepmye5VpxbM4PrBa23f6GuiySJmikSQ` | `0.005 SOL` received | [`2VWsbq…EKhuS`](https://solscan.io/tx/2VWsbqoH2MxXUcSeXER7m5b9ypuxkXAy9qnSdtWXv36k7KLhkqVxweJq2rNVyRAVLkHmV7gRbgZRU9RYPWJEKhuS) | Finalized · slot `450321409` · fee `0.000005005 SOL` | Solana RPC |
| 2026-09-25 15:52:53 UTC | Fund Orbit Guardian from human operator | Solana mainnet | `2oenA5FK3xWEANyUxBMNcUvFFrJcHRBNjHJiv9iKcM9Z` | `0.005 SOL` received | [`2xUCYV…f139q`](https://solscan.io/tx/2xUCYV5sCHXtahHGwYiSdS5nsrn6bzisY5AGjWNMkEG1c4TCXeW1FzdwdR4wjKjRtSw497nTqAu58HSTUdkf139q) | Finalized · slot `450398487` · fee `0.000005005 SOL` | Solana RPC |

## Protected-market launch attempts

### CONT / SPCXx — confirmed

```text
Attempt ID: c3fe0d2e-f2f1-478d-ab83-af67aabd5f26
UTC time: 2026-09-25 10:40:10 UTC
Cluster: Solana mainnet-beta
Operator: HknktYe69MFMHiP6wktLoYia4W85FGH5pYXBFFMWJTgk
ClawPump agent ID: 58a43244-1c49-4e4c-b9c3-8f1e5c3dc51d
ClawPump agent wallet: 2WS9kyBPFwgfoepmye5VpxbM4PrBa23f6GuiySJmikSQ
Base token: Continuity (CONT)
Quote token: SPCXx
Quote mint: Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8
Lifecycle manifest: PreStocks SPACEX → SPCXx reference evidence
DBC configuration hash: 2b975ab6c0ff3317d749ae5928562c4b84107e8360175e94dfe5a00e1c1afd2f
Plan hash: a0ef78d7663d2a3cd38f2d7bb4dad83551dfeebfcc86d4d2c9e400705ac61199
Reviewed transaction-message hash: 2b5294f538dcdcac4b7a4c1df0cb0629188574e265c147e3aeaa7ce21869c22a
Recent blockhash: 4W51fKaQ1u7fmXLdrpoeYtpjDFnZiG85KEWTBiDGaZRQ
Simulation: Passed before approval
Onchain result: 144,185 compute units; no transaction error
Network fee: 15,000 lamports
Operator debit including created-account rent: 26,621,520 lamports
Wallet decision: Approved by the connected human operator
Transaction signature: 3Sbkexa2DvYaoGrn4ryXcy7SCaXa4GxgpWBVZnJfv5Y6L5hK4Rgc8bW43bNxhXEDu7wtN2J4STFv1MuELSKszch4
Confirmation: Finalized at slot 450328456
CONT/base mint: Hae9BEytCMNaFbdZ8eGnjqsBgG6VzhJqGRtNotkzepua
Meteora DBC configuration: GVmofTcACEyQEdPGTLqiXeZNYBiCEX8wcr7mAkgHSYc
Meteora virtual pool: HSokfXowJKiSvDoQtR3oVTuvBJ7kneUqZVE9pypZCnib
Migration pool: Not created; the DBC curve has not graduated
Supabase protected-market record: 5b1c4c3f-a781-4ff1-80fd-49697565f3ba · ACTIVE
Decision receipt hash: 6de402b9f10709b0625b4a226fbd0b23e104e8e3e352eb83fd9967c23e2ef218
Explorer: https://solscan.io/tx/3Sbkexa2DvYaoGrn4ryXcy7SCaXa4GxgpWBVZnJfv5Y6L5hK4Rgc8bW43bNxhXEDu7wtN2J4STFv1MuELSKszch4
Outcome: Confirmed and registered for monitoring
Failure diagnostics: None
Verified by: Continuity confirmation route, Supabase Data API, and independent finalized Solana RPC
```

Independent RPC verification at slot `450334263` found:

- the CONT mint owned by `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`;
- the DBC configuration owned by `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`;
- the DBC virtual pool owned by `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`.

### ORBIT / SPCXx — confirmed

```text
Attempt ID: 99e51723-c2cd-4bf1-98e2-ba5d853d587d
UTC time: 2026-09-25 15:59:52 UTC
Cluster: Solana mainnet-beta
Operator: HknktYe69MFMHiP6wktLoYia4W85FGH5pYXBFFMWJTgk
ClawPump agent: Orbit Guardian
ClawPump agent ID: ebfe8e98-c7d8-4876-9ece-0d6d63eda323
ClawPump agent wallet: 2oenA5FK3xWEANyUxBMNcUvFFrJcHRBNjHJiv9iKcM9Z
Base token: Orbit Guard (ORBIT)
Quote token: SPCXx
Quote mint: Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8
Lifecycle manifest: PreStocks SPACEX → SPCXx reference evidence
DBC configuration hash: 23669754dcf04859eb5617650caecdac94f855897684c7f42b0491daa0b466b9
Plan hash: aa1b92c58d87f3c619583577ff4a7c159f1bc49ca944d70adab4b95428874389
Reviewed transaction-message hash: e22d673c16b31cea73bcf0354eb2769940bf8144686b519fe9b4521a0d4cce24
Recent blockhash: JCrs2CeicPkhisbpji8cmWwfHkxTWio9s4BwTYj6BhLY
Simulation: Passed before approval
Onchain result: 145,494 compute units; no transaction error
Network fee: 15,000 lamports
Operator debit including created-account rent: 26,621,520 lamports
Wallet decision: Approved by the connected human operator
Transaction signature: 5a7MHhWV7hQ1VEkwrCRQohpNHgacCbZNdDLkMn8XfPZMe6KwGfJwXij6nbWLHMZk2LkUVwydpoo7NnjzyLYABK28
Confirmation: Finalized at slot 450400048
ORBIT/base mint: CuRACMHSYEFS32Cq9icPUkZdazBXvaKArtLoq8bwjkgG
Meteora DBC configuration: AtDU5jy5eprpEaDpWtBZztkycvJRqaNGSBSExHq6Ya1b
Meteora virtual pool: EBAYsw8Y9HzVinacauNAx11um8QUNAsLCShNeNV8M7jn
Migration pool: Not created; the DBC curve has not graduated
Supabase protected-market record: d9e27aa3-0a5a-4001-b661-aace21d6401e · ACTIVE
Decision receipt hash: 8b871cd2634ac2e66a5a755b5bb8eac7858834b29057fa84cfc608e6e1774b08
Explorer: https://solscan.io/tx/5a7MHhWV7hQ1VEkwrCRQohpNHgacCbZNdDLkMn8XfPZMe6KwGfJwXij6nbWLHMZk2LkUVwydpoo7NnjzyLYABK28
Pool: https://solscan.io/account/EBAYsw8Y9HzVinacauNAx11um8QUNAsLCShNeNV8M7jn
Outcome: Confirmed, registered, and reconciled by Sentinel
Failure diagnostics: None
Verified by: Continuity confirmation route, Supabase Data API, and independent finalized Solana RPC
```

Independent finalized RPC verification found:

- the ORBIT mint owned by `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`;
- the DBC configuration owned by `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`;
- the DBC virtual pool owned by `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`.

### Attempt template

Copy this section for each real attempt and replace every `Pending` value.

```text
Attempt ID: Pending
UTC time: Pending
Cluster: Solana mainnet-beta
Operator: Pending
ClawPump agent ID: Pending
ClawPump agent wallet: Pending
Base token: Pending
Quote token: Pending
Quote mint: Pending
Lifecycle manifest hash: Pending
DBC configuration hash: Pending
Reviewed transaction-message hash: Pending
Recent blockhash: Pending
Simulation: Pending
Estimated fee and rent: Pending
Wallet decision: Pending
Transaction signature: Pending
Confirmation slot: Pending
Base mint: Pending
Meteora DBC configuration: Pending
Meteora virtual pool: Pending
Migration pool: Pending until created by actual migration
Supabase protected-market record: Pending
Decision receipt hash: Pending
Explorer links: Pending
Outcome: Pending
Failure diagnostics: None
Verified by: Pending
```

## Confirmed protected markets

| Market | Base mint | Quote mint | DBC config | Virtual pool | Launch signature | Monitoring status |
| --- | --- | --- | --- | --- | --- | --- |
| CONT / SPCXx | `Hae9…epua` | `Xs3o…qpH8` | `GVmo…SYc` | `HSok…Cnib` | [`3Sbk…zch4`](https://solscan.io/tx/3Sbkexa2DvYaoGrn4ryXcy7SCaXa4GxgpWBVZnJfv5Y6L5hK4Rgc8bW43bNxhXEDu7wtN2J4STFv1MuELSKszch4) | Active · `POOL_LIVE` · lifecycle current |
| ORBIT / SPCXx | `CuRA…jkgG` | `Xs3o…qpH8` | `AtDU…Ya1b` | `EBAY…M7jn` | [`5a7M…BK28`](https://solscan.io/tx/5a7MHhWV7hQ1VEkwrCRQohpNHgacCbZNdDLkMn8XfPZMe6KwGfJwXij6nbWLHMZk2LkUVwydpoo7NnjzyLYABK28) | Active · `POOL_LIVE` · lifecycle current |

## Post-launch monitoring evidence

After a launch is confirmed, record the first successful scheduled Sentinel run,
the first quote-asset lifecycle evaluation, and any graduation or migration
event. Supabase remains the machine-readable record; this section links the
judge-readable proof.

| UTC time | Market | Check | Verdict | Sentinel run / receipt | Evidence |
| --- | --- | --- | --- | --- | --- |
| 2026-09-25 11:19:53 UTC | CONT / SPCXx | Initial registered-market reconciliation | `ACTIVE` · lifecycle `CURRENT` · DBC `POOL_LIVE` | `6de402b9…ef218` | 0 alerts; opening fee 100 bps; curve progress rounds to 0 bps; reserves persisted in Supabase |
| 2026-09-25 16:09:35 UTC | ORBIT / SPCXx | Initial registered-market reconciliation | `ACTIVE` · lifecycle `CURRENT` · DBC `POOL_LIVE` | `8b871cd2…74b08` | 0 alerts; opening fee 100 bps; curve progress 0 bps; base reserve `1,000,000,000,000,000`, quote reserve `0` |
