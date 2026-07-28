import { createHash } from "node:crypto";
import type {
  ArcAgentPassport,
  ArcContractHealth,
  ArcContractReference,
  ArcNetworkConfig,
  ArcStatus
} from "./arc-types.js";

export const ARC_TESTNET: ArcNetworkConfig = {
  name: "Arc Testnet",
  network: "testnet",
  chain_id: 5_042_002,
  rpc_url: "https://rpc.drpc.testnet.arc.network",
  websocket_url: "wss://rpc.testnet.arc.network",
  explorer_url: "https://testnet.arcscan.app",
  native_currency: "USDC"
};

export const ARC_TESTNET_RPC_URLS = [
  "https://rpc.drpc.testnet.arc.network",
  "https://rpc.blockdaemon.testnet.arc.network",
  "https://rpc.testnet.arc.network",
  "https://rpc.quicknode.testnet.arc.network"
] as const;

export const ARC_TESTNET_CONTRACTS: readonly ArcContractReference[] = [
  { key: "usdc", name: "USDC", address: "0x3600000000000000000000000000000000000000", purpose: "Native gas and ERC-20 settlement asset" },
  { key: "eurc", name: "EURC", address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", purpose: "Euro-denominated settlement asset" },
  { key: "identity_registry", name: "Identity Registry", address: "0x8004A818BFB912233c491871b3d84c89A494BD9e", purpose: "Agent identity and metadata", standard: "ERC-8004" },
  { key: "reputation_registry", name: "Reputation Registry", address: "0x8004B663056A597Dffe9eCcC1965A193B7388713", purpose: "Public agent feedback signals", standard: "ERC-8004" },
  { key: "validation_registry", name: "Validation Registry", address: "0x8004Cb1BF31DAf7788923b405b754f57acEB4272", purpose: "Credential and validation attestations", standard: "ERC-8004" },
  { key: "agentic_commerce", name: "Agentic Commerce", address: "0x0747EEf0706327138c69792bF28Cd525089e4583", purpose: "USDC-funded agent job lifecycle", standard: "ERC-8183" },
  { key: "cctp_token_messenger", name: "CCTP Token Messenger V2", address: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA", purpose: "Canonical crosschain USDC burn and mint" },
  { key: "cctp_message_transmitter", name: "CCTP Message Transmitter V2", address: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275", purpose: "CCTP message verification and receipt" },
  { key: "gateway_wallet", name: "Gateway Wallet", address: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9", purpose: "Unified crosschain USDC balance" },
  { key: "gateway_minter", name: "Gateway Minter", address: "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B", purpose: "Gateway USDC minting" }
] as const;

export type ArcChainClientOptions = {
  rpc_url?: string;
  fetch?: typeof fetch;
  timeout_ms?: number;
};

export class ArcChainClient {
  readonly network: ArcNetworkConfig;
  readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly rpcUrls: readonly string[];

  constructor(options: ArcChainClientOptions = {}) {
    this.network = { ...ARC_TESTNET, rpc_url: options.rpc_url ?? ARC_TESTNET.rpc_url };
    this.timeoutMs = options.timeout_ms ?? 8_000;
    this.fetchImpl = options.fetch ?? fetch;
    this.rpcUrls = options.rpc_url ? [options.rpc_url] : ARC_TESTNET_RPC_URLS;
  }

  async status(now = new Date()): Promise<ArcStatus> {
    const started = Date.now();
    try {
      const [chainIdHex, blockHex] = await this.batchRpc<string>([
        { method: "eth_chainId", params: [] },
        { method: "eth_blockNumber", params: [] }
      ]);
      const reportedChainId = parseHexNumber(chainIdHex);
      const contracts = await this.contractHealth();
      const warnings = [
        "Arc is currently a public testnet; no production funds should be represented as settled here.",
        "ERC-8004 and ERC-8183 are draft standards and may change."
      ];
      return {
        schema: "hallow.arc_status/v1",
        network: this.network,
        connected: reportedChainId === this.network.chain_id,
        reported_chain_id: reportedChainId,
        block_number: parseHexNumber(blockHex),
        latency_ms: Date.now() - started,
        contracts,
        warnings,
        error: reportedChainId === this.network.chain_id
          ? undefined
          : `Expected chain ${this.network.chain_id}, received ${reportedChainId}.`,
        checked_at: now.toISOString()
      };
    } catch (error) {
      return {
        schema: "hallow.arc_status/v1",
        network: this.network,
        connected: false,
        latency_ms: Date.now() - started,
        contracts: [],
        warnings: ["Network and registry health could not be verified."],
        error: error instanceof Error ? error.message : String(error),
        checked_at: now.toISOString()
      };
    }
  }

  async contractHealth(): Promise<ArcContractHealth[]> {
    const codes = await this.batchRpc<string>(ARC_TESTNET_CONTRACTS.map((contract) => ({
      method: "eth_getCode",
      params: [contract.address, "latest"]
    })));
    return ARC_TESTNET_CONTRACTS.map((contract, index) => {
      const code = codes[index] ?? "0x";
      const codeBytes = Math.max(0, stripHex(code).length / 2);
      return { ...contract, code_present: codeBytes > 0, code_bytes: codeBytes };
    });
  }

  async inspectAgent(agentIdInput: string | number | bigint, now = new Date()): Promise<ArcAgentPassport> {
    const agentId = BigInt(agentIdInput);
    if (agentId < 0n) throw new Error("Agent ID must be zero or greater.");
    const registry = contract("identity_registry").address;
    const observedAt = now.toISOString();
    const ownerCall = `0x6352211e${encodeUint256(agentId)}`;
    const tokenUriCall = `0xc87b56dd${encodeUint256(agentId)}`;
    let owner: string | undefined;
    let metadataUri: string | undefined;
    let registered = false;
    try {
      const ownerResult = await this.rpc<string>("eth_call", [{ to: registry, data: ownerCall }, "latest"]);
      owner = decodeAddress(ownerResult);
      registered = Boolean(owner);
      const tokenUriResult = await this.rpc<string>("eth_call", [{ to: registry, data: tokenUriCall }, "latest"]);
      metadataUri = decodeAbiString(tokenUriResult) || undefined;
    } catch {
      registered = false;
    }
    const evidence = [
      { source: "Arc Testnet RPC", claim: "Identity registry", value: registry, observed_at: observedAt },
      { source: "ERC-8004 Identity Registry", claim: "Agent registered", value: registered, observed_at: observedAt }
    ];
    if (owner) evidence.push({ source: "ERC-8004 Identity Registry", claim: "Agent owner", value: owner, observed_at: observedAt });
    if (metadataUri) evidence.push({ source: "ERC-8004 Identity Registry", claim: "Metadata URI", value: metadataUri, observed_at: observedAt });
    const base = {
      schema: "hallow.arc_agent_passport/v1" as const,
      network: "testnet" as const,
      chain_id: this.network.chain_id,
      registry,
      agent_id: agentId.toString(),
      registered,
      owner,
      metadata_uri: metadataUri,
      evidence,
      limitations: [
        "Registration proves control of an onchain identity, not that advertised capabilities are safe or functional.",
        "Reputation and validation signals require independent issuer and Sybil-risk evaluation."
      ],
      inspected_at: observedAt
    };
    return { ...base, id: `arc_agent_${sha256(base).slice(2, 18)}` };
  }

  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    return (await this.batchRpc<T>([{ method, params }]))[0];
  }

  private async batchRpc<T>(requests: Array<{ method: string; params: unknown[] }>): Promise<T[]> {
    if (requests.length === 0) return [];
    if (requests.length > 5) {
      const results: T[] = [];
      for (let offset = 0; offset < requests.length; offset += 5) {
        if (offset > 0) await delay(150);
        results.push(...await this.batchRpc<T>(requests.slice(offset, offset + 5)));
      }
      return results;
    }
    const body = requests.map((request, index) => ({ jsonrpc: "2.0", id: index + 1, ...request }));
    let lastError: Error | undefined;
    for (const endpoint of this.rpcUrls) {
      try {
        return await this.requestBatchFromEndpoint<T>(endpoint, body);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    throw lastError ?? new Error("No Arc RPC endpoint was available.");
  }

  private async requestBatchFromEndpoint<T>(
    endpoint: string,
    body: Array<{ jsonrpc: string; id: number; method: string; params: unknown[] }>
  ): Promise<T[]> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        if (response.status === 429 && attempt < 1) {
          const retryAfter = Number(response.headers.get("retry-after"));
          await delay(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(2_000, retryAfter * 1_000) : 300 * (attempt + 1));
          continue;
        }
        if (!response.ok) throw new Error(`Arc RPC returned HTTP ${response.status}.`);
        const value = await response.json() as Array<{ id?: number; result?: T; error?: { message?: string } }> | { id?: number; result?: T; error?: { message?: string } };
        const payload = Array.isArray(value) ? value : [value];
        if (attempt < 1 && payload.some((entry) => /limit|rate/i.test(entry.error?.message ?? ""))) {
          await delay(300 * (attempt + 1));
          continue;
        }
        const byId = new Map(payload.map((entry, index) => [entry.id ?? index + 1, entry]));
        return body.map((request) => {
          const entry = byId.get(request.id);
          if (!entry) throw new Error(`Arc RPC returned no result for request ${request.id}.`);
          if (entry.error) throw new Error(entry.error.message ?? `Arc RPC request ${request.id} failed.`);
          if (entry.result === undefined) throw new Error(`Arc RPC request ${request.id} returned no result.`);
          return entry.result;
        });
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error(`Arc RPC rate limit persisted at ${new URL(endpoint).hostname}.`);
  }
}

export function arcContract(key: ArcContractReference["key"]): ArcContractReference {
  return contract(key);
}

function contract(key: ArcContractReference["key"]): ArcContractReference {
  const value = ARC_TESTNET_CONTRACTS.find((entry) => entry.key === key);
  if (!value) throw new Error(`Unknown Arc contract: ${key}`);
  return value;
}

function sha256(value: unknown): string {
  return `0x${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function encodeUint256(value: bigint): string {
  return value.toString(16).padStart(64, "0");
}

function decodeAddress(value: string): string | undefined {
  const hex = stripHex(value);
  if (hex.length < 40) return undefined;
  const address = `0x${hex.slice(-40)}`;
  return /^0x0{40}$/i.test(address) ? undefined : address.toLowerCase();
}

function decodeAbiString(value: string): string | undefined {
  const hex = stripHex(value);
  if (hex.length < 128) return undefined;
  const offset = Number.parseInt(hex.slice(0, 64), 16) * 2;
  if (!Number.isSafeInteger(offset) || offset + 64 > hex.length) return undefined;
  const length = Number.parseInt(hex.slice(offset, offset + 64), 16);
  if (!Number.isSafeInteger(length) || length < 0) return undefined;
  const data = hex.slice(offset + 64, offset + 64 + length * 2);
  if (data.length !== length * 2) return undefined;
  try { return new TextDecoder().decode(Uint8Array.from(data.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16))); }
  catch { return undefined; }
}

function parseHexNumber(value: string): number {
  const parsed = Number.parseInt(value, 16);
  if (!Number.isSafeInteger(parsed)) throw new Error(`Invalid RPC number: ${value}`);
  return parsed;
}

function stripHex(value: string): string {
  return value.startsWith("0x") ? value.slice(2) : value;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
