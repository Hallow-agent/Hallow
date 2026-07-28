export type ArcNetwork = "testnet";

export type ArcNetworkConfig = {
  name: string;
  network: ArcNetwork;
  chain_id: number;
  rpc_url: string;
  websocket_url: string;
  explorer_url: string;
  native_currency: "USDC";
};

export type ArcContractKey =
  | "usdc"
  | "eurc"
  | "identity_registry"
  | "reputation_registry"
  | "validation_registry"
  | "agentic_commerce"
  | "cctp_token_messenger"
  | "cctp_message_transmitter"
  | "gateway_wallet"
  | "gateway_minter";

export type ArcContractReference = {
  key: ArcContractKey;
  name: string;
  address: string;
  purpose: string;
  standard?: string;
};

export type ArcContractHealth = ArcContractReference & {
  code_present: boolean;
  code_bytes: number;
};

export type ArcStatus = {
  schema: "hallow.arc_status/v1";
  network: ArcNetworkConfig;
  connected: boolean;
  reported_chain_id?: number;
  block_number?: number;
  latency_ms: number;
  contracts: ArcContractHealth[];
  warnings: string[];
  error?: string;
  checked_at: string;
};

export type ArcAgentPassport = {
  schema: "hallow.arc_agent_passport/v1";
  id: string;
  network: ArcNetwork;
  chain_id: number;
  registry: string;
  agent_id: string;
  registered: boolean;
  owner?: string;
  metadata_uri?: string;
  evidence: Array<{
    source: string;
    claim: string;
    value: string | number | boolean;
    observed_at: string;
  }>;
  limitations: string[];
  inspected_at: string;
};

export type ArcJobPolicy = {
  schema: "hallow.arc_job_policy/v1";
  version: number;
  name: string;
  max_job_usdc: number;
  max_daily_usdc: number;
  require_human_approval_above_usdc: number;
  require_registered_provider: boolean;
  require_independent_evaluator: boolean;
  require_evidence_commitment: boolean;
  allowed_providers: string[];
  allowed_evaluators: string[];
  updated_at: string;
};

export type ArcJobIntentInput = {
  provider: string;
  evaluator: string;
  client?: string;
  budget_usdc: number;
  daily_spend_before_usdc?: number;
  expires_at: string;
  description: string;
  evidence_commitment?: string;
  provider_registered?: boolean;
};

export type ArcPolicyCheck = {
  id: string;
  label: string;
  status: "pass" | "block" | "approval";
  detail: string;
};

export type ArcJobIntent = {
  schema: "hallow.arc_job_intent/v1";
  id: string;
  network: ArcNetwork;
  chain_id: number;
  contract: string;
  client?: string;
  provider: string;
  evaluator: string;
  budget_usdc: number;
  expires_at: string;
  description: string;
  description_hash: string;
  evidence_commitment?: string;
  policy_hash: string;
  checks: ArcPolicyCheck[];
  state: "blocked" | "approval_required" | "ready";
  funds_moved: false;
  created_at: string;
};

export type ArcWorkReceipt = {
  schema: "hallow.arc_work_receipt/v1";
  id: string;
  job_intent_id: string;
  job_intent_hash: string;
  agent_id?: string;
  deliverable_hash: string;
  evidence_root: string;
  evaluator?: string;
  evaluation: "pending" | "passed" | "rejected";
  settlement_tx?: string;
  public_fields: string[];
  private_content_onchain: false;
  verification_hash: string;
  created_at: string;
};
