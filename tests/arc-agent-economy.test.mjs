import assert from "node:assert/strict";
import test from "node:test";
import {
  ARC_TESTNET,
  ARC_TESTNET_CONTRACTS,
  ArcChainClient,
  createArcJobIntent,
  createArcWorkReceipt,
  createDefaultArcJobPolicy,
  verifyArcWorkReceipt
} from "../packages/chain/dist/index.js";

const NOW = new Date("2026-07-28T08:00:00.000Z");
const PROVIDER = "0x1111111111111111111111111111111111111111";
const EVALUATOR = "0x2222222222222222222222222222222222222222";
const CLIENT = "0x3333333333333333333333333333333333333333";
const HASH_A = `0x${"ab".repeat(32)}`;
const HASH_B = `0x${"cd".repeat(32)}`;

function mockFetch(_url, options) {
  const payload = JSON.parse(options.body);
  const batch = Array.isArray(payload) ? payload : [payload];
  const results = batch.map((body) => {
  let result;
  if (body.method === "eth_chainId") result = `0x${ARC_TESTNET.chain_id.toString(16)}`;
  else if (body.method === "eth_blockNumber") result = "0x1e240";
  else if (body.method === "eth_getCode") result = "0x6001600055";
  else if (body.method === "eth_call" && body.params[0].data.startsWith("0x6352211e")) {
    result = `0x${"0".repeat(24)}${PROVIDER.slice(2)}`;
  } else if (body.method === "eth_call" && body.params[0].data.startsWith("0xc87b56dd")) {
    const text = Buffer.from("ipfs://hallow-agent-metadata", "utf8").toString("hex");
    result = `0x${"20".padStart(64, "0")}${(text.length / 2).toString(16).padStart(64, "0")}${text.padEnd(64, "0")}`;
  } else throw new Error(`Unexpected RPC method ${body.method}`);
  return { jsonrpc: "2.0", id: body.id, result };
  });
  return Promise.resolve(new Response(JSON.stringify(Array.isArray(payload) ? results : results[0]), {
    status: 200,
    headers: { "content-type": "application/json" }
  }));
}

test("Arc status verifies chain identity and deployed contract code", async () => {
  const status = await new ArcChainClient({ fetch: mockFetch }).status(NOW);
  assert.equal(status.connected, true);
  assert.equal(status.block_number, 123456);
  assert.equal(status.contracts.length, ARC_TESTNET_CONTRACTS.length);
  assert.equal(status.contracts.every((entry) => entry.code_present), true);
});

test("Arc Agent Passport binds registry evidence without treating registration as trust", async () => {
  const passport = await new ArcChainClient({ fetch: mockFetch }).inspectAgent(42, NOW);
  assert.equal(passport.registered, true);
  assert.equal(passport.owner, PROVIDER);
  assert.equal(passport.metadata_uri, "ipfs://hallow-agent-metadata");
  assert.match(passport.limitations.join(" "), /not that advertised capabilities are safe/i);
});

test("Arc job policy blocks unverified providers and colluding evaluators", () => {
  const intent = createArcJobIntent({
    provider: PROVIDER,
    evaluator: PROVIDER,
    client: CLIENT,
    budget_usdc: 20,
    expires_at: "2026-07-29T08:00:00.000Z",
    description: "Verify a public dataset",
    evidence_commitment: HASH_A,
    provider_registered: false
  }, createDefaultArcJobPolicy(NOW), NOW);
  assert.equal(intent.state, "blocked");
  assert.equal(intent.checks.some((entry) => entry.id === "registered-provider" && entry.status === "block"), true);
  assert.equal(intent.checks.some((entry) => entry.id === "independent-evaluator" && entry.status === "block"), true);
});

test("Arc job intent requires exact approval and produces a tamper-evident work receipt", () => {
  const policy = createDefaultArcJobPolicy(NOW);
  const intent = createArcJobIntent({
    provider: PROVIDER,
    evaluator: EVALUATOR,
    client: CLIENT,
    budget_usdc: 20,
    expires_at: "2026-07-29T08:00:00.000Z",
    description: "Analyze 500 public transactions and produce an evidence bundle",
    evidence_commitment: HASH_A,
    provider_registered: true
  }, policy, NOW);
  assert.equal(intent.state, "approval_required");
  assert.equal(intent.funds_moved, false);
  const receipt = createArcWorkReceipt(intent, {
    deliverable_hash: HASH_A,
    evidence_root: HASH_B,
    agent_id: "42",
    evaluator: EVALUATOR,
    evaluation: "passed"
  }, NOW);
  assert.equal(verifyArcWorkReceipt(receipt), true);
  assert.equal(verifyArcWorkReceipt({ ...receipt, evaluation: "rejected" }), false);
  assert.equal(receipt.private_content_onchain, false);
});
