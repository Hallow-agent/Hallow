import { createHash } from "node:crypto";
import { ARC_TESTNET, arcContract } from "./arc.js";
import type { ArcJobIntent, ArcJobIntentInput, ArcJobPolicy, ArcPolicyCheck, ArcWorkReceipt } from "./arc-types.js";

export function arcStableHash(value: unknown): string {
  return `0x${createHash("sha256").update(arcStableJson(value)).digest("hex")}`;
}

function arcStableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function createDefaultArcJobPolicy(now = new Date()): ArcJobPolicy {
  return {
    schema: "hallow.arc_job_policy/v1",
    version: 1,
    name: "Prove Work Before Settlement",
    max_job_usdc: 100,
    max_daily_usdc: 250,
    require_human_approval_above_usdc: 10,
    require_registered_provider: true,
    require_independent_evaluator: true,
    require_evidence_commitment: true,
    allowed_providers: [],
    allowed_evaluators: [],
    updated_at: now.toISOString()
  };
}

export function createArcJobIntent(
  input: ArcJobIntentInput,
  policy = createDefaultArcJobPolicy(),
  now = new Date()
): ArcJobIntent {
  const provider = normalizeAddress(input.provider, "provider");
  const evaluator = normalizeAddress(input.evaluator, "evaluator");
  const client = input.client ? normalizeAddress(input.client, "client") : undefined;
  const budget = finiteNonNegative(input.budget_usdc, "budget_usdc");
  const dailyBefore = finiteNonNegative(input.daily_spend_before_usdc ?? 0, "daily_spend_before_usdc");
  const expiry = Date.parse(input.expires_at);
  if (!Number.isFinite(expiry) || expiry <= now.getTime()) throw new Error("expires_at must be a future ISO timestamp.");
  const description = input.description.trim();
  if (!description) throw new Error("Job description is required.");

  const checks: ArcPolicyCheck[] = [];
  checks.push(rule("job-budget", "Job budget", budget <= policy.max_job_usdc, `${formatUsdc(budget)} requested; policy limit is ${formatUsdc(policy.max_job_usdc)}.`));
  checks.push(rule("daily-budget", "Daily budget", dailyBefore + budget <= policy.max_daily_usdc, `${formatUsdc(dailyBefore + budget)} projected today; policy limit is ${formatUsdc(policy.max_daily_usdc)}.`));
  if (policy.require_registered_provider) {
    checks.push(rule("registered-provider", "Registered provider", input.provider_registered === true, input.provider_registered ? "Provider registration was supplied as verified evidence." : "Provider registration has not been verified."));
  }
  if (policy.require_independent_evaluator) {
    checks.push(rule("independent-evaluator", "Independent evaluator", evaluator !== provider && (!client || evaluator !== client), evaluator === provider || evaluator === client ? "Evaluator must be independent from provider and client." : "Evaluator is a distinct address."));
  }
  if (policy.require_evidence_commitment) {
    checks.push(rule("evidence-commitment", "Evidence commitment", isHash(input.evidence_commitment), isHash(input.evidence_commitment) ? "A bytes32 evidence commitment is attached." : "A bytes32 evidence commitment is required."));
  }
  if (policy.allowed_providers.length > 0) {
    checks.push(rule("provider-allowlist", "Provider allowlist", policy.allowed_providers.map((value) => value.toLowerCase()).includes(provider), "Provider checked against the configured allowlist."));
  }
  if (policy.allowed_evaluators.length > 0) {
    checks.push(rule("evaluator-allowlist", "Evaluator allowlist", policy.allowed_evaluators.map((value) => value.toLowerCase()).includes(evaluator), "Evaluator checked against the configured allowlist."));
  }
  const blocked = checks.some((entry) => entry.status === "block");
  if (!blocked && budget > policy.require_human_approval_above_usdc) {
    checks.push({ id: "human-approval", label: "Human approval", status: "approval", detail: `A person must approve this exact job above ${formatUsdc(policy.require_human_approval_above_usdc)}.` });
  }
  const state: ArcJobIntent["state"] = blocked ? "blocked" : checks.some((entry) => entry.status === "approval") ? "approval_required" : "ready";
  const base = {
    schema: "hallow.arc_job_intent/v1" as const,
    network: "testnet" as const,
    chain_id: ARC_TESTNET.chain_id,
    contract: arcContract("agentic_commerce").address,
    client,
    provider,
    evaluator,
    budget_usdc: budget,
    expires_at: new Date(expiry).toISOString(),
    description,
    description_hash: arcStableHash(description),
    evidence_commitment: input.evidence_commitment?.toLowerCase(),
    policy_hash: arcStableHash(policy),
    checks,
    state,
    funds_moved: false as const,
    created_at: now.toISOString()
  };
  return { ...base, id: `arc_job_${arcStableHash(base).slice(2, 18)}` };
}

export function createArcWorkReceipt(
  intent: ArcJobIntent,
  input: {
    deliverable_hash: string;
    evidence_root: string;
    agent_id?: string;
    evaluator?: string;
    evaluation?: ArcWorkReceipt["evaluation"];
    settlement_tx?: string;
  },
  now = new Date()
): ArcWorkReceipt {
  if (!isHash(input.deliverable_hash)) throw new Error("deliverable_hash must be bytes32.");
  if (!isHash(input.evidence_root)) throw new Error("evidence_root must be bytes32.");
  if (input.settlement_tx && !isHash(input.settlement_tx)) throw new Error("settlement_tx must be a transaction hash.");
  const base = {
    schema: "hallow.arc_work_receipt/v1" as const,
    job_intent_id: intent.id,
    job_intent_hash: arcStableHash(intent),
    agent_id: input.agent_id,
    deliverable_hash: input.deliverable_hash.toLowerCase(),
    evidence_root: input.evidence_root.toLowerCase(),
    evaluator: input.evaluator ? normalizeAddress(input.evaluator, "evaluator") : undefined,
    evaluation: input.evaluation ?? "pending",
    settlement_tx: input.settlement_tx?.toLowerCase(),
    public_fields: ["job_intent_hash", "deliverable_hash", "evidence_root", "evaluation", "settlement_tx"],
    private_content_onchain: false as const,
    created_at: now.toISOString()
  };
  const verificationHash = arcStableHash(base);
  return { ...base, id: `arc_receipt_${verificationHash.slice(2, 18)}`, verification_hash: verificationHash };
}

export function verifyArcWorkReceipt(receipt: ArcWorkReceipt): boolean {
  const { id: _id, verification_hash: _verificationHash, ...base } = receipt;
  const hash = arcStableHash(base);
  return receipt.id === `arc_receipt_${hash.slice(2, 18)}` && receipt.verification_hash === hash;
}

function rule(id: string, label: string, passed: boolean, detail: string): ArcPolicyCheck {
  return { id, label, status: passed ? "pass" : "block", detail };
}

function normalizeAddress(value: string, field: string): string {
  const address = value.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address) || /^0x0{40}$/.test(address)) throw new Error(`${field} must be a non-zero EVM address.`);
  return address;
}

function finiteNonNegative(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${field} must be a non-negative number.`);
  return value;
}

function isHash(value: string | undefined): value is string {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

function formatUsdc(value: number): string {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 6 })} USDC`;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, sortValue(entry)]));
}
