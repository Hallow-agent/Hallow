import assert from "node:assert/strict";
import test from "node:test";
import {
  RobinhoodChainClient,
  createDefaultGuardianPolicy,
  createGuardianPlan,
  createGuardianReceipt,
  verifyGuardianReceipt
} from "../packages/chain/dist/index.js";

const CONTRACT = "0x1111111111111111111111111111111111111111";
const NOW = new Date("2026-07-27T12:00:00.000Z");

function abiString(value) {
  const bytes = Buffer.from(value, "utf8").toString("hex");
  return `0x${"20".padStart(64, "0")}${(bytes.length / 2).toString(16).padStart(64, "0")}${bytes.padEnd(Math.ceil(bytes.length / 64) * 64, "0")}`;
}

function uint(value) {
  return `0x${BigInt(value).toString(16).padStart(64, "0")}`;
}

function mockFetch(url, init = {}) {
  if (String(url).endsWith("/assets")) {
    return Promise.resolve(Response.json({ assets: [{
      id: "equity-demo",
      tokenSymbol: "DEMOx",
      name: "Demo Stock Token",
      currentMultiplier: "1",
      deployments: [{ chainId: 4663, contractAddress: CONTRACT }]
    }] }));
  }
  if (String(url).includes("/prices/")) {
    return Promise.resolve(Response.json({
      tokenSymbol: "DEMOx",
      bid: "100.00",
      ask: "100.10",
      currency: "USD",
      isTradingHalt: false,
      generatedAt: "2026-07-27T11:59:30.000Z"
    }));
  }
  if (String(url).includes("api.dexscreener.com")) {
    return Promise.resolve(Response.json([{
      chainId: "robinhood", dexId: "uniswap", pairAddress: "0x3333333333333333333333333333333333333333",
      url: "https://dex.example/pair", baseToken: { symbol: "DEMOx" }, quoteToken: { symbol: "USDG" },
      priceUsd: "100.05", liquidity: { usd: 750000 }, volume: { h24: 225000 },
      txns: { h24: { buys: 120, sells: 100 } }, priceChange: { h24: 2.5 }, marketCap: 10000000,
      fdv: 10000000, pairCreatedAt: 1_753_000_000_000
    }]));
  }
  if (String(url).endsWith("/holders")) {
    return Promise.resolve(Response.json({ items: [
      { address: { hash: "0x4444444444444444444444444444444444444444" }, value: "100000" },
      { address: { hash: "0x5555555555555555555555555555555555555555" }, value: "50000" }
    ] }));
  }
  if (String(url).includes("/api/v2/tokens/")) {
    return Promise.resolve(Response.json({ holders_count: "2500" }));
  }
  const request = JSON.parse(init.body);
  const selector = request.params?.[0]?.data;
  const results = {
    eth_chainId: "0x1237",
    eth_blockNumber: "0x2a",
    eth_getCode: "0x600040c10f198da5cb5b",
    eth_call: selector === "0x06fdde03" ? abiString("Demo Stock Token")
      : selector === "0x95d89b41" ? abiString("DEMOx")
        : selector === "0x313ce567" ? uint(18)
          : selector === "0x18160ddd" ? uint(1_000_000)
            : uint("0x2222222222222222222222222222222222222222")
  };
  return Promise.resolve(Response.json({ jsonrpc: "2.0", id: 1, result: results[request.method] }));
}

test("Robinhood connector creates a canonical, evidence-backed Asset Passport", async () => {
  const client = new RobinhoodChainClient({ fetch: mockFetch, network: "mainnet" });
  const status = await client.status(NOW);
  const passport = await client.inspectAsset(CONTRACT, { kind: "rwa", now: NOW });

  assert.equal(status.connected, true);
  assert.equal(status.reported_chain_id, 4663);
  assert.equal(passport.canonical, true);
  assert.equal(passport.contract.symbol, "DEMOx");
  assert.equal(passport.stock_token.quote.is_trading_halt, false);
  assert.ok(passport.evidence.some((entry) => entry.claim === "Canonical Stock Token"));
  assert.ok(passport.contract.detected_capabilities.includes("mint"));
});

test("official USDG system contract is recognized as canonical", async () => {
  const client = new RobinhoodChainClient({ fetch: mockFetch, network: "mainnet" });
  const passport = await client.inspectAsset("0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", { kind: "stablecoin", now: NOW });
  assert.equal(passport.canonical, true);
  assert.ok(passport.evidence.some((entry) => entry.claim === "Canonical system contract" && entry.value === "USDG"));
});

test("token intelligence combines registry, liquidity, holders, and Uniswap readiness", async () => {
  const client = new RobinhoodChainClient({ fetch: mockFetch, network: "mainnet" });
  const report = await client.inspectTokenIntelligence("DEMOx", { now: NOW });
  assert.equal(report.passport.canonical, true);
  assert.equal(report.market.deepest_liquidity_usd, 750000);
  assert.equal(report.market.volume_h24_usd, 225000);
  assert.equal(report.holders.holder_count, 2500);
  assert.equal(report.holders.largest_non_pool_percent, 10);
  assert.equal(report.uniswap.supported, true);
  assert.equal(report.uniswap.active_pairs, 1);
  assert.equal(report.attention, "review");
});

test("market brief applies the official corporate-action multiplier", async () => {
  const client = new RobinhoodChainClient({ fetch: mockFetch, network: "mainnet" });
  const brief = await client.marketBrief(5, NOW);
  assert.equal(brief.registered_assets, 1);
  assert.equal(brief.active_quotes, 1);
  assert.equal(brief.quotes[0].token_bid, 100);
  assert.equal(brief.quotes[0].spread_bps.toFixed(2), "10.00");
});

test("Guardian policy blocks oversized, high-slippage memecoin actions", async () => {
  const client = new RobinhoodChainClient({ fetch: mockFetch });
  const passport = await client.inspectAsset(CONTRACT, { kind: "meme", now: NOW });
  const policy = createDefaultGuardianPolicy(NOW);
  const plan = createGuardianPlan({
    action: "buy",
    asset: passport,
    amount_usd: 250,
    slippage_bps: 500,
    projected_memecoin_allocation_percent: 12,
    projected_reserve_percent: 4
  }, policy, NOW);

  assert.equal(plan.state, "blocked");
  assert.equal(plan.simulation.funds_moved, false);
  for (const checkId of ["transaction-limit", "slippage", "meme-cap", "reserve-floor"])
    assert.equal(plan.checks.find((entry) => entry.id === checkId)?.status, "block");
});

test("Guardian requires approval and produces a tamper-evident receipt", async () => {
  const client = new RobinhoodChainClient({ fetch: mockFetch });
  const passport = await client.inspectAsset(CONTRACT, { kind: "rwa", now: NOW });
  const plan = createGuardianPlan({ action: "buy", asset: passport, amount_usd: 50, slippage_bps: 30 }, createDefaultGuardianPolicy(NOW), NOW);
  const receipt = createGuardianReceipt(plan, passport, { approval_id: "approval_demo", approval_status: "approved" }, NOW);

  assert.equal(plan.state, "approval_required");
  assert.equal(receipt.execution_status, "approved_dry_run");
  assert.equal(verifyGuardianReceipt(receipt), true);
  assert.equal(verifyGuardianReceipt({ ...receipt, approval_status: "denied" }), false);
});
