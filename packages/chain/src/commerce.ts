import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { ARC_TESTNET, arcContract } from "./arc.js";
import { arcStableHash } from "./agent-economy.js";
import type {
  ArcCommerceAutopilotResult,
  ArcCommerceIntent,
  ArcCommercePolicy,
  ArcCommerceReceipt,
  ArcPaymentAuthorization,
  ArcPolicyCheck,
  ArcServiceInspection,
  ArcX402Offer
} from "./arc-types.js";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type ArcPaymentAuthorizer = {
  authorize(intent: ArcCommerceIntent): Promise<ArcPaymentAuthorization>;
};

export type ArcServiceInspectionOptions = {
  fetch?: FetchLike;
  timeout_ms?: number;
  allow_private_network?: boolean;
};

export function createDefaultArcCommercePolicy(now = new Date()): ArcCommercePolicy {
  return {
    schema: "hallow.arc_commerce_policy/v1",
    version: 1,
    name: "Bounded Machine Commerce",
    max_payment_usdc: 1,
    max_daily_usdc: 5,
    require_human_approval_above_usdc: 0.25,
    require_https: true,
    allowed_networks: [`eip155:${ARC_TESTNET.chain_id}`, "arc-testnet", "arctestnet"],
    allowed_schemes: ["exact"],
    allowed_assets: [arcContract("usdc").address.toLowerCase()],
    allowed_recipients: [],
    blocked_origins: [],
    updated_at: now.toISOString()
  };
}

export function normalizeArcCommercePolicy(
  value: Partial<ArcCommercePolicy>,
  now = new Date()
): ArcCommercePolicy {
  const fallback = createDefaultArcCommercePolicy(now);
  const maxPayment = safePolicyAmount(value.max_payment_usdc, fallback.max_payment_usdc);
  const maxDaily = safePolicyAmount(value.max_daily_usdc, fallback.max_daily_usdc);
  const approval = Math.min(
    safePolicyAmount(value.require_human_approval_above_usdc, fallback.require_human_approval_above_usdc),
    maxPayment
  );
  return {
    schema: "hallow.arc_commerce_policy/v1",
    version: Number.isInteger(value.version) && Number(value.version) > 0 ? Number(value.version) : fallback.version,
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : fallback.name,
    max_payment_usdc: maxPayment,
    max_daily_usdc: maxDaily,
    require_human_approval_above_usdc: approval,
    require_https: value.require_https !== false,
    allowed_networks: safeStringList(value.allowed_networks, fallback.allowed_networks),
    allowed_schemes: safeStringList(value.allowed_schemes, fallback.allowed_schemes),
    allowed_assets: safeStringList(value.allowed_assets, fallback.allowed_assets),
    allowed_recipients: safeStringList(value.allowed_recipients, []),
    blocked_origins: safeStringList(value.blocked_origins, []),
    updated_at: typeof value.updated_at === "string" && Number.isFinite(Date.parse(value.updated_at))
      ? value.updated_at
      : fallback.updated_at
  };
}

export async function inspectArcX402Service(
  inputUrl: string,
  options: ArcServiceInspectionOptions = {},
  now = new Date()
): Promise<ArcServiceInspection> {
  const url = normalizeServiceUrl(inputUrl, options.allow_private_network === true);
  if (options.allow_private_network !== true && !options.fetch) {
    await assertPublicDnsResolution(url.hostname);
  }
  const timeout = boundedInteger(options.timeout_ms ?? 8_000, 250, 30_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const warnings: string[] = [];
  let response: Response;
  try {
    response = await (options.fetch ?? fetch)(url, {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
      headers: {
        accept: "application/json, text/plain;q=0.8, */*;q=0.1",
        "user-agent": "Hallow-Arc-Commerce/0.3"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const base = {
      schema: "hallow.arc_service_inspection/v1" as const,
      url: url.toString(),
      origin: url.origin,
      http_status: 0,
      reachable: false,
      payment_required: false,
      offers: [] as ArcX402Offer[],
      warnings: [`Service request failed: ${message}`],
      inspected_at: now.toISOString()
    };
    return { ...base, id: `arc_service_${arcStableHash(base).slice(2, 18)}` };
  } finally {
    clearTimeout(timer);
  }

  const paymentHeader = response.headers.get("payment-required");
  let offers: ArcX402Offer[] = [];
  let resource: ArcServiceInspection["resource"];
  let headerHash: string | undefined;
  if (paymentHeader) {
    headerHash = sha256Text(paymentHeader);
    try {
      const parsed = parsePaymentRequiredHeader(paymentHeader);
      offers = parsed.offers;
      resource = parsed.resource;
      warnings.push(...parsed.warnings);
    } catch (error) {
      warnings.push(`PAYMENT-REQUIRED header rejected: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else if (response.status === 402) {
    warnings.push("Service returned HTTP 402 without a PAYMENT-REQUIRED header.");
  }
  if (response.status !== 402 && paymentHeader) {
    warnings.push(`Service supplied payment requirements with HTTP ${response.status}; expected HTTP 402.`);
  }
  if (response.status === 402 && offers.length === 0) {
    warnings.push("No valid x402 payment offer could be decoded.");
  }

  const base = {
    schema: "hallow.arc_service_inspection/v1" as const,
    url: url.toString(),
    origin: url.origin,
    http_status: response.status,
    reachable: true,
    payment_required: response.status === 402,
    resource,
    offers,
    warnings,
    header_hash: headerHash,
    inspected_at: now.toISOString()
  };
  return { ...base, id: `arc_service_${arcStableHash(base).slice(2, 18)}` };
}

export function createArcCommerceIntent(
  inspection: ArcServiceInspection,
  input: { purpose: string; daily_spend_before_usdc?: number; offer_index?: number },
  policy = createDefaultArcCommercePolicy(),
  now = new Date()
): ArcCommerceIntent {
  const purpose = input.purpose.trim();
  if (!purpose) throw new Error("Commerce purpose is required.");
  const dailyBefore = finiteNonNegative(input.daily_spend_before_usdc ?? 0, "daily_spend_before_usdc");
  const offerIndex = boundedInteger(input.offer_index ?? 0, 0, Math.max(0, inspection.offers.length - 1));
  const offer = inspection.offers[offerIndex] ?? emptyOffer();
  const origin = new URL(inspection.url).origin.toLowerCase();
  const checks: ArcPolicyCheck[] = [];

  checks.push(rule("service-reachable", "Service reachable", inspection.reachable, inspection.reachable ? `Service returned HTTP ${inspection.http_status}.` : "Service could not be reached."));
  checks.push(rule("payment-required", "x402 challenge", inspection.payment_required && inspection.offers.length > 0, inspection.payment_required ? `${inspection.offers.length} decoded payment offer(s).` : "Service did not return a valid x402 challenge."));
  checks.push(rule("https", "Encrypted transport", !policy.require_https || inspection.url.startsWith("https://"), policy.require_https ? "HTTPS is required for paid services." : "Transport policy permits non-HTTPS URLs."));
  checks.push(rule("origin-policy", "Origin policy", !policy.blocked_origins.map(normalizeOrigin).includes(origin), "Service origin checked against the blocklist."));
  checks.push(rule("scheme", "Payment scheme", policy.allowed_schemes.map(normalizeToken).includes(normalizeToken(offer.scheme)), `${offer.scheme || "missing"} checked against allowed schemes.`));
  checks.push(rule("network", "Settlement network", policy.allowed_networks.map(normalizeToken).includes(normalizeToken(offer.network)), `${offer.network || "missing"} checked against Arc Testnet policy.`));
  checks.push(rule("asset", "Payment asset", policy.allowed_assets.map(normalizeToken).includes(normalizeToken(offer.asset)), `${offer.asset || "missing"} checked against allowed USDC assets.`));
  checks.push(rule("recipient", "Recipient", isAddress(offer.pay_to), isAddress(offer.pay_to) ? "Recipient is a non-zero EVM address." : "Payment recipient is missing or invalid."));
  if (policy.allowed_recipients.length > 0) {
    checks.push(rule("recipient-allowlist", "Recipient allowlist", policy.allowed_recipients.map(normalizeToken).includes(normalizeToken(offer.pay_to)), "Recipient checked against the configured allowlist."));
  }
  checks.push(rule("payment-budget", "Per-payment budget", Number.isFinite(offer.amount_usdc) && offer.amount_usdc <= policy.max_payment_usdc, `${formatUsdc(offer.amount_usdc)} requested; limit is ${formatUsdc(policy.max_payment_usdc)}.`));
  checks.push(rule("daily-budget", "Daily budget", Number.isFinite(offer.amount_usdc) && dailyBefore + offer.amount_usdc <= policy.max_daily_usdc, `${formatUsdc(dailyBefore + offer.amount_usdc)} projected today; limit is ${formatUsdc(policy.max_daily_usdc)}.`));

  const blocked = checks.some((entry) => entry.status === "block");
  if (!blocked && offer.amount_usdc > policy.require_human_approval_above_usdc) {
    checks.push({
      id: "human-approval",
      label: "Human approval",
      status: "approval",
      detail: `A person must approve this exact payment above ${formatUsdc(policy.require_human_approval_above_usdc)}.`
    });
  }
  const state: ArcCommerceIntent["state"] = blocked ? "blocked" : checks.some((entry) => entry.status === "approval") ? "approval_required" : "ready";
  const base = {
    schema: "hallow.arc_commerce_intent/v1" as const,
    inspection_id: inspection.id,
    service_url: inspection.url,
    service_origin: origin,
    purpose,
    offer,
    daily_spend_before_usdc: dailyBefore,
    projected_daily_spend_usdc: dailyBefore + offer.amount_usdc,
    policy_hash: arcStableHash(policy),
    checks,
    state,
    funds_moved: false as const,
    created_at: now.toISOString()
  };
  return { ...base, id: `arc_payment_${arcStableHash(base).slice(2, 18)}` };
}

export async function executeArcCommerceIntent(
  intent: ArcCommerceIntent,
  input: { authorizer: ArcPaymentAuthorizer; fetch?: FetchLike; max_response_bytes?: number; timeout_ms?: number },
  now = new Date()
): Promise<ArcCommerceReceipt> {
  if (!verifyArcCommerceIntent(intent)) throw new Error("Commerce intent integrity verification failed.");
  if (intent.state !== "ready") throw new Error(`Commerce intent is ${intent.state}; execution requires ready.`);
  const serviceUrl = normalizeServiceUrl(intent.service_url, false);
  if (!input.fetch) await assertPublicDnsResolution(serviceUrl.hostname);
  const authorization = await input.authorizer.authorize(intent);
  if (!authorization.signer_id.trim()) throw new Error("Payment authorizer did not identify its isolated signer.");
  if (!authorization.payment_signature.trim()) throw new Error("Payment authorizer returned an empty payment signature.");
  const maxBytes = boundedInteger(input.max_response_bytes ?? 1_048_576, 1_024, 10_485_760);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), boundedInteger(input.timeout_ms ?? 15_000, 250, 60_000));
  let response: Response;
  let body: Uint8Array;
  try {
    response = await (input.fetch ?? fetch)(serviceUrl, {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
      headers: {
        accept: "application/json, text/plain;q=0.8, */*;q=0.1",
        "payment-signature": authorization.payment_signature,
        "user-agent": "Hallow-Arc-Commerce/0.3"
      }
    });
    const declaredBytes = Number(response.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) throw new Error(`Paid response exceeds ${maxBytes} bytes.`);
    body = await readResponseBodyLimited(response, maxBytes, controller.signal);
    if (!response.ok) throw new Error(`Paid request failed with HTTP ${response.status}.`);
  } finally {
    clearTimeout(timer);
  }

  const authorizationHash = authorization.authorization_hash && isHash(authorization.authorization_hash)
    ? authorization.authorization_hash.toLowerCase()
    : sha256Text(authorization.payment_signature);
  const base = {
    schema: "hallow.arc_commerce_receipt/v1" as const,
    intent_id: intent.id,
    intent_hash: arcStableHash(intent),
    service_url: intent.service_url,
    provider: intent.offer.pay_to,
    amount_usdc: intent.offer.amount_usdc,
    response_status: response.status,
    response_hash: `0x${createHash("sha256").update(body).digest("hex")}`,
    authorization_hash: authorizationHash,
    settlement_reference: response.headers.get("payment-response") ?? undefined,
    signer_id: authorization.signer_id,
    payment_signature_stored: false as const,
    private_content_onchain: false as const,
    created_at: now.toISOString()
  };
  const verificationHash = arcStableHash(base);
  return { ...base, id: `arc_commerce_${verificationHash.slice(2, 18)}`, verification_hash: verificationHash };
}

export function verifyArcCommerceIntent(intent: ArcCommerceIntent): boolean {
  const { id: _id, ...base } = intent;
  return intent.id === `arc_payment_${arcStableHash(base).slice(2, 18)}`;
}

export function verifyArcCommerceReceipt(receipt: ArcCommerceReceipt): boolean {
  const { id: _id, verification_hash: _verificationHash, ...base } = receipt;
  const hash = arcStableHash(base);
  return receipt.id === `arc_commerce_${hash.slice(2, 18)}` && receipt.verification_hash === hash;
}

export async function runArcCommerceAutopilot(
  url: string,
  input: {
    purpose: string;
    daily_spend_before_usdc?: number;
    offer_index?: number;
    policy?: ArcCommercePolicy;
    authorizer?: ArcPaymentAuthorizer;
    fetch?: FetchLike;
    allow_private_network?: boolean;
  },
  now = new Date()
): Promise<ArcCommerceAutopilotResult> {
  const inspection = await inspectArcX402Service(url, {
    fetch: input.fetch,
    allow_private_network: input.allow_private_network
  }, now);
  if (inspection.reachable && !inspection.payment_required) {
    return {
      schema: "hallow.arc_commerce_autopilot/v1",
      inspection,
      state: "public",
      next_action: "Service is public; no payment authorization is required.",
      completed_at: now.toISOString()
    };
  }
  const intent = createArcCommerceIntent(inspection, input, input.policy ?? createDefaultArcCommercePolicy(now), now);
  if (intent.state === "blocked") return autopilotResult(inspection, intent, "blocked", "Policy blocked this service or payment.", now);
  if (intent.state === "approval_required") return autopilotResult(inspection, intent, "approval_required", "Exact human approval is required before signing.", now);
  if (!input.authorizer) return autopilotResult(inspection, intent, "signer_required", "Attach an isolated policy-bound signer to execute this ready intent.", now);
  const receipt = await executeArcCommerceIntent(intent, { authorizer: input.authorizer, fetch: input.fetch }, now);
  return {
    schema: "hallow.arc_commerce_autopilot/v1",
    inspection,
    intent,
    receipt,
    state: "completed",
    next_action: "Reconcile settlement and evaluate service quality.",
    completed_at: now.toISOString()
  };
}

function autopilotResult(
  inspection: ArcServiceInspection,
  intent: ArcCommerceIntent,
  state: ArcCommerceAutopilotResult["state"],
  nextAction: string,
  now: Date
): ArcCommerceAutopilotResult {
  return { schema: "hallow.arc_commerce_autopilot/v1", inspection, intent, state, next_action: nextAction, completed_at: now.toISOString() };
}

function parsePaymentRequiredHeader(header: string): { offers: ArcX402Offer[]; resource?: ArcServiceInspection["resource"]; warnings: string[] } {
  if (header.length > 32_768) throw new Error("header exceeds 32 KiB");
  const decoded = decodeBase64Json(header);
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) throw new Error("header must decode to a JSON object");
  const root = decoded as Record<string, unknown>;
  const rawOffers = Array.isArray(root.accepts)
    ? root.accepts
    : root.accepted && typeof root.accepted === "object"
      ? [root.accepted]
      : Array.isArray(root.paymentRequirements)
        ? root.paymentRequirements
        : [root];
  const warnings: string[] = [];
  const offers: ArcX402Offer[] = [];
  for (const candidate of rawOffers.slice(0, 20)) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    try {
      offers.push(normalizeOffer(candidate as Record<string, unknown>));
    } catch (error) {
      warnings.push(`Ignored malformed offer: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const resourceRaw = root.resource && typeof root.resource === "object" && !Array.isArray(root.resource)
    ? root.resource as Record<string, unknown>
    : undefined;
  const resource = resourceRaw ? {
    url: textOrUndefined(resourceRaw.url),
    description: textOrUndefined(resourceRaw.description),
    mime_type: textOrUndefined(resourceRaw.mimeType ?? resourceRaw.mime_type)
  } : undefined;
  return { offers, resource, warnings };
}

function normalizeOffer(value: Record<string, unknown>): ArcX402Offer {
  const scheme = requiredText(value.scheme, "scheme");
  const network = requiredText(value.network, "network");
  const asset = requiredText(value.asset, "asset").toLowerCase();
  const payTo = requiredText(value.payTo ?? value.pay_to, "payTo").toLowerCase();
  const amountAtomic = String(value.amount ?? "").trim();
  if (!/^\d+$/.test(amountAtomic)) throw new Error("amount must be an unsigned atomic-unit integer");
  const atomic = BigInt(amountAtomic);
  const amountUsdc = atomic > BigInt(Number.MAX_SAFE_INTEGER) ? Number.POSITIVE_INFINITY : Number(atomic) / 1_000_000;
  const extra = value.extra && typeof value.extra === "object" && !Array.isArray(value.extra) ? value.extra as Record<string, unknown> : {};
  const maxTimeout = optionalPositiveInteger(value.maxTimeoutSeconds ?? value.max_timeout_seconds);
  const facilitator = textOrUndefined(value.facilitatorUrl ?? value.facilitator_url ?? extra.facilitatorUrl);
  const normalized = {
    scheme,
    network,
    asset,
    amount_atomic: amountAtomic,
    amount_usdc: amountUsdc,
    pay_to: payTo,
    max_timeout_seconds: maxTimeout,
    facilitator_url: facilitator
  };
  return { ...normalized, requirement_hash: arcStableHash(normalized) };
}

function decodeBase64Json(value: string): unknown {
  const normalized = value.trim().replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const text = Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
  return JSON.parse(text);
}

function normalizeServiceUrl(value: string, allowPrivateNetwork: boolean): URL {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error("Service URL must be an absolute http(s) URL."); }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Service URL must use http or https.");
  if (url.username || url.password) throw new Error("Credentials are not allowed in service URLs.");
  if (url.hash) url.hash = "";
  if (!allowPrivateNetwork && isPrivateHostname(url.hostname)) throw new Error("Private-network service URLs are blocked by default.");
  return url;
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::" || host === "::1" || host === "0:0:0:0:0:0:0:1" || host.endsWith(".local")) return true;
  if (host === "0.0.0.0" || /^127\./.test(host) || /^10\./.test(host) || /^169\.254\./.test(host) || /^192\.168\./.test(host)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host)) return true;
  if (/^(22[4-9]|23\d)\./.test(host)) return true;
  if (/^(fc|fd|fe8|fe9|fea|feb)/.test(host)) return true;
  if (host.startsWith("::ffff:")) return isPrivateHostname(host.slice(7));
  const match = host.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

async function assertPublicDnsResolution(hostname: string): Promise<void> {
  if (isPrivateHostname(hostname)) throw new Error("Private-network service URLs are blocked by default.");
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some((entry) => isPrivateHostname(entry.address))) {
    throw new Error("Service hostname resolves to a private or unavailable network target.");
  }
}

async function readResponseBodyLimited(response: Response, maxBytes: number, signal: AbortSignal): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await readStreamChunk(reader, signal);
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("paid response exceeded configured limit");
        throw new Error(`Paid response exceeds ${maxBytes} bytes.`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function readStreamChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal
): Promise<ReadableStreamReadResult<Uint8Array>> {
  if (signal.aborted) return Promise.reject(new DOMException("aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      void reader.cancel("paid response timed out");
      reject(new DOMException("aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    reader.read().then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

function emptyOffer(): ArcX402Offer {
  return { scheme: "", network: "", asset: "", amount_atomic: "0", amount_usdc: 0, pay_to: "", requirement_hash: arcStableHash(null) };
}

function rule(id: string, label: string, passed: boolean, detail: string): ArcPolicyCheck {
  return { id, label, status: passed ? "pass" : "block", detail };
}

function normalizeToken(value: string): string { return value.trim().toLowerCase(); }
function normalizeOrigin(value: string): string { try { return new URL(value).origin.toLowerCase(); } catch { return value.trim().toLowerCase(); } }
function isAddress(value: string): boolean { return /^0x[a-fA-F0-9]{40}$/.test(value) && !/^0x0{40}$/i.test(value); }
function isHash(value: string): boolean { return /^0x[a-fA-F0-9]{64}$/.test(value); }
function sha256Text(value: string): string { return `0x${createHash("sha256").update(value).digest("hex")}`; }
function requiredText(value: unknown, field: string): string { const result = textOrUndefined(value); if (!result) throw new Error(`${field} is required`); return result; }
function textOrUndefined(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function optionalPositiveInteger(value: unknown): number | undefined { const number = Number(value); return Number.isInteger(number) && number > 0 ? number : undefined; }
function finiteNonNegative(value: number, field: string): number { if (!Number.isFinite(value) || value < 0) throw new Error(`${field} must be a non-negative number.`); return value; }
function boundedInteger(value: number, minimum: number, maximum: number): number { if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`Value must be an integer between ${minimum} and ${maximum}.`); return value; }
function formatUsdc(value: number): string { return Number.isFinite(value) ? `${value.toLocaleString("en-US", { maximumFractionDigits: 6 })} USDC` : "invalid USDC amount"; }
function safePolicyAmount(value: unknown, fallback: number): number { const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : fallback; }
function safeStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const normalized = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return normalized.length > 0 || fallback.length === 0 ? [...new Set(normalized)] : [...fallback];
}
