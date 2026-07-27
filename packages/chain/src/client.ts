import { stableHash } from "./guardian.js";
import type {
  ChainStatus,
  GuardianAssetKind,
  GuardianAssetPassport,
  GuardianEvidence,
  GuardianNetwork,
  GuardianRiskSignal,
  RobinhoodNetworkConfig,
  StockTokenAsset,
  StockTokenDeployment,
  StockTokenQuote
} from "./types.js";

export const ROBINHOOD_NETWORKS: Record<GuardianNetwork, RobinhoodNetworkConfig> = {
  mainnet: {
    name: "Robinhood Chain",
    network: "mainnet",
    chain_id: 4663,
    rpc_url: "https://rpc.mainnet.chain.robinhood.com",
    explorer_url: "https://robinhoodchain.blockscout.com",
    native_currency: "ETH"
  },
  testnet: {
    name: "Robinhood Chain Testnet",
    network: "testnet",
    chain_id: 46630,
    rpc_url: "https://rpc.testnet.chain.robinhood.com",
    explorer_url: "https://explorer.testnet.chain.robinhood.com",
    native_currency: "ETH"
  }
};

export type RobinhoodChainClientOptions = {
  network?: GuardianNetwork;
  rpc_url?: string;
  stock_api_url?: string;
  fetch?: typeof fetch;
  timeout_ms?: number;
};

export type InspectAssetOptions = {
  kind?: GuardianAssetKind | "auto";
  symbol?: string;
  now?: Date;
};

export class RobinhoodChainClient {
  readonly network: RobinhoodNetworkConfig;
  readonly stockApiUrl: string;
  readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: RobinhoodChainClientOptions = {}) {
    const selected = options.network ?? "mainnet";
    this.network = { ...ROBINHOOD_NETWORKS[selected], rpc_url: options.rpc_url ?? ROBINHOOD_NETWORKS[selected].rpc_url };
    this.stockApiUrl = (options.stock_api_url ?? "https://api.robinhood.com/rhj").replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? fetch;
    this.timeoutMs = options.timeout_ms ?? 8_000;
  }

  async status(now = new Date()): Promise<ChainStatus> {
    const started = Date.now();
    try {
      const [chainIdHex, blockHex] = await Promise.all([
        this.rpc<string>("eth_chainId", []),
        this.rpc<string>("eth_blockNumber", [])
      ]);
      const reportedChainId = parseHexNumber(chainIdHex);
      return {
        schema: "hallow.guardian_chain_status/v1",
        network: this.network,
        connected: reportedChainId === this.network.chain_id,
        reported_chain_id: reportedChainId,
        block_number: parseHexNumber(blockHex),
        latency_ms: Date.now() - started,
        error: reportedChainId === this.network.chain_id ? undefined : `Expected chain ${this.network.chain_id}, received ${reportedChainId}.`,
        checked_at: now.toISOString()
      };
    } catch (error) {
      return {
        schema: "hallow.guardian_chain_status/v1",
        network: this.network,
        connected: false,
        latency_ms: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
        checked_at: now.toISOString()
      };
    }
  }

  async inspectAsset(addressInput: string, options: InspectAssetOptions = {}): Promise<GuardianAssetPassport> {
    const address = normalizeAddress(addressInput);
    const now = options.now ?? new Date();
    const observedAt = now.toISOString();
    const evidence: GuardianEvidence[] = [];
    const signals: GuardianRiskSignal[] = [];

    const [blockHex, code, name, symbol, decimals, totalSupply, owner, assetsResult] = await Promise.all([
      this.rpc<string>("eth_blockNumber", []),
      this.rpc<string>("eth_getCode", [address, "latest"]),
      this.readString(address, "0x06fdde03"),
      this.readString(address, "0x95d89b41"),
      this.readUint(address, "0x313ce567"),
      this.readUint(address, "0x18160ddd"),
      this.readAddress(address, "0x8da5cb5b"),
      this.fetchStockTokenAssets().catch(() => [] as StockTokenAsset[])
    ]);
    const blockNumber = parseHexNumber(blockHex);
    const codeBytes = Math.max(0, (stripHex(code).length / 2));
    const codePresent = codeBytes > 0;
    evidence.push({ source: "Robinhood Chain RPC", claim: "Contract code present", value: codePresent, observed_at: observedAt });
    evidence.push({ source: "Robinhood Chain RPC", claim: "Observation block", value: blockNumber, observed_at: observedAt });

    if (!codePresent) {
      signals.push({ id: "no-code", severity: "critical", title: "No contract code", detail: "The selected address had no contract bytecode at the observed block." });
    }

    const canonicalAsset = assetsResult.find((asset) => asset.deployments.some((deployment) =>
      deployment.chain_id === this.network.chain_id && deployment.contract_address.toLowerCase() === address.toLowerCase()
    ));
    const canonicalSystemSymbol = address === USDG_ADDRESS ? "USDG" : address === WETH_ADDRESS ? "WETH" : undefined;
    const canonical = Boolean(canonicalAsset || canonicalSystemSymbol);
    if (canonicalAsset) evidence.push({ source: "Robinhood Stock Token API", claim: "Canonical Stock Token", value: canonicalAsset.symbol, observed_at: observedAt });
    if (canonicalSystemSymbol) evidence.push({ source: "Robinhood Chain canonical contracts", claim: "Canonical system contract", value: canonicalSystemSymbol, observed_at: observedAt });

    const detectedCapabilities = detectBytecodeCapabilities(code);
    if (detectedCapabilities.includes("mint")) {
      signals.push({ id: "mint-capability", severity: "high", title: "Mint capability detected", detail: "The bytecode contains a common mint function selector. Verify roles and supply controls before relying on this signal.", evidence: "bytecode selector 0x40c10f19" });
    }
    if (detectedCapabilities.includes("upgrade")) {
      signals.push({ id: "upgrade-capability", severity: "warning", title: "Upgrade capability detected", detail: "Contract logic may be upgradeable. Confirm the proxy admin and timelock." });
    }
    if (detectedCapabilities.includes("pause")) {
      signals.push({ id: "pause-capability", severity: "warning", title: "Pause capability detected", detail: "Transfers or actions may be pausable by an authorized account." });
    }
    if (owner && owner !== ZERO_ADDRESS) {
      signals.push({ id: "active-owner", severity: "warning", title: "Owner address responds", detail: "An owner address was returned. This alone does not prove what the owner can change.", evidence: owner });
    }

    let quote: StockTokenQuote | undefined;
    if (canonicalAsset?.symbol) {
      quote = await this.fetchStockTokenQuote(canonicalAsset.symbol).catch(() => undefined);
      if (quote) {
        evidence.push({ source: "Robinhood Stock Token API", claim: "Trading halt", value: quote.is_trading_halt, observed_at: observedAt });
        if (quote.is_trading_halt) signals.push({ id: "trading-halt", severity: "critical", title: "Trading halt active", detail: "The official Stock Token API reports an active halt." });
        if (quote.generated_at && Date.parse(quote.generated_at) < now.getTime() - 120_000) {
          signals.push({ id: "stale-quote", severity: "high", title: "Quote is stale", detail: "The latest official quote is older than two minutes." });
        }
      }
    }

    const kind = classifyKind(options.kind, canonicalAsset, address);
    if (options.kind === "rwa" && !canonical) {
      signals.push({ id: "noncanonical-rwa", severity: "critical", title: "RWA contract is not canonical", detail: "The address did not match the official Robinhood Stock Token deployments returned during inspection." });
    }
    if (kind === "meme" && signals.length === 0) {
      signals.push({ id: "limited-meme-evidence", severity: "warning", title: "Evidence is incomplete", detail: "Contract selectors alone cannot prove liquidity quality, holder distribution, or sellability." });
    }

    const risk = calculateRisk(signals, codePresent, kind, canonical);
    const expiresAt = new Date(now.getTime() + (canonical ? 60_000 : 300_000)).toISOString();
    const base = {
      schema: "hallow.asset_passport/v1" as const,
      address,
      chain_id: this.network.chain_id,
      network: this.network.network,
      block_number: blockNumber,
      kind,
      canonical,
      contract: {
        code_present: codePresent,
        code_bytes: codeBytes,
        name: name ?? canonicalAsset?.name,
        symbol: symbol ?? canonicalAsset?.symbol ?? options.symbol,
        decimals: decimals === undefined ? undefined : Number(decimals),
        total_supply: totalSupply?.toString(),
        owner,
        detected_capabilities: detectedCapabilities
      },
      stock_token: canonicalAsset ? {
        symbol: canonicalAsset.symbol,
        uid: canonicalAsset.uid,
        current_multiplier: canonicalAsset.current_multiplier,
        quote,
        holder_rights_notice: "Robinhood Stock Tokens provide economic exposure through a tokenized debt security and do not grant legal or beneficial ownership of the underlying security. Eligibility varies by jurisdiction."
      } : undefined,
      risk,
      summary: createPassportSummary(kind, canonical, risk.band, symbol ?? canonicalAsset?.symbol ?? options.symbol),
      evidence,
      inspected_at: observedAt,
      expires_at: expiresAt
    };
    return { ...base, id: `asset_passport_${stableHash(base).slice(2, 18)}` };
  }

  async fetchStockTokenAssets(): Promise<StockTokenAsset[]> {
    const payload = await this.getJson(`${this.stockApiUrl}/assets`);
    const entries = arrayField(payload, ["assets", "results", "tokens"]);
    return entries.map(normalizeStockTokenAsset).filter((entry): entry is StockTokenAsset => Boolean(entry));
  }

  async fetchStockTokenQuote(symbol: string): Promise<StockTokenQuote | undefined> {
    const payload = await this.getJson(`${this.stockApiUrl}/prices/${encodeURIComponent(symbol)}`);
    const entries = arrayField(payload, ["quotes", "prices", "results"]);
    const record = entries[0] ?? (isRecord(payload) ? payload : undefined);
    if (!record) return undefined;
    return {
      symbol: stringField(record, ["tokenSymbol", "symbol"]) ?? symbol,
      bid: stringField(record, ["bid"]),
      ask: stringField(record, ["ask"]),
      currency: stringField(record, ["currency"]),
      daily_trading_volume: stringField(record, ["dailyTradingVolume", "daily_trading_volume"]),
      is_trading_halt: booleanField(record, ["isTradingHalt", "is_trading_halt"]),
      generated_at: stringField(record, ["generatedAt", "generated_at"])
    };
  }

  async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const response = await this.fetchWithTimeout(this.network.rpc_url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
    });
    if (!response.ok) throw new Error(`Robinhood Chain RPC returned HTTP ${response.status}.`);
    const payload = await response.json() as { result?: T; error?: { message?: string } };
    if (payload.error) throw new Error(payload.error.message ?? `Robinhood Chain RPC ${method} failed.`);
    if (payload.result === undefined) throw new Error(`Robinhood Chain RPC ${method} returned no result.`);
    return payload.result;
  }

  private async readString(address: string, selector: string): Promise<string | undefined> {
    try { return decodeAbiString(await this.rpc<string>("eth_call", [{ to: address, data: selector }, "latest"])); } catch { return undefined; }
  }

  private async readUint(address: string, selector: string): Promise<bigint | undefined> {
    try { const result = await this.rpc<string>("eth_call", [{ to: address, data: selector }, "latest"]); return BigInt(result); } catch { return undefined; }
  }

  private async readAddress(address: string, selector: string): Promise<string | undefined> {
    try {
      const result = stripHex(await this.rpc<string>("eth_call", [{ to: address, data: selector }, "latest"]));
      if (result.length < 40) return undefined;
      return `0x${result.slice(-40)}`;
    } catch { return undefined; }
  }

  private async getJson(url: string): Promise<unknown> {
    const response = await this.fetchWithTimeout(url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Robinhood Stock Token API returned HTTP ${response.status}.`);
    return response.json();
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try { return await this.fetchImpl(url, { ...init, signal: controller.signal }); }
    finally { clearTimeout(timeout); }
  }
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const USDG_ADDRESS = "0x5fc5360d0400a0fd4f2af552add042d716f1d168";
const WETH_ADDRESS = "0x0bd7d308f8e1639fab988df18a8011f41eacad73";

function normalizeAddress(value: string): string {
  const trimmed = value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) throw new Error("Expected a 20-byte EVM contract address.");
  return trimmed.toLowerCase();
}

function parseHexNumber(value: string): number {
  const parsed = Number.parseInt(value, 16);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`Invalid hexadecimal number: ${value}`);
  return parsed;
}

function stripHex(value: string): string {
  return value.startsWith("0x") ? value.slice(2) : value;
}

function decodeAbiString(value: string): string | undefined {
  const data = stripHex(value);
  if (!data || /^0+$/.test(data)) return undefined;
  try {
    if (data.length === 64) return Buffer.from(data.replace(/00+$/, ""), "hex").toString("utf8").replace(/\0/g, "").trim() || undefined;
    const offset = Number(BigInt(`0x${data.slice(0, 64)}`));
    const lengthPosition = offset * 2;
    const length = Number(BigInt(`0x${data.slice(lengthPosition, lengthPosition + 64)}`));
    const start = lengthPosition + 64;
    return Buffer.from(data.slice(start, start + length * 2), "hex").toString("utf8").replace(/\0/g, "").trim() || undefined;
  } catch { return undefined; }
}

function detectBytecodeCapabilities(code: string): string[] {
  const normalized = stripHex(code).toLowerCase();
  const selectors: Record<string, string[]> = {
    mint: ["40c10f19"],
    pause: ["8456cb59", "3f4ba83a"],
    upgrade: ["3659cfe6", "4f1ef286"],
    ownership: ["8da5cb5b", "715018a6", "f2fde38b"]
  };
  return Object.entries(selectors).filter(([, values]) => values.some((selector) => normalized.includes(selector))).map(([name]) => name);
}

function classifyKind(hint: InspectAssetOptions["kind"], canonicalAsset: StockTokenAsset | undefined, address: string): GuardianAssetKind {
  if (hint && hint !== "auto") return hint;
  if (canonicalAsset) return "rwa";
  if (address === USDG_ADDRESS) return "stablecoin";
  if (address === WETH_ADDRESS) return "wrapped";
  return "token";
}

function calculateRisk(signals: GuardianRiskSignal[], codePresent: boolean, kind: GuardianAssetKind, canonical: boolean): GuardianAssetPassport["risk"] {
  let score = codePresent ? 10 : 100;
  for (const signal of signals) score += signal.severity === "critical" ? 60 : signal.severity === "high" ? 30 : signal.severity === "warning" ? 12 : 2;
  if (kind === "rwa" && canonical) score = Math.max(5, score - 8);
  score = Math.min(100, Math.round(score));
  const band = !codePresent ? "critical" : score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "elevated" : "low-signals";
  return {
    score,
    band,
    signals,
    label: band === "low-signals" ? "No major signal detected in this bounded inspection" : `${band} risk signals detected`
  };
}

function createPassportSummary(kind: GuardianAssetKind, canonical: boolean, band: string, symbol?: string): string {
  const name = symbol || "This contract";
  if (kind === "rwa" && canonical) return `${name} matches the official Robinhood Stock Token registry. Hallow found a ${band} signal band; review legal rights, quote freshness, and eligibility before any action.`;
  if (kind === "meme") return `${name} was inspected as a memecoin. Hallow found a ${band} signal band, but contract inspection cannot prove liquidity, holder behavior, or future sellability.`;
  return `${name} was inspected on Robinhood Chain with a ${band} signal band. This passport records bounded evidence, not a promise of safety.`;
}

function normalizeStockTokenAsset(value: Record<string, unknown>): StockTokenAsset | undefined {
  const symbol = stringField(value, ["tokenSymbol", "symbol", "ticker"]);
  if (!symbol) return undefined;
  const deploymentsRaw = arrayField(value, ["deployments", "contracts"]);
  const deployments = deploymentsRaw.map((entry): StockTokenDeployment | undefined => {
    const contract = stringField(entry, ["contractAddress", "contract_address", "address"]);
    const chain = numberField(entry, ["chainId", "chain_id"]);
    return contract && chain !== undefined && /^0x[a-fA-F0-9]{40}$/.test(contract)
      ? { chain_id: chain, contract_address: contract.toLowerCase() }
      : undefined;
  }).filter((entry): entry is StockTokenDeployment => Boolean(entry));
  return {
    uid: stringField(value, ["id", "uid"]),
    symbol,
    name: stringField(value, ["name", "displayName", "display_name"]),
    current_multiplier: stringField(value, ["currentMultiplier", "current_multiplier"]),
    deployments
  };
}

function arrayField(value: unknown, keys: string[]): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];
  for (const key of keys) if (Array.isArray(value[key])) return (value[key] as unknown[]).filter(isRecord);
  return [];
}

function stringField(value: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) if (typeof value[key] === "string" && (value[key] as string).trim()) return (value[key] as string).trim();
  return undefined;
}

function numberField(value: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === "string" && candidate.trim() && Number.isFinite(Number(candidate))) return Number(candidate);
  }
  return undefined;
}

function booleanField(value: Record<string, unknown>, keys: string[]): boolean {
  for (const key of keys) if (typeof value[key] === "boolean") return value[key] as boolean;
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
