# Continuity agent instructions

Read `private-notes/README.md` before changing product behavior, architecture, integrations, economic design, or the demo.

- For product scope and claims, follow `private-notes/01-product-and-scope.md`.
- For implementation boundaries and repository structure, follow `private-notes/03-architecture.md` and `private-notes/11-implementation-plan.md`.
- For Solana transactions or programs, follow `private-notes/04-solana-build-guide.md` and `private-notes/08-security-and-trust.md`.
- For action manifests, policies, decisions, or receipts, follow `private-notes/05-domain-model-and-contracts.md`, the JSON schemas, and `private-notes/06-agent-policy-and-lifecycle.md`.
- For sponsor or hackathon claims, follow `private-notes/02-sponsor-and-competition.md` and `private-notes/13-demo-submission-and-evidence.md`.
- Record architecture or product decisions in `private-notes/15-decisions-risks-and-open-questions.md`; keep each fact authoritative in one file and link to it elsewhere.

Financial actions default to preview or simulation. A transaction becomes executable only after deterministic policy checks and the configured approval mode pass.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
