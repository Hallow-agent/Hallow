import { stableHash } from "./guardian.js";
import type {
  ChainStatus,
  GuardianDexPair,
  GuardianAssetKind,
  GuardianAssetPassport,
  GuardianEvidence,
  GuardianMarketBrief,
  GuardianNetwork,
  GuardianRiskSignal,
  GuardianTokenIntelligence,
  GuardianUniswapReadiness,
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

  async resolveStockToken(query: string): Promise<{ asset: StockTokenAsset; address: string } | undefined> {
    const normalized = query.trim().toLowerCase();
    const assets = await this.fetchStockTokenAssets();
    const asset = assets.find((entry) => entry.symbol.toLowerCase() === normalized || entry.uid?.toLowerCase() === normalized);
    const deployment = asset?.deployments.find((entry) => entry.chain_id === this.network.chain_id);
    return asset && deployment ? { asset, address: deployment.contract_address } : undefined;
  }

  async marketBrief(limit = 12, now = new Date()): Promise<GuardianMarketBrief> {
    const assets = await this.fetchStockTokenAssets();
    const selected = assets
      .filter((asset) => asset.deployments.some((deployment) => deployment.chain_id === this.network.chain_id))
      .slice(0, Math.max(1, Math.min(30, Math.round(limit))));
    const quotes = (await Promise.all(selected.map(async (asset) => {
      const deployment = asset.deployments.find((entry) => entry.chain_id === this.network.chain_id);
      if (!deployment) return undefined;
      const quote = await this.fetchStockTokenQuote(asset.symbol).catch(() => undefined);
      const bid = finiteNumber(quote?.bid);
      const ask = finiteNumber(quote?.ask);
      const multiplier = finiteNumber(asset.current_multiplier);
      const mid = bid !== undefined && ask !== undefined ? (bid + ask) / 2 : undefined;
      const generated = quote?.generated_at ? Date.parse(quote.generated_at) : Number.NaN;
      return {
        symbol: asset.symbol,
        name: asset.name,
        address: deployment.contract_address,
        raw_bid: bid,
        raw_ask: ask,
        multiplier,
        token_bid: bid !== undefined && multiplier !== undefined ? bid * multiplier : undefined,
        token_ask: ask !== undefined && multiplier !== undefined ? ask * multiplier : undefined,
        spread_bps: bid !== undefined && ask !== undefined && mid ? ((ask - bid) / mid) * 10_000 : undefined,
        trading_halt: quote?.is_trading_halt ?? false,
        stale: !Number.isFinite(generated) || generated < now.getTime() - 120_000,
        generated_at: quote?.generated_at
      };
    }))).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    const activeQuotes = quotes.filter((entry) => entry.raw_bid !== undefined && entry.raw_ask !== undefined).length;
    const halts = quotes.filter((entry) => entry.trading_halt).length;
    const stale = quotes.filter((entry) => entry.stale).length;
    return {
      schema: "hallow.market_brief/v1",
      network: this.network.network,
      registered_assets: assets.length,
      assets_checked: quotes.length,
      active_quotes: activeQuotes,
      trading_halts: halts,
      stale_quotes: stale,
      quotes,
      plain_language: [
        `${assets.length} official Stock Token records are visible; this pulse checked ${quotes.length}.`,
        `${activeQuotes} checked assets have two-sided quotes; ${halts} are halted and ${stale} have stale or incomplete timestamps.`,
        "Displayed token prices apply the official corporate-action multiplier. This is market evidence, not a recommendation."
      ],
      observed_at: now.toISOString()
    };
  }

  async inspectTokenIntelligence(
    query: string,
    options: InspectAssetOptions = {}
  ): Promise<GuardianTokenIntelligence> {
    const resolved = /^0x[a-fA-F0-9]{40}$/.test(query.trim()) ? undefined : await this.resolveStockToken(query);
    const address = resolved?.address ?? query;
    const inferredKind = resolved ? "rwa" : options.kind;
    const passport = await this.inspectAsset(address, { ...options, kind: inferredKind });
    const [pairs, tokenInfo, holders, uniswap] = await Promise.all([
      this.fetchDexPairs(passport.address).catch(() => []),
      this.fetchBlockscoutTokenInfo(passport.address).catch(() => undefined),
      this.fetchBlockscoutHolders(passport.address).catch(() => []),
      this.checkUniswapReadiness(passport.address).catch(() => createEmptyUniswapReadiness(passport.address))
    ]);
    const poolAddresses = new Set(pairs.map((pair) => pair.pair_address.toLowerCase()));
    const totalSupply = safeBigInt(passport.contract.total_supply);
    const nonPoolHolders = holders.filter((holder) => !poolAddresses.has(holder.address.toLowerCase()) && holder.address.toLowerCase() !== ZERO_ADDRESS);
    const largest = holderPercent(nonPoolHolders[0]?.value, totalSupply);
    const top10 = holderPercent(nonPoolHolders.slice(0, 10).reduce((sum, holder) => sum + safeBigInt(holder.value), 0n), totalSupply);
    const deepest = pairs[0];
    const totalLiquidity = pairs.reduce((sum, pair) => sum + pair.liquidity_usd, 0);
    const volume = pairs.reduce((sum, pair) => sum + pair.volume_h24_usd, 0);
    const buys = pairs.reduce((sum, pair) => sum + pair.buys_h24, 0);
    const sells = pairs.reduce((sum, pair) => sum + pair.sells_h24, 0);
    const warnings = createIntelligenceWarnings({ passport, deepest, totalLiquidity, largest, top10, holderCount: finiteNumber(tokenInfo?.holders_count), buys, sells });
    const unknowns = [
      "A public pool snapshot cannot prove future liquidity or whether a token will remain sellable.",
      "Holder addresses do not reveal common ownership across wallets.",
      "Social credibility, issuer promises, and legal eligibility require separate verification."
    ];
    const attention = warnings.some((warning) => /critical|no observed liquidity/i.test(warning))
      || (passport.kind !== "rwa" && warnings.some((warning) => /largest non-pool holder/i.test(warning)))
      ? "avoid-until-reviewed" as const
      : warnings.length > 0 ? "review" as const : "normal" as const;
    const base = {
      schema: "hallow.token_intelligence/v1" as const,
      passport,
      market: {
        price_usd: deepest?.price_usd,
        market_cap_usd: deepest?.market_cap_usd,
        fdv_usd: deepest?.fdv_usd,
        price_change_h24_percent: deepest?.price_change_h24_percent,
        deepest_liquidity_usd: deepest?.liquidity_usd ?? 0,
        total_observed_liquidity_usd: totalLiquidity,
        volume_h24_usd: volume,
        buys_h24: buys,
        sells_h24: sells,
        pairs
      },
      holders: {
        holder_count: finiteNumber(tokenInfo?.holders_count),
        holders_observed: holders.length,
        pool_addresses_excluded: holders.length - nonPoolHolders.length,
        largest_non_pool_percent: largest,
        top_10_non_pool_percent: top10,
        method: "Top holders from the open Blockscout API, excluding observed DEX pool and zero addresses."
      },
      uniswap: {
        ...uniswap,
        active_pairs: pairs.filter((pair) => pair.dex.toLowerCase().includes("uniswap")).length,
        deepest_pair_liquidity_usd: deepest?.liquidity_usd ?? 0,
        total_observed_liquidity_usd: totalLiquidity,
        volume_h24_usd: volume,
        quote_mode: pairs.length ? "public-market-observation" as const : "no-route-observed" as const
      },
      warnings,
      unknowns,
      attention,
      human_summary: createIntelligenceSummary(passport, deepest, warnings, largest, top10),
      observed_at: new Date().toISOString()
    };
    return { ...base, id: `token_intelligence_${stableHash(base).slice(2, 18)}` };
  }

  async fetchDexPairs(address: string): Promise<GuardianDexPair[]> {
    if (this.network.network !== "mainnet") return [];
    const payload = await this.getJson(`https://api.dexscreener.com/token-pairs/v1/robinhood/${normalizeAddress(address)}`);
    if (!Array.isArray(payload)) return [];
    return payload.filter(isRecord).map(normalizeDexPair).filter((entry): entry is GuardianDexPair => Boolean(entry))
      .sort((left, right) => right.liquidity_usd - left.liquidity_usd);
  }

  async checkUniswapReadiness(tokenAddress: string): Promise<GuardianUniswapReadiness> {
    const contracts = await Promise.all(Object.entries(UNISWAP_V4_CONTRACTS).map(async ([name, address]) => {
      const code = await this.rpc<string>("eth_getCode", [address, "latest"]).catch(() => "0x");
      return { name, address, code_present: stripHex(code).length > 0 };
    }));
    return {
      supported: this.network.network === "mainnet" && contracts.every((contract) => contract.code_present),
      active_pairs: 0,
      deepest_pair_liquidity_usd: 0,
      total_observed_liquidity_usd: 0,
      volume_h24_usd: 0,
      v4_contracts: contracts,
      trade_url: `https://app.uniswap.org/explore/tokens/robinhood/${normalizeAddress(tokenAddress)}`,
      quote_mode: "no-route-observed"
    };
  }

  private async fetchBlockscoutTokenInfo(address: string): Promise<Record<string, unknown> | undefined> {
    const payload = await this.getJson(`${this.network.explorer_url}/api/v2/tokens/${normalizeAddress(address)}`);
    return isRecord(payload) ? payload : undefined;
  }

  private async fetchBlockscoutHolders(address: string): Promise<Array<{ address: string; value: string }>> {
    const payload = await this.getJson(`${this.network.explorer_url}/api/v2/tokens/${normalizeAddress(address)}/holders`);
    return arrayField(payload, ["items"]).flatMap((entry) => {
      const holderAddress = isRecord(entry.address) ? stringField(entry.address, ["hash"]) : stringField(entry, ["address"]);
      const value = stringField(entry, ["value"]);
      return holderAddress && value ? [{ address: holderAddress, value }] : [];
    });
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
const UNISWAP_V4_CONTRACTS = {
  pool_manager: "0x8366a39cc670b4001a1121b8f6a443a643e40951",
  quoter: "0x8dc178efb8111bb0973dd9d722ebeff267c98f94",
  state_view: "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b",
  universal_router: "0x8876789976decbfcbbbe364623c63652db8c0904",
  permit2: "0x000000000022d473030f116ddee9f6b43ac78ba3"
} as const;

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
    name: stringField(value, ["tokenName", "name", "displayName", "display_name"]),
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

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function safeBigInt(value: unknown): bigint {
  try { return typeof value === "bigint" ? value : BigInt(typeof value === "string" && value.trim() ? value : "0"); }
  catch { return 0n; }
}

function holderPercent(value: unknown, totalSupply: bigint): number | undefined {
  const amount = safeBigInt(value);
  if (amount <= 0n || totalSupply <= 0n) return undefined;
  return Number((amount * 1_000_000n) / totalSupply) / 10_000;
}

function nestedRecord(value: Record<string, unknown>, key: string): Record<string, unknown> {
  return isRecord(value[key]) ? value[key] as Record<string, unknown> : {};
}

function normalizeDexPair(value: Record<string, unknown>): GuardianDexPair | undefined {
  const pairAddress = stringField(value, ["pairAddress", "pair_address"]);
  const dex = stringField(value, ["dexId", "dex_id"]);
  if (!pairAddress || !dex) return undefined;
  const base = nestedRecord(value, "baseToken");
  const quote = nestedRecord(value, "quoteToken");
  const liquidity = nestedRecord(value, "liquidity");
  const volume = nestedRecord(value, "volume");
  const change = nestedRecord(value, "priceChange");
  const txns = nestedRecord(nestedRecord(value, "txns"), "h24");
  const createdAt = finiteNumber(value.pairCreatedAt);
  return {
    dex,
    pair_address: pairAddress.toLowerCase(),
    url: stringField(value, ["url"]),
    base_symbol: stringField(base, ["symbol"]),
    quote_symbol: stringField(quote, ["symbol"]),
    price_usd: finiteNumber(value.priceUsd),
    liquidity_usd: finiteNumber(liquidity.usd) ?? 0,
    volume_h24_usd: finiteNumber(volume.h24) ?? 0,
    buys_h24: Math.max(0, Math.round(finiteNumber(txns.buys) ?? 0)),
    sells_h24: Math.max(0, Math.round(finiteNumber(txns.sells) ?? 0)),
    price_change_h24_percent: finiteNumber(change.h24),
    market_cap_usd: finiteNumber(value.marketCap),
    fdv_usd: finiteNumber(value.fdv),
    created_at: createdAt ? new Date(createdAt).toISOString() : undefined
  };
}

function createEmptyUniswapReadiness(tokenAddress: string): GuardianUniswapReadiness {
  return {
    supported: false,
    active_pairs: 0,
    deepest_pair_liquidity_usd: 0,
    total_observed_liquidity_usd: 0,
    volume_h24_usd: 0,
    v4_contracts: [],
    trade_url: `https://app.uniswap.org/explore/tokens/robinhood/${tokenAddress.toLowerCase()}`,
    quote_mode: "no-route-observed"
  };
}

function createIntelligenceWarnings(input: {
  passport: GuardianAssetPassport;
  deepest?: GuardianDexPair;
  totalLiquidity: number;
  largest?: number;
  top10?: number;
  holderCount?: number;
  buys: number;
  sells: number;
}): string[] {
  const warnings: string[] = [];
  if (!input.passport.contract.code_present) warnings.push("CRITICAL: no contract code was observed.");
  if (input.passport.kind === "rwa" && !input.passport.canonical) warnings.push("CRITICAL: this RWA address is not in the official Robinhood registry.");
  if (input.totalLiquidity <= 0) warnings.push("No observed liquidity route was found; do not assume the token can be sold.");
  else if (input.totalLiquidity < 50_000) warnings.push("CRITICAL: observed liquidity is below $50,000 and price impact may be extreme.");
  else if (input.totalLiquidity < 250_000) warnings.push("Observed liquidity is thin; small trades may move the price materially.");
  if (input.largest !== undefined && input.largest >= 20) {
    warnings.push(input.passport.kind === "rwa" && input.passport.canonical
      ? `Largest observed non-pool holder has about ${input.largest.toFixed(1)}% of supply; this may be issuer, custody, or bridge inventory and needs address-label verification.`
      : `Largest non-pool holder controls about ${input.largest.toFixed(1)}% of supply.`);
  }
  if (input.top10 !== undefined && input.top10 >= 50) {
    warnings.push(input.passport.kind === "rwa" && input.passport.canonical
      ? `Top ten observed non-pool holders have about ${input.top10.toFixed(1)}% of supply; do not interpret this as sell pressure without identifying the addresses.`
      : `Top ten observed non-pool holders control about ${input.top10.toFixed(1)}% of supply.`);
  }
  if (input.holderCount !== undefined && input.holderCount < 100) warnings.push(`Only ${input.holderCount} holder addresses are reported by the explorer.`);
  const trades = input.buys + input.sells;
  if (trades >= 20 && Math.min(input.buys, input.sells) / Math.max(input.buys, input.sells, 1) < 0.2)
    warnings.push(`24-hour order flow is highly imbalanced (${input.buys} buys / ${input.sells} sells).`);
  const change = input.deepest?.price_change_h24_percent;
  if (change !== undefined && Math.abs(change) >= 50) warnings.push(`Price changed ${change.toFixed(1)}% in 24 hours; volatility is extreme.`);
  for (const signal of input.passport.risk.signals.filter((entry) => entry.severity === "critical" || entry.severity === "high"))
    warnings.push(`${signal.severity.toUpperCase()}: ${signal.title}.`);
  return Array.from(new Set(warnings));
}

function createIntelligenceSummary(
  passport: GuardianAssetPassport,
  deepest: GuardianDexPair | undefined,
  warnings: string[],
  largest?: number,
  top10?: number
): string {
  const symbol = passport.contract.symbol ?? passport.stock_token?.symbol ?? "This token";
  const liquidity = deepest ? `$${Math.round(deepest.liquidity_usd).toLocaleString("en-US")}` : "no observed public liquidity";
  const concentration = largest === undefined
    ? "holder concentration could not be measured"
    : `the largest observed non-pool holder has about ${largest.toFixed(1)}%${top10 === undefined ? "" : ` and the top ten have ${top10.toFixed(1)}%`}`;
  return `${symbol} has ${liquidity} in its deepest observed pool; ${concentration}. Hallow found ${warnings.length} warning${warnings.length === 1 ? "" : "s"}. Review the evidence before creating any plan.`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
