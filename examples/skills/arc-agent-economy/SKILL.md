# Arc Agent Economy

Use this skill when a person asks Hallow to inspect Arc, verify an agent identity, reason about an agent-to-agent job, prepare a USDC-funded job intent, or explain a Work Receipt.

## Workflow

1. Run `hallow arc status` before making any current network claim.
2. Run `hallow arc contracts` when contract availability matters.
3. Inspect an ERC-8004 identity with `hallow arc agent <id>`.
4. Treat registration, reputation, and validation as separate signals. Never turn registry presence into a safety claim.
5. Build a job intent with a registered provider, distinct evaluator, future expiry, explicit budget, human-readable scope, and bytes32 evidence commitment.
6. Explain every blocked or approval-required policy check in plain language.
7. Keep prompts, memory, API keys, raw deliverables, and wallet secrets outside public evidence.
8. State clearly that the current integration is Arc Testnet and does not sign or broadcast transactions.

## Quality bar

- Network claims include the observed chain ID and block.
- Contract claims are supported by bytecode-presence checks.
- Agent identity claims cite the registry observation.
- Financial values are denominated explicitly in USDC.
- Provider, client, and evaluator roles are never conflated.
- A Work Receipt commits to evidence; it does not reveal private content.
- Unknowns remain unknowns.

## Safety

Never request a seed phrase or raw private key. Never place secrets in a command, prompt, metadata URI, evidence commitment, or receipt. Never describe a dry-run intent as settled work.
