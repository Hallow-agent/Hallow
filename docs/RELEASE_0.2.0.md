# Hallow 0.2.0 — Arc Agent Economy Preview

Hallow 0.2.0 turns the local Agent OS into a policy-governed participant in the Arc agent economy. Agents can inspect network and identity state, prepare bounded work agreements, execute privately, and create tamper-evident receipts for later USDC settlement verification.

## What ships

- **Arc network verification.** `hallow arc status` checks the live testnet, chain ID, moving blocks, and deployed reference contracts through an official RPC failover set.
- **Agent identity context.** `hallow arc agent <agent-id>` reads ERC-8004 ownership and metadata without treating registration alone as proof of trust.
- **Bounded job planning.** `hallow arc plan-job` validates provider, evaluator, budget, expiry, evidence commitment, registration, allowlists, and human-approval thresholds before producing an intent.
- **Work Receipts.** Hallow hashes the job intent, deliverable, and evidence root so verification can be public while prompts, memory, credentials, and private work remain local.
- **Model tools.** Arc status, Agent Passport, and job planning are available to the runtime as governed tools rather than prompt-only conventions.
- **Arc product surface.** The website, architecture guide, and reusable example skill now explain the end-to-end work, proof, and settlement model.

## Safety boundary

This is a testnet preview. Hallow does not sign or broadcast Arc transactions in 0.2.0. A model cannot access wallet keys through these tools. Jobs above the configured threshold require explicit human approval, and the evaluator must be independent from the client and provider.

## Verify the release

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm installer:check
corepack pnpm hallow --version
corepack pnpm hallow arc status
```

Expected local result: all automated tests pass and the CLI reports `Hallow ARC PREVIEW (0.2.0)`. The live Arc command additionally depends on public RPC availability.

## Next

The next milestone is an audited signing boundary, explicit wallet-session permissions, production settlement adapters, and stronger process isolation. Those capabilities will not be enabled until their approval, recovery, and evidence paths are testable end to end.
