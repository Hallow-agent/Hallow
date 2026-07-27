import { createHash } from "node:crypto";
import type {
  GuardianAssetPassport,
  GuardianPlan,
  GuardianPlanInput,
  GuardianPolicy,
  GuardianPolicyCheck,
  GuardianReceipt
} from "./types.js";

export function stableHash(value: unknown): string {
  return `0x${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function createDefaultGuardianPolicy(now = new Date()): GuardianPolicy {
  return {
    schema: "hallow.guardian_policy/v1",
    version: 1,
    name: "Proof Before Action",
    max_transaction_usd: 100,
    max_daily_usd: 250,
    max_memecoin_allocation_percent: 2,
    min_reserve_percent: 10,
    max_slippage_bps: 100,
    require_canonical_rwa: true,
    block_on_trading_halt: true,
    block_on_stale_quote: true,
    block_high_risk_assets: true,
    require_human_approval: true,
    allowed_protocols: [],
    allowed_contracts: [],
    updated_at: now.toISOString()
  };
}

export function normalizeGuardianPolicy(value: Partial<GuardianPolicy> | undefined, now = new Date()): GuardianPolicy {
  const fallback = createDefaultGuardianPolicy(now);
  if (!value) return fallback;
  return {
    ...fallback,
    ...value,
    schema: "hallow.guardian_policy/v1",
    version: positiveInteger(value.version, fallback.version),
    max_transaction_usd: nonNegativeNumber(value.max_transaction_usd, fallback.max_transaction_usd),
    max_daily_usd: nonNegativeNumber(value.max_daily_usd, fallback.max_daily_usd),
    max_memecoin_allocation_percent: boundedNumber(value.max_memecoin_allocation_percent, fallback.max_memecoin_allocation_percent, 0, 100),
    min_reserve_percent: boundedNumber(value.min_reserve_percent, fallback.min_reserve_percent, 0, 100),
    max_slippage_bps: boundedNumber(value.max_slippage_bps, fallback.max_slippage_bps, 0, 10_000),
    allowed_protocols: stringArray(value.allowed_protocols),
    allowed_contracts: stringArray(value.allowed_contracts).map((entry) => entry.toLowerCase()),
    updated_at: typeof value.updated_at === "string" ? value.updated_at : now.toISOString()
  };
}

export function createGuardianPlan(input: GuardianPlanInput, policyInput?: Partial<GuardianPolicy>, now = new Date()): GuardianPlan {
  const policy = normalizeGuardianPolicy(policyInput, now);
  const amount = nonNegativeNumber(input.amount_usd, 0);
  const slippage = boundedNumber(input.slippage_bps, 50, 0, 10_000);
  const checks: GuardianPolicyCheck[] = [];

  checks.push(check(
    "transaction-limit",
    "Transaction limit",
    amount <= policy.max_transaction_usd,
    `$${formatAmount(amount)} requested; policy allows up to $${formatAmount(policy.max_transaction_usd)}.`
  ));

  const dailyBefore = nonNegativeNumber(input.daily_spend_before_usd, 0);
  checks.push(check(
    "daily-limit",
    "Daily spending limit",
    dailyBefore + amount <= policy.max_daily_usd,
    `$${formatAmount(dailyBefore + amount)} projected today; policy allows $${formatAmount(policy.max_daily_usd)}.`
  ));

  checks.push(check(
    "slippage",
    "Maximum slippage",
    slippage <= policy.max_slippage_bps,
    `${slippage} bps requested; policy allows ${policy.max_slippage_bps} bps.`
  ));

  if (input.asset.kind === "meme") {
    const projected = boundedNumber(input.projected_memecoin_allocation_percent, policy.max_memecoin_allocation_percent, 0, 100);
    checks.push(check(
      "meme-cap",
      "Memecoin exposure cap",
      projected <= policy.max_memecoin_allocation_percent,
      `${formatAmount(projected)}% projected; policy allows ${formatAmount(policy.max_memecoin_allocation_percent)}%.`
    ));
  }

  if (input.projected_reserve_percent !== undefined) {
    const reserve = boundedNumber(input.projected_reserve_percent, 0, 0, 100);
    checks.push(check(
      "reserve-floor",
      "Reserve floor",
      reserve >= policy.min_reserve_percent,
      `${formatAmount(reserve)}% projected reserve; policy requires ${formatAmount(policy.min_reserve_percent)}%.`
    ));
  }

  if (input.asset.kind === "rwa" && policy.require_canonical_rwa) {
    checks.push(check(
      "canonical-rwa",
      "Canonical RWA contract",
      input.asset.canonical,
      input.asset.canonical ? "Contract matches the Robinhood Stock Token registry." : "Contract does not match the canonical registry."
    ));
  }

  if (policy.block_on_trading_halt && input.asset.stock_token?.quote?.is_trading_halt) {
    checks.push({ id: "trading-halt", label: "Trading halt", status: "block", detail: "The official Stock Token API reports an active trading halt." });
  } else if (input.asset.stock_token) {
    checks.push({ id: "trading-halt", label: "Trading halt", status: "pass", detail: "No active trading halt was reported." });
  }

  const quoteGeneratedAt = input.asset.stock_token?.quote?.generated_at;
  if (policy.block_on_stale_quote && quoteGeneratedAt) {
    const quoteAge = Math.max(0, now.getTime() - Date.parse(quoteGeneratedAt));
    checks.push(check(
      "quote-freshness",
      "Quote freshness",
      Number.isFinite(quoteAge) && quoteAge <= 120_000,
      Number.isFinite(quoteAge) ? `Official quote age is ${Math.round(quoteAge / 1000)} seconds.` : "Quote timestamp could not be parsed."
    ));
  }

  if (policy.block_high_risk_assets) {
    const highRisk = input.asset.risk.band === "critical" || input.asset.risk.band === "high";
    checks.push(check(
      "risk-band",
      "Asset risk signals",
      !highRisk,
      `Passport risk band is ${input.asset.risk.band}; this is evidence, not a promise of safety.`
    ));
  }

  if (input.protocol && policy.allowed_protocols.length > 0) {
    checks.push(check(
      "protocol-allowlist",
      "Protocol allowlist",
      policy.allowed_protocols.map((entry) => entry.toLowerCase()).includes(input.protocol.toLowerCase()),
      `${input.protocol} ${policy.allowed_protocols.includes(input.protocol) ? "is" : "is not"} in the configured allowlist.`
    ));
  }

  if (input.transaction?.to && policy.allowed_contracts.length > 0) {
    checks.push(check(
      "contract-allowlist",
      "Contract allowlist",
      policy.allowed_contracts.includes(input.transaction.to.toLowerCase()),
      `${input.transaction.to} was checked against the configured contract allowlist.`
    ));
  }

  const blocked = checks.some((entry) => entry.status === "block");
  if (!blocked && input.action !== "inspect" && policy.require_human_approval) {
    checks.push({
      id: "human-approval",
      label: "Human approval",
      status: "approval",
      detail: "A person must approve this exact plan before any transaction may be broadcast."
    });
  }

  const state: GuardianPlan["state"] = blocked
    ? "blocked"
    : checks.some((entry) => entry.status === "approval")
      ? "approval_required"
      : "ready";
  const createdAt = now.toISOString();
  const policyHash = stableHash(policy);
  const base = {
    schema: "hallow.guardian_plan/v1" as const,
    action: input.action,
    asset_passport_id: input.asset.id,
    asset_address: input.asset.address,
    asset_symbol: input.asset.contract.symbol ?? input.asset.stock_token?.symbol,
    asset_kind: input.asset.kind,
    amount_usd: amount,
    slippage_bps: slippage,
    protocol: input.protocol,
    wallet_address: input.wallet_address,
    transaction: input.transaction,
    policy_name: policy.name,
    policy_hash: policyHash,
    checks,
    state,
    simulation: {
      status: blocked ? "blocked" as const : "passed" as const,
      effects: createEffects(input, amount),
      warnings: createWarnings(input),
      funds_moved: false as const
    },
    human_summary: createHumanSummary(input, state, amount),
    created_at: createdAt
  };
  return { ...base, id: `guardian_plan_${stableHash(base).slice(2, 18)}` };
}

export function createGuardianReceipt(
  plan: GuardianPlan,
  passport: GuardianAssetPassport,
  input: {
    approval_id?: string;
    approval_status?: GuardianReceipt["approval_status"];
    transaction_hash?: string;
    block_number?: number;
  } = {},
  now = new Date()
): GuardianReceipt {
  const approvalStatus = input.approval_status ?? (plan.state === "approval_required" ? "pending" : "not_required");
  const executionStatus: GuardianReceipt["execution_status"] = plan.state === "blocked"
    ? "blocked"
    : input.transaction_hash && input.block_number !== undefined
      ? "confirmed"
      : input.transaction_hash
        ? "broadcast"
        : approvalStatus === "approved" || approvalStatus === "not_required"
          ? "approved_dry_run"
          : "blocked";
  const base = {
    schema: "hallow.guardian_receipt/v1" as const,
    plan_id: plan.id,
    plan_hash: stableHash(plan),
    passport_hash: stableHash(passport),
    policy_hash: plan.policy_hash,
    approval_id: input.approval_id,
    approval_status: approvalStatus,
    execution_status: executionStatus,
    transaction_hash: input.transaction_hash,
    block_number: input.block_number,
    privacy: {
      prompt_stored_onchain: false as const,
      private_memory_stored_onchain: false as const,
      public_fields: ["plan_hash", "passport_hash", "policy_hash", "approval_status", "transaction_hash"]
    },
    created_at: now.toISOString()
  };
  const verificationHash = stableHash(base);
  return { ...base, id: `guardian_receipt_${verificationHash.slice(2, 18)}`, verification_hash: verificationHash };
}

export function verifyGuardianReceipt(receipt: GuardianReceipt): boolean {
  const { id: _id, verification_hash: _verificationHash, ...base } = receipt;
  return receipt.id === `guardian_receipt_${stableHash(base).slice(2, 18)}` && receipt.verification_hash === stableHash(base);
}

function check(id: string, label: string, passed: boolean, detail: string): GuardianPolicyCheck {
  return { id, label, status: passed ? "pass" : "block", detail };
}

function createEffects(input: GuardianPlanInput, amount: number): string[] {
  if (input.action === "inspect") return ["Read chain and official registry evidence only.", "No wallet permission is requested."];
  const symbol = input.asset.contract.symbol ?? input.asset.stock_token?.symbol ?? "the selected asset";
  return [
    `${input.action.toUpperCase()} intent for approximately $${formatAmount(amount)} of ${symbol}.`,
    "Policy checks run before approval.",
    "This simulation does not move funds or sign a transaction."
  ];
}

function createWarnings(input: GuardianPlanInput): string[] {
  const warnings = ["Blockchain transactions are public and generally irreversible."];
  if (input.asset.kind === "rwa") warnings.push("Tokenized exposure may not grant legal ownership of the underlying security.");
  if (input.asset.kind === "meme") warnings.push("Memecoin liquidity and contract behavior can change without notice.");
  return warnings;
}

function createHumanSummary(input: GuardianPlanInput, state: GuardianPlan["state"], amount: number): string {
  const symbol = input.asset.contract.symbol ?? input.asset.stock_token?.symbol ?? "this asset";
  if (state === "blocked") return `Hallow blocked the ${input.action} plan for ${symbol}. One or more hard safety rules failed.`;
  if (state === "approval_required") return `Hallow simulated a $${formatAmount(amount)} ${input.action} plan for ${symbol}. No funds moved; human approval is required.`;
  return `Hallow simulated the ${input.action} plan for ${symbol}. The configured policy allows it, but no transaction has been signed.`;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, sortValue(entry)]));
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

function nonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const number = nonNegativeNumber(value, fallback);
  return Math.max(min, Math.min(max, number));
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0) : [];
}

function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
