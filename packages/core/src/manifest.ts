export type AutonomyLevel = "A0" | "A1" | "A2" | "A3" | "A4" | "A5";
export type RiskLevel = "R0" | "R1" | "R2" | "R3" | "R4" | "R5";

export type ModelProviderType = "openai" | "openai_compatible" | "anthropic" | "ollama";

export type ModelProvider = {
  type: ModelProviderType;
  base_url?: string;
  api_key_env?: string;
  default_model?: string;
};

export type ModelProvidersConfig = {
  providers: Record<string, ModelProvider>;
};

export type ModelRoute = {
  primary: string;
  fallback?: string[];
};

export type ModelRoutesConfig = {
  default_route: string;
  routes: Record<string, ModelRoute>;
};

export type HallowConfig = {
  version: number;
  profile: string;
  runtime: {
    mode: "local";
    service_enabled: boolean;
    workspace: string;
    timezone: string;
    max_concurrent_tasks: number;
    default_timeout_seconds: number;
  };
  memory: {
    backend: "jsonl_markdown";
    root: string;
    auto_summarize: boolean;
    auto_link_entities: boolean;
  };
  models: {
    config: string;
    routing: string;
  };
  skills: {
    root: string;
    allow_auto_generation: boolean;
    allow_auto_update: boolean;
    min_successful_runs_before_skill: number;
  };
  tools: {
    registry: string;
    mcp_config: string;
  };
  security: {
    policy_root: string;
    audit_log: string;
    redact_secrets: boolean;
    require_approval_for_dangerous_actions: boolean;
  };
  gateway: {
    local_console: {
      enabled: boolean;
      host: string;
      port: number;
    };
  };
};

export type AgentManifest = {
  schema: "hallow.agent/v1";
  id: string;
  name: string;
  description: string;
  personality: {
    soul: string;
    tone: string;
    autonomy_style: "cautious" | "balanced" | "bold";
  };
  model_policy: {
    planning: string;
    execution: string;
    summarization: string;
    reflection: string;
  };
  memory: {
    scope: "agent" | "global";
    read: string[];
    write: string[];
    auto_update: boolean;
  };
  skills: {
    enabled: string[];
    allow_auto_skill_creation: boolean;
    allow_auto_skill_update: boolean;
  };
  tools: Record<string, { enabled: boolean; approval?: "auto" | "ask" | "deny" }>;
  autonomy: {
    level: AutonomyLevel;
    schedule_enabled: boolean;
    max_background_tasks_per_day: number;
    can_start_tasks_without_user: boolean;
    can_message_user: boolean;
    can_message_external_people: boolean;
  };
  learning: {
    enabled: boolean;
    reflect_after_task: boolean;
    extract_reusable_workflows: boolean;
    min_quality_score_for_memory: number;
    min_quality_score_for_skill_update: number;
    require_eval_before_activation: boolean;
  };
  safety: {
    approval_required: string[];
    deny: string[];
  };
};

export type SkillManifest = {
  schema: "hallow.skill/v1";
  id: string;
  name: string;
  version: string;
  author: string;
  license: string;
  entry: string;
  required_tools: string[];
  permissions: {
    internet: boolean;
    filesystem_write: "none" | "scoped" | "broad";
    external_send: boolean;
    terminal: boolean;
  };
  models: {
    recommended: Record<string, string>;
  };
  promotion: {
    min_quality_score: number;
    min_successful_runs: number;
  };
};

export type TaskTrace = {
  schema: "hallow.trace/v1";
  id: string;
  agent_id: string;
  task: string;
  trigger: "manual" | "schedule" | "event" | "gateway";
  started_at: string;
  ended_at: string;
  status: "success" | "failed" | "simulated";
  quality_score: number;
  models: Record<string, string>;
  tools: string[];
  artifacts: string[];
  reflection: {
    reusable_workflow: boolean;
    suggested_skill_update?: string;
    summary: string;
  };
};

export function createDefaultConfig(home: string): HallowConfig {
  return {
    version: 1,
    profile: "default",
    runtime: {
      mode: "local",
      service_enabled: true,
      workspace: `${home}/workspace`,
      timezone: "Asia/Jakarta",
      max_concurrent_tasks: 3,
      default_timeout_seconds: 300
    },
    memory: {
      backend: "jsonl_markdown",
      root: `${home}/memory`,
      auto_summarize: true,
      auto_link_entities: true
    },
    models: {
      config: `${home}/models/providers.yaml`,
      routing: `${home}/models/routing.yaml`
    },
    skills: {
      root: `${home}/skills`,
      allow_auto_generation: true,
      allow_auto_update: true,
      min_successful_runs_before_skill: 3
    },
    tools: {
      registry: `${home}/tools/registry.yaml`,
      mcp_config: `${home}/tools/mcp.json`
    },
    security: {
      policy_root: `${home}/policies`,
      audit_log: `${home}/logs/audit.log`,
      redact_secrets: true,
      require_approval_for_dangerous_actions: true
    },
    gateway: {
      local_console: {
        enabled: true,
        host: "127.0.0.1",
        port: 4767
      }
    }
  };
}

export function createDefaultAgentManifest(id: string, name = titleize(id)): AgentManifest {
  return {
    schema: "hallow.agent/v1",
    id,
    name,
    description: `${name} is a local Hallow agent that can remember, work, and improve through traces.`,
    personality: {
      soul: "./SOUL.md",
      tone: "precise",
      autonomy_style: "cautious"
    },
    model_policy: {
      planning: "route:smart",
      execution: "route:balanced",
      summarization: "route:cheap",
      reflection: "route:private"
    },
    memory: {
      scope: "agent",
      read: ["./memory", "~/.hallow/memory"],
      write: ["./memory"],
      auto_update: true
    },
    skills: {
      enabled: [],
      allow_auto_skill_creation: true,
      allow_auto_skill_update: true
    },
    tools: {
      "web.search": { enabled: true, approval: "auto" },
      "web.fetch": { enabled: true, approval: "auto" },
      "filesystem.read": { enabled: true, approval: "auto" },
      "filesystem.write": { enabled: true, approval: "ask" },
      "terminal.run": { enabled: false, approval: "ask" },
      "memory.read": { enabled: true, approval: "auto" },
      "memory.write": { enabled: true, approval: "auto" },
      "agent.delegate": { enabled: true, approval: "auto" }
    },
    autonomy: {
      level: "A2",
      schedule_enabled: true,
      max_background_tasks_per_day: 10,
      can_start_tasks_without_user: true,
      can_message_user: true,
      can_message_external_people: false
    },
    learning: {
      enabled: true,
      reflect_after_task: true,
      extract_reusable_workflows: true,
      min_quality_score_for_memory: 0.78,
      min_quality_score_for_skill_update: 0.85,
      require_eval_before_activation: true
    },
    safety: {
      approval_required: [
        "file_delete",
        "external_post",
        "external_message",
        "package_install",
        "terminal_command",
        "money_spend"
      ],
      deny: ["credential_exfiltration", "hidden_external_send", "destructive_file_operation"]
    }
  };
}

export function createDefaultSkillManifest(id: string, name = titleize(id)): SkillManifest {
  return {
    schema: "hallow.skill/v1",
    id,
    name,
    version: "0.0.1",
    author: "local",
    license: "private",
    entry: "SKILL.md",
    required_tools: ["memory.read", "memory.write"],
    permissions: {
      internet: false,
      filesystem_write: "scoped",
      external_send: false,
      terminal: false
    },
    models: {
      recommended: {
        planning: "route:smart",
        execution: "route:balanced",
        reflection: "route:private"
      }
    },
    promotion: {
      min_quality_score: 0.85,
      min_successful_runs: 3
    }
  };
}

export function createDefaultModelProviders(): ModelProvidersConfig {
  return {
    providers: {
      openai: {
        type: "openai",
        base_url: "https://api.openai.com/v1",
        api_key_env: "OPENAI_API_KEY",
        default_model: "gpt-5-mini"
      },
      anthropic: {
        type: "anthropic",
        base_url: "https://api.anthropic.com/v1",
        api_key_env: "ANTHROPIC_API_KEY",
        default_model: "claude-sonnet-4-5"
      },
      google: {
        type: "openai_compatible",
        base_url: "https://generativelanguage.googleapis.com/v1beta/openai",
        api_key_env: "GEMINI_API_KEY",
        default_model: "gemini-2.5-flash"
      },
      openrouter: {
        type: "openai_compatible",
        base_url: "https://openrouter.ai/api/v1",
        api_key_env: "OPENROUTER_API_KEY",
        default_model: "openai/gpt-5-mini"
      },
      groq: {
        type: "openai_compatible",
        base_url: "https://api.groq.com/openai/v1",
        api_key_env: "GROQ_API_KEY",
        default_model: "llama-3.3-70b-versatile"
      },
      mistral: {
        type: "openai_compatible",
        base_url: "https://api.mistral.ai/v1",
        api_key_env: "MISTRAL_API_KEY",
        default_model: "mistral-large-latest"
      },
      deepseek: {
        type: "openai_compatible",
        base_url: "https://api.deepseek.com",
        api_key_env: "DEEPSEEK_API_KEY",
        default_model: "deepseek-v4-pro"
      },
      xai: {
        type: "openai_compatible",
        base_url: "https://api.x.ai/v1",
        api_key_env: "XAI_API_KEY",
        default_model: "grok-4"
      },
      together: {
        type: "openai_compatible",
        base_url: "https://api.together.xyz/v1",
        api_key_env: "TOGETHER_API_KEY",
        default_model: "meta-llama/Llama-3.3-70B-Instruct-Turbo"
      },
      perplexity: {
        type: "openai_compatible",
        base_url: "https://api.perplexity.ai",
        api_key_env: "PERPLEXITY_API_KEY",
        default_model: "sonar-pro"
      },
      ollama: {
        type: "ollama",
        base_url: "http://localhost:11434",
        default_model: "llama3.1"
      },
      lmstudio: {
        type: "openai_compatible",
        base_url: "http://localhost:1234/v1",
        default_model: "local-model"
      },
      vllm: {
        type: "openai_compatible",
        base_url: "http://localhost:8000/v1",
        default_model: "local-model"
      }
    }
  };
}

export function createDefaultModelRoutes(): ModelRoutesConfig {
  return {
    default_route: "balanced",
    routes: {
      smart: {
        primary: "anthropic:claude-sonnet-4-5",
        fallback: ["openai:gpt-5.1", "google:gemini-2.5-pro", "openrouter:anthropic/claude-sonnet-4.5", "ollama:qwen2.5"]
      },
      balanced: {
        primary: "openai:gpt-5-mini",
        fallback: ["google:gemini-2.5-flash", "openrouter:openai/gpt-5-mini", "groq:llama-3.3-70b-versatile", "ollama:llama3.1"]
      },
      cheap: {
        primary: "groq:llama-3.3-70b-versatile",
        fallback: ["deepseek:deepseek-v4-flash", "mistral:mistral-small-latest", "openrouter:meta-llama/llama-3.3-70b-instruct", "ollama:llama3.1"]
      },
      private: {
        primary: "ollama:qwen2.5",
        fallback: ["ollama:llama3.1", "lmstudio:local-model", "vllm:local-model"]
      }
    }
  };
}

export function titleize(value: string): string {
  return value
    .split(/[-_.\s]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
