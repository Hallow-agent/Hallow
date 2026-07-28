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

export type ArcX402Offer = {
  scheme: string;
  network: string;
  asset: string;
  amount_atomic: string;
  amount_usdc: number;
  pay_to: string;
  max_timeout_seconds?: number;
  facilitator_url?: string;
  requirement_hash: string;
};

export type ArcServiceInspection = {
  schema: "hallow.arc_service_inspection/v1";
  id: string;
  url: string;
  origin: string;
  http_status: number;
  reachable: boolean;
  payment_required: boolean;
  resource?: {
    url?: string;
    description?: string;
    mime_type?: string;
  };
  offers: ArcX402Offer[];
  warnings: string[];
  header_hash?: string;
  inspected_at: string;
};

export type ArcCommercePolicy = {
  schema: "hallow.arc_commerce_policy/v1";
  version: number;
  name: string;
  max_payment_usdc: number;
  max_daily_usdc: number;
  require_human_approval_above_usdc: number;
  require_https: boolean;
  allowed_networks: string[];
  allowed_schemes: string[];
  allowed_assets: string[];
  allowed_recipients: string[];
  blocked_origins: string[];
  updated_at: string;
};

export type ArcCommerceIntent = {
  schema: "hallow.arc_commerce_intent/v1";
  id: string;
  inspection_id: string;
  service_url: string;
  service_origin: string;
  purpose: string;
  offer: ArcX402Offer;
  daily_spend_before_usdc: number;
  projected_daily_spend_usdc: number;
  policy_hash: string;
  checks: ArcPolicyCheck[];
  state: "blocked" | "approval_required" | "ready";
  funds_moved: false;
  created_at: string;
};

export type ArcPaymentAuthorization = {
  signer_id: string;
  payment_signature: string;
  authorization_hash?: string;
};

export type ArcCommerceReceipt = {
  schema: "hallow.arc_commerce_receipt/v1";
  id: string;
  intent_id: string;
  intent_hash: string;
  service_url: string;
  provider: string;
  amount_usdc: number;
  response_status: number;
  response_hash: string;
  authorization_hash: string;
  settlement_reference?: string;
  signer_id: string;
  payment_signature_stored: false;
  private_content_onchain: false;
  verification_hash: string;
  created_at: string;
};

export type ArcCommerceAutopilotResult = {
  schema: "hallow.arc_commerce_autopilot/v1";
  inspection: ArcServiceInspection;
  intent?: ArcCommerceIntent;
  receipt?: ArcCommerceReceipt;
  state: "public" | "blocked" | "approval_required" | "signer_required" | "completed";
  next_action: string;
  completed_at: string;
};
