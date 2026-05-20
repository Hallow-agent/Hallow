import {
  createDefaultModelProviders,
  createDefaultModelRoutes,
  ensureDir,
  getHallowHome,
  hallowPath,
  ModelProvider,
  ModelProvidersConfig,
  ModelRoutesConfig,
  pathExists,
  readYaml,
  writeYaml
} from "@hallow/core";

export type ProviderPreset =
  | "openai"
  | "anthropic"
  | "google"
  | "openrouter"
  | "groq"
  | "mistral"
  | "deepseek"
  | "xai"
  | "together"
  | "fireworks"
  | "perplexity"
  | "ollama"
  | "lmstudio"
  | "vllm"
  | "llamacpp"
  | "custom";

export type AddProviderOptions = {
  type?: ModelProvider["type"];
  baseUrl?: string;
  apiKeyEnv?: string;
  defaultModel?: string;
};

export type ModelCatalogEntry = {
  provider: string;
  model: string;
  label: string;
  family: string;
  tier: "frontier" | "balanced" | "fast" | "cheap" | "local" | "multimodal" | "reasoning" | "coding";
  context?: string;
  requires_key: boolean;
  source: "first_party" | "aggregator" | "local";
};

export type ModelCatalogProvider = {
  name: string;
  type: ModelProvider["type"];
  base_url?: string;
  api_key_env?: string;
  default_model?: string;
  source: "first_party" | "aggregator" | "local";
  note: string;
};

export type ModelCatalogReport = {
  providers: ModelCatalogProvider[];
  models: ModelCatalogEntry[];
};

export type InstallModelCatalogOptions = {
  providers?: string[];
  overwrite?: boolean;
};

export type InstallModelCatalogResult = {
  installed: string[];
  skipped: string[];
  provider_count: number;
  model_count: number;
};

export type ModelTestResult = {
  ok: boolean;
  provider: string;
  message: string;
  model?: string;
};

export type GenerateTextInput = {
  route?: string;
  model?: string;
  system?: string;
  prompt: string;
  temperature?: number;
};

export type GenerateTextResult = {
  provider: string;
  model: string;
  content: string;
};

export class ModelRegistry {
  readonly home: string;

  constructor(home = getHallowHome()) {
    this.home = home;
  }

  get providersPath(): string {
    return hallowPath(this.home, "models", "providers.yaml");
  }

  get routesPath(): string {
    return hallowPath(this.home, "models", "routing.yaml");
  }

  async ensureDefaults(): Promise<void> {
    await ensureDir(hallowPath(this.home, "models"));

    if (!(await pathExists(this.providersPath))) {
      await writeYaml(this.providersPath, createDefaultModelProviders());
    }

    if (!(await pathExists(this.routesPath))) {
      await writeYaml(this.routesPath, createDefaultModelRoutes());
    }
  }

  async addProvider(name: string, options: AddProviderOptions = {}): Promise<ModelProvider> {
    await this.ensureDefaults();

    const config = await this.readProviders();
    const providerName = normalizeProviderName(name);
    const provider = createProviderPreset(providerName, options);
    config.providers[providerName] = provider;
    await writeYaml(this.providersPath, config);
    return provider;
  }

  listCatalog(options: { provider?: string; query?: string } = {}): ModelCatalogReport {
    const provider = options.provider ? normalizeProviderName(options.provider) : undefined;
    const query = options.query?.trim().toLowerCase();
    const providers = MODEL_CATALOG_PROVIDERS.filter((item) => !provider || item.name === provider);
    const models = MODEL_CATALOG_MODELS.filter((item) => {
      if (provider && item.provider !== provider) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [item.provider, item.model, item.label, item.family, item.tier].some((value) =>
        value.toLowerCase().includes(query)
      );
    });
    return { providers, models };
  }

  async installCatalog(options: InstallModelCatalogOptions = {}): Promise<InstallModelCatalogResult> {
    await this.ensureDefaults();
    const providersConfig = await this.readProviders();
    const routes = await this.readRoutes();
    const selected = new Set((options.providers?.length ? options.providers : MODEL_CATALOG_PROVIDERS.map((provider) => provider.name)).map(normalizeProviderName));
    const installed: string[] = [];
    const skipped: string[] = [];

    for (const provider of MODEL_CATALOG_PROVIDERS) {
      if (!selected.has(provider.name)) {
        continue;
      }

      if (providersConfig.providers[provider.name] && !options.overwrite) {
        skipped.push(provider.name);
        continue;
      }

      providersConfig.providers[provider.name] = createProviderPreset(provider.name);
      installed.push(provider.name);
    }

    routes.default_route = routes.default_route || "balanced";
    routes.routes.smart = {
      primary: "anthropic:claude-sonnet-4-5",
      fallback: ["openai:gpt-5.1", "google:gemini-2.5-pro", "openrouter:anthropic/claude-sonnet-4.5", "ollama:qwen2.5"]
    };
    routes.routes.balanced = {
      primary: "openai:gpt-5-mini",
      fallback: ["google:gemini-2.5-flash", "openrouter:openai/gpt-5-mini", "groq:llama-3.3-70b-versatile", "ollama:llama3.1"]
    };
    routes.routes.cheap = {
      primary: "groq:llama-3.3-70b-versatile",
      fallback: ["deepseek:deepseek-chat", "mistral:mistral-small-latest", "openrouter:meta-llama/llama-3.3-70b-instruct", "ollama:llama3.1"]
    };
    routes.routes.reasoning = {
      primary: "openai:o3",
      fallback: ["google:gemini-2.5-pro", "deepseek:deepseek-reasoner", "openrouter:deepseek/deepseek-r1", "ollama:deepseek-r1"]
    };
    routes.routes.coding = {
      primary: "anthropic:claude-sonnet-4-5",
      fallback: ["openai:gpt-5.1-codex", "google:gemini-2.5-pro", "mistral:codestral-latest", "ollama:qwen2.5-coder"]
    };
    routes.routes.private = {
      primary: "ollama:qwen2.5",
      fallback: ["ollama:llama3.1", "ollama:gpt-oss:20b", "lmstudio:local-model", "vllm:local-model"]
    };

    await writeYaml(this.providersPath, providersConfig);
    await writeYaml(this.routesPath, routes);
    return {
      installed,
      skipped,
      provider_count: Object.keys(providersConfig.providers).length,
      model_count: MODEL_CATALOG_MODELS.length
    };
  }

  async listProviders(): Promise<Record<string, ModelProvider>> {
    await this.ensureDefaults();
    return (await this.readProviders()).providers;
  }

  async readProviders(): Promise<ModelProvidersConfig> {
    return readYaml<ModelProvidersConfig>(this.providersPath, createDefaultModelProviders());
  }

  async readRoutes(): Promise<ModelRoutesConfig> {
    return readYaml<ModelRoutesConfig>(this.routesPath, createDefaultModelRoutes());
  }

  async testProvider(name: string): Promise<ModelTestResult> {
    await this.ensureDefaults();
    const providers = await this.readProviders();
    const provider = providers.providers[name];

    if (!provider) {
      return {
        ok: false,
        provider: name,
        message: `Provider "${name}" is not configured.`
      };
    }

    if (provider.type === "ollama") {
      return this.testOllama(name, provider);
    }

    if (provider.type === "anthropic") {
      return this.testAnthropic(name, provider);
    }

    return this.testOpenAICompatible(name, provider);
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    await this.ensureDefaults();
    const providers = await this.readProviders();
    const routes = await this.readRoutes();
    const candidates = this.resolveCandidates(input, routes);
    const failures: string[] = [];

    for (const candidate of candidates) {
      const parsed = parseModelRef(candidate);
      const provider = providers.providers[parsed.provider];

      if (!provider) {
        failures.push(`${candidate}: provider not configured`);
        continue;
      }

      try {
        if (provider.type === "ollama") {
          return await this.generateWithOllama(provider, parsed.provider, parsed.model, input);
        }

        if (provider.type === "anthropic") {
          return await this.generateWithAnthropic(provider, parsed.provider, parsed.model, input);
        }

        return await this.generateWithOpenAICompatible(provider, parsed.provider, parsed.model, input);
      } catch (error) {
        failures.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    throw new Error(`No model route succeeded. ${failures.join(" | ")}`);
  }

  private resolveCandidates(input: GenerateTextInput, routes: ModelRoutesConfig): string[] {
    if (input.model) {
      return [input.model];
    }

    const routeName = input.route ?? routes.default_route;
    const route = routes.routes[routeName];

    if (!route) {
      return [];
    }

    return [route.primary, ...(route.fallback ?? [])];
  }

  private async testOllama(name: string, provider: ModelProvider): Promise<ModelTestResult> {
    const baseUrl = provider.base_url ?? "http://localhost:11434";

    try {
      const response = await fetch(`${baseUrl}/api/tags`);
      if (!response.ok) {
        return {
          ok: false,
          provider: name,
          message: `Ollama responded with HTTP ${response.status}.`
        };
      }

      return {
        ok: true,
        provider: name,
        model: provider.default_model,
        message: "Ollama is reachable."
      };
    } catch (error) {
      return {
        ok: false,
        provider: name,
        message: `Ollama is not reachable at ${baseUrl}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async testOpenAICompatible(name: string, provider: ModelProvider): Promise<ModelTestResult> {
    const baseUrl = provider.base_url ?? "https://api.openai.com/v1";
    const apiKey = provider.api_key_env ? process.env[provider.api_key_env] : undefined;

    if (!apiKey) {
      return {
        ok: false,
        provider: name,
        model: provider.default_model,
        message: `Missing API key env ${provider.api_key_env ?? "(none configured)"}.`
      };
    }

    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        return {
          ok: false,
          provider: name,
          model: provider.default_model,
          message: `Provider responded with HTTP ${response.status}.`
        };
      }

      return {
        ok: true,
        provider: name,
        model: provider.default_model,
        message: "Provider is reachable."
      };
    } catch (error) {
      return {
        ok: false,
        provider: name,
        model: provider.default_model,
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async testAnthropic(name: string, provider: ModelProvider): Promise<ModelTestResult> {
    const baseUrl = provider.base_url ?? "https://api.anthropic.com/v1";
    const apiKey = provider.api_key_env ? process.env[provider.api_key_env] : undefined;

    if (!apiKey) {
      return {
        ok: false,
        provider: name,
        model: provider.default_model,
        message: `Missing API key env ${provider.api_key_env ?? "(none configured)"}.`
      };
    }

    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        }
      });

      if (!response.ok) {
        return {
          ok: false,
          provider: name,
          model: provider.default_model,
          message: `Anthropic responded with HTTP ${response.status}.`
        };
      }

      return {
        ok: true,
        provider: name,
        model: provider.default_model,
        message: "Anthropic is reachable."
      };
    } catch (error) {
      return {
        ok: false,
        provider: name,
        model: provider.default_model,
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async generateWithOpenAICompatible(
    provider: ModelProvider,
    providerName: string,
    model: string,
    input: GenerateTextInput
  ): Promise<GenerateTextResult> {
    const baseUrl = provider.base_url ?? "https://api.openai.com/v1";
    const apiKey = provider.api_key_env ? process.env[provider.api_key_env] : undefined;

    if (!apiKey) {
      throw new Error(`missing API key env ${provider.api_key_env ?? "(none configured)"}`);
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: input.temperature ?? 0.2,
        messages: [
          {
            role: "system",
            content:
              input.system ??
              "You are a local Hallow agent. Be concise, practical, and trace-friendly."
          },
          {
            role: "user",
            content: input.prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${providerName}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(`empty completion from ${providerName}`);
    }

    return {
      provider: providerName,
      model,
      content
    };
  }

  private async generateWithAnthropic(
    provider: ModelProvider,
    providerName: string,
    model: string,
    input: GenerateTextInput
  ): Promise<GenerateTextResult> {
    const baseUrl = provider.base_url ?? "https://api.anthropic.com/v1";
    const apiKey = provider.api_key_env ? process.env[provider.api_key_env] : undefined;

    if (!apiKey) {
      throw new Error(`missing API key env ${provider.api_key_env ?? "(none configured)"}`);
    }

    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        temperature: input.temperature ?? 0.2,
        system:
          input.system ??
          "You are a local Hallow agent. Be concise, practical, and trace-friendly.",
        messages: [
          {
            role: "user",
            content: input.prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${providerName}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const content = data.content?.find((item) => item.type === "text" && item.text)?.text ?? data.content?.[0]?.text;

    if (!content) {
      throw new Error(`empty completion from ${providerName}`);
    }

    return {
      provider: providerName,
      model,
      content
    };
  }

  private async generateWithOllama(
    provider: ModelProvider,
    providerName: string,
    model: string,
    input: GenerateTextInput
  ): Promise<GenerateTextResult> {
    const baseUrl = provider.base_url ?? "http://localhost:11434";
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              input.system ??
              "You are a local Hallow agent. Be concise, practical, and trace-friendly."
          },
          {
            role: "user",
            content: input.prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from Ollama`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    const content = data.message?.content;

    if (!content) {
      throw new Error("empty completion from Ollama");
    }

    return {
      provider: providerName,
      model,
      content
    };
  }
}

export function parseModelRef(ref: string): { provider: string; model: string } {
  const separator = ref.indexOf(":");
  if (separator === -1) {
    throw new Error(`Invalid model ref "${ref}". Expected provider:model.`);
  }

  return {
    provider: ref.slice(0, separator),
    model: ref.slice(separator + 1)
  };
}

export function createProviderPreset(name: string, options: AddProviderOptions = {}): ModelProvider {
  const providerName = normalizeProviderName(name);
  const catalogProvider = MODEL_CATALOG_PROVIDERS.find((provider) => provider.name === providerName);
  if (catalogProvider) {
    return {
      type: options.type ?? catalogProvider.type,
      base_url: options.baseUrl ?? catalogProvider.base_url,
      api_key_env: options.apiKeyEnv ?? catalogProvider.api_key_env,
      default_model: options.defaultModel ?? catalogProvider.default_model
    };
  }

  if (providerName === "openai") {
    return {
      type: "openai",
      base_url: options.baseUrl ?? "https://api.openai.com/v1",
      api_key_env: options.apiKeyEnv ?? "OPENAI_API_KEY",
      default_model: options.defaultModel ?? "gpt-5-mini"
    };
  }

  if (providerName === "openrouter") {
    return {
      type: "openai_compatible",
      base_url: options.baseUrl ?? "https://openrouter.ai/api/v1",
      api_key_env: options.apiKeyEnv ?? "OPENROUTER_API_KEY",
      default_model: options.defaultModel ?? "openai/gpt-5-mini"
    };
  }

  if (providerName === "ollama") {
    return {
      type: "ollama",
      base_url: options.baseUrl ?? "http://localhost:11434",
      default_model: options.defaultModel ?? "llama3.1"
    };
  }

  return {
    type: options.type ?? "openai_compatible",
    base_url: options.baseUrl,
    api_key_env: options.apiKeyEnv,
    default_model: options.defaultModel
  };
}

function normalizeProviderName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "");
}

const MODEL_CATALOG_PROVIDERS: ModelCatalogProvider[] = [
  {
    name: "openai",
    type: "openai",
    base_url: "https://api.openai.com/v1",
    api_key_env: "OPENAI_API_KEY",
    default_model: "gpt-5-mini",
    source: "first_party",
    note: "Official OpenAI API. Requires OPENAI_API_KEY."
  },
  {
    name: "anthropic",
    type: "anthropic",
    base_url: "https://api.anthropic.com/v1",
    api_key_env: "ANTHROPIC_API_KEY",
    default_model: "claude-sonnet-4-5",
    source: "first_party",
    note: "Official Anthropic Messages API. Requires ANTHROPIC_API_KEY."
  },
  {
    name: "google",
    type: "openai_compatible",
    base_url: "https://generativelanguage.googleapis.com/v1beta/openai",
    api_key_env: "GEMINI_API_KEY",
    default_model: "gemini-2.5-flash",
    source: "first_party",
    note: "Gemini OpenAI-compatible endpoint. Requires GEMINI_API_KEY."
  },
  {
    name: "openrouter",
    type: "openai_compatible",
    base_url: "https://openrouter.ai/api/v1",
    api_key_env: "OPENROUTER_API_KEY",
    default_model: "openai/gpt-5-mini",
    source: "aggregator",
    note: "Aggregator for many hosted model families. Requires OPENROUTER_API_KEY."
  },
  {
    name: "groq",
    type: "openai_compatible",
    base_url: "https://api.groq.com/openai/v1",
    api_key_env: "GROQ_API_KEY",
    default_model: "llama-3.3-70b-versatile",
    source: "first_party",
    note: "Groq OpenAI-compatible endpoint. Requires GROQ_API_KEY."
  },
  {
    name: "mistral",
    type: "openai_compatible",
    base_url: "https://api.mistral.ai/v1",
    api_key_env: "MISTRAL_API_KEY",
    default_model: "mistral-large-latest",
    source: "first_party",
    note: "Mistral chat completions endpoint. Requires MISTRAL_API_KEY."
  },
  {
    name: "deepseek",
    type: "openai_compatible",
    base_url: "https://api.deepseek.com",
    api_key_env: "DEEPSEEK_API_KEY",
    default_model: "deepseek-chat",
    source: "first_party",
    note: "DeepSeek OpenAI-compatible endpoint. Requires DEEPSEEK_API_KEY."
  },
  {
    name: "xai",
    type: "openai_compatible",
    base_url: "https://api.x.ai/v1",
    api_key_env: "XAI_API_KEY",
    default_model: "grok-4",
    source: "first_party",
    note: "xAI OpenAI-compatible endpoint. Requires XAI_API_KEY."
  },
  {
    name: "together",
    type: "openai_compatible",
    base_url: "https://api.together.xyz/v1",
    api_key_env: "TOGETHER_API_KEY",
    default_model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    source: "aggregator",
    note: "Together hosted open model endpoint. Requires TOGETHER_API_KEY."
  },
  {
    name: "fireworks",
    type: "openai_compatible",
    base_url: "https://api.fireworks.ai/inference/v1",
    api_key_env: "FIREWORKS_API_KEY",
    default_model: "accounts/fireworks/models/llama-v3p1-405b-instruct",
    source: "aggregator",
    note: "Fireworks hosted model endpoint. Requires FIREWORKS_API_KEY."
  },
  {
    name: "perplexity",
    type: "openai_compatible",
    base_url: "https://api.perplexity.ai",
    api_key_env: "PERPLEXITY_API_KEY",
    default_model: "sonar-pro",
    source: "first_party",
    note: "Perplexity Sonar endpoint. Requires PERPLEXITY_API_KEY."
  },
  {
    name: "ollama",
    type: "ollama",
    base_url: "http://localhost:11434",
    default_model: "llama3.1",
    source: "local",
    note: "Local Ollama runtime. No API key."
  },
  {
    name: "lmstudio",
    type: "openai_compatible",
    base_url: "http://localhost:1234/v1",
    default_model: "local-model",
    source: "local",
    note: "Local LM Studio OpenAI-compatible server. No API key."
  },
  {
    name: "vllm",
    type: "openai_compatible",
    base_url: "http://localhost:8000/v1",
    default_model: "local-model",
    source: "local",
    note: "Local/self-hosted vLLM OpenAI-compatible server. No API key by default."
  },
  {
    name: "llamacpp",
    type: "openai_compatible",
    base_url: "http://localhost:8080/v1",
    default_model: "local-model",
    source: "local",
    note: "Local llama.cpp server in OpenAI-compatible mode. No API key by default."
  }
];

const MODEL_CATALOG_MODELS: ModelCatalogEntry[] = [
  model("openai", "gpt-5.1", "GPT-5.1", "OpenAI", "frontier"),
  model("openai", "gpt-5-mini", "GPT-5 mini", "OpenAI", "balanced"),
  model("openai", "gpt-5-nano", "GPT-5 nano", "OpenAI", "fast"),
  model("openai", "gpt-5.1-codex", "GPT-5.1 Codex", "OpenAI", "coding"),
  model("openai", "gpt-4.1", "GPT-4.1", "OpenAI", "balanced"),
  model("openai", "gpt-4.1-mini", "GPT-4.1 mini", "OpenAI", "fast"),
  model("openai", "o3", "o3", "OpenAI", "reasoning"),
  model("openai", "o4-mini", "o4-mini", "OpenAI", "reasoning"),
  model("anthropic", "claude-opus-4-1-20250805", "Claude Opus 4.1", "Claude", "frontier"),
  model("anthropic", "claude-sonnet-4-5", "Claude Sonnet 4.5", "Claude", "coding"),
  model("anthropic", "claude-sonnet-4-20250514", "Claude Sonnet 4", "Claude", "balanced"),
  model("anthropic", "claude-haiku-4-5-20251001", "Claude Haiku 4.5", "Claude", "fast"),
  model("google", "gemini-2.5-pro", "Gemini 2.5 Pro", "Gemini", "frontier"),
  model("google", "gemini-2.5-flash", "Gemini 2.5 Flash", "Gemini", "balanced"),
  model("google", "gemini-2.5-flash-lite", "Gemini 2.5 Flash Lite", "Gemini", "cheap"),
  model("google", "gemini-2.0-flash", "Gemini 2.0 Flash", "Gemini", "fast"),
  model("mistral", "mistral-large-latest", "Mistral Large", "Mistral", "frontier"),
  model("mistral", "mistral-medium-latest", "Mistral Medium", "Mistral", "balanced"),
  model("mistral", "mistral-small-latest", "Mistral Small", "Mistral", "cheap"),
  model("mistral", "codestral-latest", "Codestral", "Mistral", "coding"),
  model("mistral", "ministral-8b-latest", "Ministral 8B", "Mistral", "fast"),
  model("groq", "llama-3.3-70b-versatile", "Llama 3.3 70B Versatile", "Llama", "fast"),
  model("groq", "deepseek-r1-distill-llama-70b", "DeepSeek R1 Distill Llama 70B", "DeepSeek", "reasoning"),
  model("groq", "qwen/qwen3-32b", "Qwen3 32B", "Qwen", "fast"),
  model("deepseek", "deepseek-chat", "DeepSeek Chat", "DeepSeek", "balanced"),
  model("deepseek", "deepseek-reasoner", "DeepSeek Reasoner", "DeepSeek", "reasoning"),
  model("xai", "grok-4", "Grok 4", "Grok", "frontier"),
  model("xai", "grok-3", "Grok 3", "Grok", "balanced"),
  model("xai", "grok-3-mini", "Grok 3 Mini", "Grok", "fast"),
  model("together", "meta-llama/Llama-3.3-70B-Instruct-Turbo", "Llama 3.3 70B Turbo", "Llama", "balanced"),
  model("together", "Qwen/Qwen3-235B-A22B-fp8-tput", "Qwen3 235B A22B", "Qwen", "frontier"),
  model("fireworks", "accounts/fireworks/models/llama-v3p1-405b-instruct", "Llama 3.1 405B", "Llama", "frontier"),
  model("perplexity", "sonar-pro", "Sonar Pro", "Perplexity", "multimodal"),
  model("perplexity", "sonar", "Sonar", "Perplexity", "fast"),
  model("openrouter", "anthropic/claude-sonnet-4.5", "Claude Sonnet 4.5 via OpenRouter", "Claude", "coding", "aggregator"),
  model("openrouter", "openai/gpt-5-mini", "GPT-5 mini via OpenRouter", "OpenAI", "balanced", "aggregator"),
  model("openrouter", "google/gemini-2.5-pro", "Gemini 2.5 Pro via OpenRouter", "Gemini", "frontier", "aggregator"),
  model("openrouter", "deepseek/deepseek-r1", "DeepSeek R1 via OpenRouter", "DeepSeek", "reasoning", "aggregator"),
  model("openrouter", "meta-llama/llama-3.3-70b-instruct", "Llama 3.3 70B via OpenRouter", "Llama", "cheap", "aggregator"),
  model("openrouter", "qwen/qwen3-235b-a22b", "Qwen3 235B via OpenRouter", "Qwen", "frontier", "aggregator"),
  model("ollama", "llama3.1", "Llama 3.1 local", "Llama", "local", "local"),
  model("ollama", "qwen2.5", "Qwen2.5 local", "Qwen", "local", "local"),
  model("ollama", "qwen2.5-coder", "Qwen2.5 Coder local", "Qwen", "coding", "local"),
  model("ollama", "deepseek-r1", "DeepSeek R1 local", "DeepSeek", "reasoning", "local"),
  model("ollama", "gpt-oss:20b", "GPT OSS 20B local", "OpenAI OSS", "local", "local"),
  model("ollama", "mistral", "Mistral local", "Mistral", "local", "local"),
  model("lmstudio", "local-model", "LM Studio loaded model", "Local", "local", "local"),
  model("vllm", "local-model", "vLLM loaded model", "Local", "local", "local"),
  model("llamacpp", "local-model", "llama.cpp loaded model", "Local", "local", "local")
];

function model(
  provider: string,
  modelName: string,
  label: string,
  family: string,
  tier: ModelCatalogEntry["tier"],
  source?: ModelCatalogEntry["source"]
): ModelCatalogEntry {
  const providerInfo = MODEL_CATALOG_PROVIDERS.find((item) => item.name === provider);
  return {
    provider,
    model: modelName,
    label,
    family,
    tier,
    requires_key: Boolean(providerInfo?.api_key_env),
    source: source ?? providerInfo?.source ?? "first_party"
  };
}
