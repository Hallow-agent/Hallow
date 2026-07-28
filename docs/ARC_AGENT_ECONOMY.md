# Hallow for Arc

Hallow is building a local-first execution, policy, and proof layer for the Arc agent economy.

Arc supplies the public economic rail:

- ERC-8004 agent identity, reputation, and validation registries;
- ERC-8183 job roles, escrow lifecycle, and settlement commitments;
- USDC-native gas and settlement;
- deterministic finality;
- CCTP and Gateway references for crosschain USDC.

Hallow supplies the private operating layer:

- model routing and local memory;
- bounded tools and MCP services;
- durable job execution and recovery;
- deterministic budget policy;
- independent evaluation requirements;
- evidence commitments and tamper-evident Work Receipts.

## Current scope

The implementation is deliberately testnet-only.

```bash
hallow arc status
hallow arc contracts
hallow arc agent 42
hallow arc plan-job \
  --provider 0x1111111111111111111111111111111111111111 \
  --evaluator 0x2222222222222222222222222222222222222222 \
  --budget 20 \
  --description "Analyze 500 public transactions" \
  --evidence 0xabababababababababababababababababababababababababababababababab \
  --provider-registered
```

Implemented now:

1. Arc chain-ID and latest-block verification.
2. Bytecode-presence checks for the reference economic contracts.
3. ERC-8004 Agent Passport reads using `ownerOf` and `tokenURI`.
4. Deterministic job policy covering budget, daily spend, provider registration, evaluator independence, evidence commitment, and allowlists.
5. Stable-hash job intents and Work Receipts.
6. Tests for network, identity, blocked jobs, approval thresholds, and receipt tampering.

Not enabled:

- private-key or seed-phrase handling by a model;
- transaction signing or broadcasting;
- production settlement;
- claims that registry identity proves capability or trust;
- claims that Arc roadmap features are live before their public deployment.

## Architecture

```text
Arc contracts and RPC
        |
        v
ArcChainClient ----> Agent Passport
        |
        v
Hallow Job Policy ----> approval / block / ready
        |
        v
Local agent execution ----> encrypted evidence bundle
        |
        v
Independent evaluator ----> Work Receipt
        |
        v
Scoped signer (future) ----> ERC-8183 settlement
```

## Trust boundaries

### The model is not a signer

Private keys must never enter model context. A later production signer must use a smart account or isolated key service with contract allowlists, per-job caps, expiry, simulation, exact approval, revocation, and an emergency stop.

### Registration is not trust

ERC-8004 makes identity and feedback portable. It does not prove that advertised capabilities work or that reviewers are independent. Hallow therefore preserves evidence provenance and treats registration, reputation, and validation as separate signals.

### An evaluator is not automatically independent

The base job standard permits a client-selected evaluator. Hallow's default policy requires the evaluator address to differ from both provider and client. Higher-value work should add multiple evaluators, deterministic checks, and an appeal path.

### Public proof excludes private work

Only commitments and public settlement fields belong onchain. Prompts, private memory, API keys, raw files, model reasoning, and confidential deliverables remain offchain.

## Reference contracts

The canonical addresses are exported from `@hallow/chain` and verified at runtime for bytecode presence. They include USDC, EURC, the three ERC-8004 registries, the Arc Agentic Commerce reference, CCTP V2, and Gateway.

Addresses are testnet references and must be re-verified against Arc documentation before every production release.

## Next engineering milestones

1. Persist Arc policies, job intents, Agent Passports, and Work Receipts under the Hallow home directory.
2. Add event indexing for agent registrations, feedback, validations, and job lifecycle transitions.
3. Add deterministic evaluator plugins for code, structured data, signed reports, and API results.
4. Add a scoped ERC-4337 signer with dry-run simulation and explicit approval.
5. Add x402 service purchasing with per-call caps and metering receipts.
6. Add CCTP/Gateway funding only after signing and reconciliation controls are audited.

## Official references

- [Arc deployment model](https://docs.arc.io/arc/concepts/deployment-model)
- [Arc system overview](https://docs.arc.io/arc/concepts/system-overview)
- [Arc Agentic Economy](https://docs.arc.io/build/agentic-economy)
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004)
- [ERC-8183](https://eips.ethereum.org/EIPS/eip-8183)
- [Arc contract addresses](https://docs.arc.io/arc/references/contract-addresses)
- [Arc account abstraction](https://docs.arc.io/arc/tools/account-abstraction)
