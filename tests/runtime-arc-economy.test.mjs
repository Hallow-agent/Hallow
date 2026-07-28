import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { HallowRuntime } from "../packages/runtime/dist/index.js";

const RECIPIENT = "0x1111111111111111111111111111111111111111";
const USDC = "0x3600000000000000000000000000000000000000";

function x402Challenge(amount = "300000") {
  const header = Buffer.from(JSON.stringify({
    x402Version: 1,
    accepts: [{
      scheme: "exact",
      network: "eip155:5042002",
      asset: USDC,
      amount,
      payTo: RECIPIENT,
      maxTimeoutSeconds: 3600
    }]
  })).toString("base64");
  return new Response("payment required", {
    status: 402,
    headers: { "payment-required": header }
  });
}

test("runtime persists x402 evidence, intent, ledger, and exact approval", async () => {
  const home = await mkdtemp(join(tmpdir(), "hallow-economy-"));
  try {
    const runtime = new HallowRuntime(home, undefined, {
      arcCommerceFetch: async () => x402Challenge()
    });
    await runtime.init();
    const initial = await runtime.getArcEconomyStatus(new Date("2026-07-28T10:00:00.000Z"));
    assert.equal(initial.services_inspected, 0);
    assert.equal(initial.execution_enabled, false);

    const record = await runtime.planArcServicePayment("https://service.example/report", {
      purpose: "Buy one independently verified report"
    });
    assert.equal(record.intent.state, "approval_required");
    assert.equal(record.intent.funds_moved, false);
    assert.equal(record.approval.action, "arc.commerce.payment");
    assert.equal(record.approval.target, record.intent.id);
    assert.match(await readFile(record.inspection_path, "utf8"), /hallow\.arc_service_inspection\/v1/);
    assert.match(await readFile(record.intent_path, "utf8"), /approval_required/);

    const status = await runtime.getArcEconomyStatus(new Date());
    assert.equal(status.services_inspected, 1);
    assert.equal(status.payment_intents, 1);
    assert.equal(status.receipts, 0);
    assert.equal(status.daily_planned_usdc, 0.3);
    assert.equal(status.pending_approvals, 1);
    const second = await runtime.planArcServicePayment("https://service.example/second-report", {
      purpose: "Reserve a second independently verified report"
    });
    assert.equal(second.intent.daily_spend_before_usdc, 0.3);
    assert.equal(second.intent.projected_daily_spend_usdc, 0.6);
    const ledger = await readFile(runtime.arcEconomyLedgerPath, "utf8");
    assert.equal(ledger.trim().split(/\r?\n/).length, 4);
    assert.equal(ledger.includes("payment-signature"), false);
    const tampered = ledger.replace('"amount_usdc":0.3', '"amount_usdc":0.1');
    await writeFile(runtime.arcEconomyLedgerPath, tampered, "utf8");
    await assert.rejects(runtime.getArcEconomyStatus(new Date()), /ledger integrity failure/i);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
