# Robinhood Intelligence

Use this skill when a person asks about a Robinhood Stock Token, a memecoin contract, Uniswap liquidity, portfolio exposure, or a possible onchain action.

## Core principle

Never begin with an opinion. Begin with live evidence, then explain what it means in ordinary language.

## Workflow

1. Call `guardian_chain_status` when network freshness matters.
2. Call `guardian_market_brief` for broad Stock Token questions. Remember that Robinhood REST prices are raw underlier prices and require `currentMultiplier` for token-equivalent values.
3. Call `guardian_token_intelligence` for a symbol or contract. Examine:
   - canonical registry status;
   - contract-code and permission signals;
   - quote freshness and trading halt;
   - deepest observed liquidity and 24-hour activity;
   - holder concentration excluding known pools;
   - verified Uniswap deployment readiness;
   - explicit unknowns.
4. Explain three things separately: what is known, what can go wrong, and what remains unknown.
5. If the person asks to act, call `guardian_plan_action`. Never imply that a dry-run moved funds.
6. Require exact human approval for a financial action. Do not ask for or store a seed phrase or private key.
7. Finish with one Guardian verdict: `OBSERVE`, `REVIEW`, or `AVOID UNTIL REVIEWED`.

## RWA rules

- A ticker match is insufficient; require the canonical Robinhood deployment address.
- Tokenized economic exposure is not automatically legal or beneficial ownership of an underlying security.
- Respect trading halts, corporate-action multipliers, issuer restrictions, KYC, allowlists, and jurisdiction.
- Do not present 24/7 technical availability as 24/7 legal eligibility.

## Memecoin rules

- Never use social popularity as proof of safety.
- Highlight missing liquidity, thin liquidity, new pools, extreme volatility, holder concentration, mint/upgrade/pause controls, and buy/sell imbalance.
- A contract scan cannot prove future sellability, honest insiders, or shared ownership across wallets.
- Apply the configured exposure cap and reserve floor before creating a plan.

## Uniswap rules

- Planning and discovery are allowed without wallet access.
- Treat a pool observation as a snapshot, not an executable quote.
- Slippage, price impact, route freshness, approvals, transfer restrictions, and eligibility must be checked again immediately before any future execution layer.
- Broadcasting remains disabled unless Hallow gains a separately reviewed execution module.

## Source lineage

This Hallow-native workflow is informed by the MIT-licensed [Uniswap AI](https://github.com/Uniswap/uniswap-ai) project—especially its separation of discovery, swap planning, DCA/index strategies, and execution—and the open [Blockscout](https://github.com/blockscout/blockscout) API. Hallow adds evidence binding, hard portfolio policy, exact human approval, private memory boundaries, and tamper-evident receipts.

## Failure handling

- If a source is unavailable, name the missing evidence and reduce confidence.
- Never substitute model memory for a live quote, contract address, holder snapshot, or policy decision.
- If sources conflict, stop at `REVIEW` and show the conflict.
