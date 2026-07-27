# Hallow Guardian

> Your agent can act. It cannot break your rules.

Guardian is Hallow's policy and proof layer for Robinhood Chain. It turns an agent's financial intent into an inspectable plan before any wallet can act.

## The flow

1. **Observe** — read contract bytecode and ERC-20 metadata from Robinhood Chain, then compare RWA addresses with Robinhood's official Stock Token registry.
2. **Explain** — create a short-lived Asset Passport containing evidence, risk signals, limitations, and the observation block.
3. **Simulate** — evaluate the exact action against hard limits. No funds move during this step.
4. **Approve** — bind human approval to the immutable plan rather than a vague chat message.
5. **Prove** — create a tamper-evident receipt. An optional non-custodial registry can anchor hashes without publishing prompts or private memory.

```text
intent -> Asset Passport -> policy checks -> dry-run plan -> human approval -> receipt
                                  |
                                  +-> any failed hard limit: blocked
```

## Commands

```bash
hallow guardian status
hallow guardian brief --limit 8
hallow guardian analyze AAPL
hallow guardian analyze 0xCONTRACT --kind meme
hallow guardian inspect 0xCONTRACT --kind rwa
hallow guardian plan buy 0xCONTRACT --usd 50 --slippage-bps 30 --reserve-percent 20
hallow guardian policy show
hallow guardian policy set --max-transaction-usd 50 --max-daily-usd 150
hallow guardian receipt guardian_plan_ID --approval approval_ID
hallow guardian verify guardian_receipt_ID
```

Append `--testnet` to chain commands to use Robinhood Chain testnet.

## Default hard limits

| Guard | Default |
|---|---:|
| Maximum per action | $100 |
| Maximum per day | $250 |
| Memecoin portfolio cap | 2% |
| Minimum reserve | 10% |
| Maximum slippage | 100 bps |
| Canonical contract required for RWA | Yes |
| Block stale quotes and trading halts | Yes |
| Human approval | Always |

The runtime also registers `guardian.execute` as a denied R4 tool. There is no broadcast implementation in this preview, so a prompt cannot bypass the policy layer and move funds.

## Chain facts used by the connector

Robinhood Chain is documented as an EVM-compatible Arbitrum Layer 2. Mainnet uses chain ID `4663`, testnet uses `46630`, and ETH is the native gas token. Robinhood also documents ERC-4337 account abstraction, batching, gas sponsorship, and session-key patterns. Guardian currently uses only read calls; those execution primitives are future integration points, not enabled claims.

For Stock Tokens, Guardian reads the official asset and price APIs. A canonical registry match is evidence of the documented deployment—not a guarantee of liquidity, future price, legal eligibility, or safety. Robinhood states that Stock Tokens provide economic exposure through tokenized debt securities and do not grant legal or beneficial ownership in the underlying security. Availability varies by jurisdiction, and token-price multipliers must be handled correctly.

Primary references:

- [Robinhood Chain overview](https://docs.robinhood.com/chain/)
- [Connect to Robinhood Chain](https://docs.robinhood.com/chain/connecting/)
- [Stock Token APIs](https://docs.robinhood.com/chain/stock-token-apis/)
- [Canonical contracts](https://docs.robinhood.com/chain/contracts/)
- [Robinhood blockchain disclosures](https://robinhood.com/blockchain)

## Receipt registry

[`contracts/HallowReceiptRegistry.sol`](../contracts/HallowReceiptRegistry.sol) stores four hashes, the recorder, and a timestamp. It never takes custody and has no administrative withdrawal, upgrade, or signing path. The TypeScript Guardian does not depend on this contract.

The contract has not been deployed. Testnet deployment, source verification, adversarial tests, and independent review are prerequisites before any mainnet consideration.

## What Guardian cannot prove

- Future price, liquidity, sellability, or honest behavior by token issuers.
- Legal eligibility, ownership rights, tax treatment, or regulatory status in a user's jurisdiction.
- That common bytecode selectors imply an exploitable permission; they are a signal for deeper review.
- Safety of an unreviewed wallet, protocol, bridge, frontend, or signing device.

Guardian is a guardrail and evidence system—not investment advice, a smart-contract audit, or a promise against loss.
