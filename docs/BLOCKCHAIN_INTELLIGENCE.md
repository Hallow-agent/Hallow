# Hallow Blockchain Intelligence

Hallow is building a terminal-first evidence and policy layer for Robinhood Chain. The goal is not to make another chat window that can send a swap. The useful loop is:

```text
question -> live evidence -> plain-language risk -> policy-bound plan -> exact approval -> verifiable receipt
```

No wallet is required for research. Broadcasting is deliberately unavailable in the current preview.

## What works now

```bash
# Confirm the chain is reachable.
hallow guardian status

# Read a multiplier-aware pulse from the official Stock Token API.
hallow guardian brief --limit 8

# Resolve an official symbol, then join registry, market, DEX, holder, and protocol evidence.
hallow guardian analyze AAPL

# Investigate an arbitrary contract without treating its ticker as proof of identity.
hallow guardian analyze 0xCONTRACT --kind meme

# Produce a dry-run plan. Hard limits can block it; otherwise exact human approval is required.
hallow guardian plan buy AAPL --usd 50 --slippage-bps 30 --reserve-percent 20
```

`guardian analyze` uses six independent evidence lanes:

| Lane | Question answered |
|---|---|
| Robinhood registry | Is this the canonical Stock Token contract? |
| Robinhood prices and multiplier | Is the quote live, halted, stale, or affected by a corporate action? |
| Robinhood Chain RPC | Is code present on chain? |
| DEX market observation | Is public liquidity visible, how deep is it, and what activity is observed? |
| Open Blockscout data | How many holders are reported and how concentrated is the observable supply? |
| Official Uniswap deployment | Are the documented v4 contracts actually present on chain? |

The deterministic report remains useful without an AI model. When an analyst model is configured, it receives only the bounded evidence object and must separate known facts, failure modes, and unknowns. It cannot turn missing evidence into a confident claim. The public product remains model-agnostic; provider selection and credentials stay private to the user's runtime.

## Why this is different

Projects such as Hermes and OpenClaw are broad personal-agent runtimes. Coinbase AgentKit and elizaOS provide broad wallet or agent integrations. Uniswap AI provides strong protocol-specific building blocks. Hallow does not claim to be more capable than all of them overall.

Hallow's domain-specific position is the combination below:

| Capability | Hallow design |
|---|---|
| Intelligence | Live evidence is captured before the model explains it. |
| Identity | An RWA ticker is accepted only after matching the official contract registry. |
| Risk | Liquidity, holder concentration, halt state, stale data, and contract signals remain visible. |
| Control | Spending, exposure, reserve, slippage, and canonical-asset rules are deterministic policy—not prompt text. |
| Consent | Approval is bound to one immutable plan hash. |
| Proof | Receipts are tamper-evident while prompts, model keys, and private memory remain offchain. |

This is the product claim Hallow can prove today: **proof before action**.

## Open-source foundation

The first-party `robinhood-intelligence` skill is informed by the MIT-licensed [Uniswap AI](https://github.com/Uniswap/uniswap-ai) separation of discovery, planning, and execution, plus the open [Blockscout](https://github.com/blockscout/blockscout) APIs. Hallow's additions are evidence binding, canonical RWA identity, deterministic portfolio policy, exact approval, local/private artifacts, and receipts.

Other useful projects studied for architecture and gap analysis:

- [NousResearch Hermes Agent](https://github.com/NousResearch/hermes-agent)
- [OpenClaw](https://github.com/openclaw/openclaw)
- [Coinbase AgentKit](https://github.com/coinbase/agentkit)
- [elizaOS](https://github.com/elizaOS/eliza)

Primary network and protocol references:

- [Robinhood Chain](https://docs.robinhood.com/chain/)
- [Robinhood Stock Token APIs](https://docs.robinhood.com/chain/stock-token-apis/)
- [Uniswap on Robinhood Chain](https://blog.uniswap.org/robinhood-chain-is-live)
- [Uniswap v4 deployments](https://developers.uniswap.org/docs/protocols/v4/deployments)
- [Uniswap AI documentation](https://developers.uniswap.org/docs/uniswap-ai/overview)

## Safety boundary

Hallow does not score future returns, predict memes, or call an asset safe. Public holder data cannot identify common ownership. Pool depth can disappear. A canonical Stock Token is not the same as owning the underlying stock and may have eligibility or jurisdiction restrictions. Any future execution path must add wallet simulation, allowance inspection, route validation, independent contract review, and explicit user signing before it can be enabled.
