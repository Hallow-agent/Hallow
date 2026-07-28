import assert from "node:assert/strict";
import test from "node:test";
import {
  createArcCommerceIntent,
  createDefaultArcCommercePolicy,
  executeArcCommerceIntent,
  inspectArcX402Service,
  runArcCommerceAutopilot,
  verifyArcCommerceIntent,
  verifyArcCommerceReceipt
} from "../packages/chain/dist/index.js";

const NOW = new Date("2026-07-28T10:00:00.000Z");
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const USDC = "0x3600000000000000000000000000000000000000";

function paymentHeader(overrides = {}) {
  return Buffer.from(JSON.stringify({
    x402Version: 1,
    accepts: [{
      scheme: "exact",
      network: "eip155:5042002",
      asset: USDC,
      amount: "50000",
      payTo: RECIPIENT,
      maxTimeoutSeconds: 3600,
      ...overrides
    }],
    resource: {
      url: "https://service.example/report",
      description: "Verified Arc intelligence report",
      mimeType: "application/json"
    }
  })).toString("base64");
}

function challengeFetch(overrides) {
  return async () => new Response(JSON.stringify({ error: "payment required" }), {
    status: 402,
    headers: {
      "content-type": "application/json",
      "payment-required": paymentHeader(overrides)
    }
  });
}

test("x402 discovery decodes an Arc USDC offer without fetching paid content", async () => {
  const inspection = await inspectArcX402Service("https://service.example/report", { fetch: challengeFetch() }, NOW);
  assert.equal(inspection.payment_required, true);
  assert.equal(inspection.offers.length, 1);
  assert.equal(inspection.offers[0].amount_usdc, 0.05);
  assert.equal(inspection.offers[0].network, "eip155:5042002");
  assert.equal(inspection.resource.description, "Verified Arc intelligence report");
});

test("commerce policy blocks the wrong network and excessive prices", async () => {
  const inspection = await inspectArcX402Service("https://service.example/report", {
    fetch: challengeFetch({ network: "eip155:1", amount: "5000000" })
  }, NOW);
  const intent = createArcCommerceIntent(inspection, { purpose: "Buy one verified report" }, createDefaultArcCommercePolicy(NOW), NOW);
  assert.equal(verifyArcCommerceIntent(intent), true);
  assert.equal(intent.state, "blocked");
  assert.equal(intent.checks.some((entry) => entry.id === "network" && entry.status === "block"), true);
  assert.equal(intent.checks.some((entry) => entry.id === "payment-budget" && entry.status === "block"), true);
});

test("commerce policy requires exact approval above the autonomous threshold", async () => {
  const inspection = await inspectArcX402Service("https://service.example/report", {
    fetch: challengeFetch({ amount: "300000" })
  }, NOW);
  const intent = createArcCommerceIntent(inspection, { purpose: "Buy a premium report" }, createDefaultArcCommercePolicy(NOW), NOW);
  assert.equal(intent.state, "approval_required");
  assert.equal(intent.checks.some((entry) => entry.id === "human-approval" && entry.status === "approval"), true);
  assert.equal(intent.funds_moved, false);
});

test("autopilot stops at the isolated signer boundary", async () => {
  const result = await runArcCommerceAutopilot("https://service.example/report", {
    purpose: "Buy a verified report",
    fetch: challengeFetch()
  }, NOW);
  assert.equal(result.state, "signer_required");
  assert.equal(result.intent.state, "ready");
  assert.match(result.next_action, /isolated policy-bound signer/i);
});

test("authorized execution stores hashes and receipts but never the payment signature", async () => {
  const inspection = await inspectArcX402Service("https://service.example/report", { fetch: challengeFetch() }, NOW);
  const intent = createArcCommerceIntent(inspection, { purpose: "Buy one verified report" }, createDefaultArcCommercePolicy(NOW), NOW);
  const requests = [];
  const paidFetch = async (_url, init) => {
    requests.push(init);
    return new Response(JSON.stringify({ result: "verified" }), {
      status: 200,
      headers: { "content-type": "application/json", "payment-response": "settlement-batch-42" }
    });
  };
  const receipt = await executeArcCommerceIntent(intent, {
    authorizer: {
      async authorize() {
        return { signer_id: "vault:test", payment_signature: "private-signature-material" };
      }
    },
    fetch: paidFetch
  }, NOW);
  assert.equal(requests[0].headers["payment-signature"], "private-signature-material");
  assert.equal(receipt.payment_signature_stored, false);
  assert.equal(JSON.stringify(receipt).includes("private-signature-material"), false);
  assert.equal(receipt.settlement_reference, "settlement-batch-42");
  assert.equal(verifyArcCommerceReceipt(receipt), true);
  assert.equal(verifyArcCommerceReceipt({ ...receipt, amount_usdc: 9 }), false);
});

test("execution rejects a payment intent modified after policy evaluation", async () => {
  const inspection = await inspectArcX402Service("https://service.example/report", { fetch: challengeFetch() }, NOW);
  const intent = createArcCommerceIntent(inspection, { purpose: "Buy one verified report" }, createDefaultArcCommercePolicy(NOW), NOW);
  const tampered = { ...intent, offer: { ...intent.offer, amount_usdc: 10 } };
  assert.equal(verifyArcCommerceIntent(tampered), false);
  await assert.rejects(
    executeArcCommerceIntent(tampered, {
      authorizer: { async authorize() { throw new Error("signer must not be called"); } },
      fetch: async () => new Response("never")
    }, NOW),
    /integrity verification failed/i
  );
});

test("service discovery blocks private network targets by default", async () => {
  await assert.rejects(
    inspectArcX402Service("http://127.0.0.1:3000/paid", { fetch: challengeFetch() }, NOW),
    /private-network/i
  );
});

test("paid execution aborts a stalled service", async () => {
  const inspection = await inspectArcX402Service("https://service.example/report", { fetch: challengeFetch() }, NOW);
  const intent = createArcCommerceIntent(inspection, { purpose: "Buy one verified report" }, createDefaultArcCommercePolicy(NOW), NOW);
  await assert.rejects(
    executeArcCommerceIntent(intent, {
      authorizer: {
        async authorize() {
          return { signer_id: "vault:test", payment_signature: "private-signature-material" };
        }
      },
      timeout_ms: 250,
      fetch: async (_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      })
    }, NOW),
    /aborted/i
  );
});

test("paid execution rejects oversized streamed responses without storing the body", async () => {
  const inspection = await inspectArcX402Service("https://service.example/report", { fetch: challengeFetch() }, NOW);
  const intent = createArcCommerceIntent(inspection, { purpose: "Buy one verified report" }, createDefaultArcCommercePolicy(NOW), NOW);
  await assert.rejects(
    executeArcCommerceIntent(intent, {
      authorizer: {
        async authorize() {
          return { signer_id: "vault:test", payment_signature: "private-signature-material" };
        }
      },
      max_response_bytes: 1024,
      fetch: async () => new Response("x".repeat(2048), { status: 200 })
    }, NOW),
    /exceeds 1024 bytes/i
  );
});

test("paid execution timeout also covers a body that stalls after headers", async () => {
  const inspection = await inspectArcX402Service("https://service.example/report", { fetch: challengeFetch() }, NOW);
  const intent = createArcCommerceIntent(inspection, { purpose: "Buy one verified report" }, createDefaultArcCommercePolicy(NOW), NOW);
  await assert.rejects(
    executeArcCommerceIntent(intent, {
      authorizer: {
        async authorize() {
          return { signer_id: "vault:test", payment_signature: "private-signature-material" };
        }
      },
      timeout_ms: 250,
      fetch: async () => new Response(new ReadableStream({ start() {} }), { status: 200 })
    }, NOW),
    /aborted/i
  );
});

test("execution rechecks the destination and blocks private-network rebinding", async () => {
  const inspection = await inspectArcX402Service("https://127.0.0.1/paid", {
    allow_private_network: true,
    fetch: challengeFetch()
  }, NOW);
  const intent = createArcCommerceIntent(inspection, { purpose: "Buy one verified report" }, createDefaultArcCommercePolicy(NOW), NOW);
  assert.equal(intent.state, "ready");
  await assert.rejects(
    executeArcCommerceIntent(intent, {
      authorizer: { async authorize() { throw new Error("signer must not be called"); } },
      fetch: async () => new Response("never")
    }, NOW),
    /private-network/i
  );
});
