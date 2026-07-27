export type GuardianNetwork = "mainnet" | "testnet";

export type GuardianAssetKind = "rwa" | "meme" | "stablecoin" | "wrapped" | "token" | "unknown";

export type GuardianRiskBand = "low-signals" | "elevated" | "high" | "critical" | "unknown";

export type RobinhoodNetworkConfig = {
  name: string;
  network: GuardianNetwork;
  chain_id: number;
  rpc_url: string;
  explorer_url: string;
  native_currency: "ETH";
};

export type ChainStatus = {
  schema: "hallow.guardian_chain_status/v1";
  network: RobinhoodNetworkConfig;
  connected: boolean;
  reported_chain_id?: number;
  block_number?: number;
  latency_ms?: number;
  error?: string;
  checked_at: string;
};

export type GuardianEvidence = {
  source: string;
  claim: string;
  value: string | number | boolean;
  observed_at: string;
};

export type GuardianRiskSignal = {
  id: string;
  severity: "info" | "warning" | "high" | "critical";
  title: string;
  detail: string;
  evidence?: string;
};

export type StockTokenDeployment = {
  chain_id: number;
  contract_address: string;
};

export type StockTokenAsset = {
  uid?: string;
  symbol: string;
  name?: string;
  current_multiplier?: string;
  deployments: StockTokenDeployment[];
};

export type StockTokenQuote = {
  symbol: string;
  bid?: string;
  ask?: string;
  currency?: string;
  daily_trading_volume?: string;
  is_trading_halt: boolean;
  generated_at?: string;
};

export type GuardianAssetPassport = {
  schema: "hallow.asset_passport/v1";
  id: string;
  address: string;
  chain_id: number;
  network: GuardianNetwork;
  block_number?: number;
  kind: GuardianAssetKind;
  canonical: boolean;
  contract: {
    code_present: boolean;
    code_bytes: number;
    name?: string;
    symbol?: string;
    decimals?: number;
    total_supply?: string;
    owner?: string;
    detected_capabilities: string[];
  };
  stock_token?: {
    symbol: string;
    uid?: string;
    current_multiplier?: string;
    quote?: StockTokenQuote;
    holder_rights_notice: string;
  };
  risk: {
    score: number;
    band: GuardianRiskBand;
    signals: GuardianRiskSignal[];
    label: string;
  };
  summary: string;
  evidence: GuardianEvidence[];
  inspected_at: string;
  expires_at: string;
};

export type GuardianPolicy = {
  schema: "hallow.guardian_policy/v1";
  version: number;
  name: string;
  max_transaction_usd: number;
  max_daily_usd: number;
  max_memecoin_allocation_percent: number;
  min_reserve_percent: number;
  max_slippage_bps: number;
  require_canonical_rwa: boolean;
  block_on_trading_halt: boolean;
  block_on_stale_quote: boolean;
  block_high_risk_assets: boolean;
  require_human_approval: boolean;
  allowed_protocols: string[];
  allowed_contracts: string[];
  updated_at: string;
};

export type GuardianAction = "buy" | "sell" | "swap" | "lend" | "withdraw" | "inspect";

export type GuardianPlanInput = {
  action: GuardianAction;
  asset: GuardianAssetPassport;
  amount_usd: number;
  slippage_bps?: number;
  protocol?: string;
  projected_memecoin_allocation_percent?: number;
  projected_reserve_percent?: number;
  daily_spend_before_usd?: number;
  wallet_address?: string;
  transaction?: {
    to: string;
    data?: string;
    value_wei?: string;
  };
};

export type GuardianPolicyCheck = {
  id: string;
  label: string;
  status: "pass" | "block" | "approval";
  detail: string;
};

export type GuardianPlan = {
  schema: "hallow.guardian_plan/v1";
  id: string;
  action: GuardianAction;
  asset_passport_id: string;
  asset_address: string;
  asset_symbol?: string;
  asset_kind: GuardianAssetKind;
  amount_usd: number;
  slippage_bps: number;
  protocol?: string;
  wallet_address?: string;
  transaction?: GuardianPlanInput["transaction"];
  policy_name: string;
  policy_hash: string;
  checks: GuardianPolicyCheck[];
  state: "blocked" | "approval_required" | "ready";
  simulation: {
    status: "blocked" | "passed";
    effects: string[];
    warnings: string[];
    funds_moved: false;
  };
  human_summary: string;
  created_at: string;
};

export type GuardianReceipt = {
  schema: "hallow.guardian_receipt/v1";
  id: string;
  plan_id: string;
  plan_hash: string;
  passport_hash: string;
  policy_hash: string;
  approval_id?: string;
  approval_status: "not_required" | "pending" | "approved" | "denied";
  execution_status: "blocked" | "approved_dry_run" | "broadcast" | "confirmed";
  transaction_hash?: string;
  block_number?: number;
  privacy: {
    prompt_stored_onchain: false;
    private_memory_stored_onchain: false;
    public_fields: string[];
  };
  verification_hash: string;
  created_at: string;
};
