# Hallow 0.3.0 — Autonomic Commerce

Hallow 0.3.0 introduces a guarded machine-commerce loop for discovering and evaluating x402 services on Arc. It converts a paid HTTP challenge into a deterministic payment intent, enforces local policy, persists evidence, and stops at an isolated signer boundary.

## What ships

- **x402 discovery.** Hallow requests a public service, detects HTTP 402, decodes `PAYMENT-REQUIRED`, and records the resource, price, network, asset, scheme, and recipient.
- **Safety Kernel.** Every offer is checked against Arc Testnet, USDC, allowed payment schemes, recipient validity, blocked origins, per-payment limits, and daily limits.
- **Exact approval.** A payment above the autonomous threshold creates a Hallow approval bound to one immutable intent and policy hash.
- **Isolated signer contract.** A trusted adapter can authorize a ready intent without exposing signing material to the model. Payment signatures are used for the request and never stored in receipts.
- **Commerce receipts.** Successful paid responses produce hashes for the intent, authorization, response, and settlement reference.
- **Private persistence.** Inspections, intents, policy, and a hash-chained append-only ledger live under `~/.hallow/arc-economy/`. Payment planning stops if ledger integrity fails.
- **Agent tools.** Models can inspect services and plan payments, but cannot sign or spend.
- **Terminal UX.** Operators receive a focused commerce control surface through `hallow economy`.

## Commands

```bash
hallow economy status
hallow economy inspect https://service.example/report
hallow economy plan https://service.example/report \
  --purpose "Buy one independently verified report"
hallow economy autopilot https://service.example/report \
  --purpose "Buy one independently verified report"
```

`autopilot` automates discovery, offer decoding, policy evaluation, artifact persistence, ledger updates, and approval creation. It does not bypass the signer boundary.

## Default commerce policy

- maximum payment: 1 USDC;
- maximum settled and reserved per day: 5 USDC;
- human approval above 0.25 USDC;
- Arc Testnet and exact x402 scheme only;
- Arc USDC only;
- HTTPS required for payment planning;
- private-network targets and credential-bearing URLs blocked;
- execution tool disabled until a signer adapter is audited and configured.

## Verify

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm installer:check
corepack pnpm audit:prod
corepack pnpm hallow --version
corepack pnpm hallow economy status
```

Expected result: 34 automated tests pass and the CLI reports `Hallow AUTONOMIC COMMERCE (0.3.0)`.

## Next

The next milestone is a Circle-backed isolated signer, webhook-based reconciliation, ERC-8183 event indexing and lifecycle execution, deterministic evaluator plugins, and Gateway treasury management. Production settlement remains disabled until those paths are audited end to end.
