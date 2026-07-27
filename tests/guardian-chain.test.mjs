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
