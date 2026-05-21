#!/usr/bin/env node
import { getHallowHome, hallowPath, loadEnvFile, RiskLevel, writeText } from "@hallow/core";
import { AddProviderOptions, ModelCatalogEntry, ModelCatalogProvider, ModelRegistry } from "@hallow/models";
import {
  AgentInstallResult,
  AgentPackageVerification,
  AutonomyHealReport,
  AutonomyLoopLock,
  AutonomyLoopResult,
  AutonomyPolicy,
  AutonomyTickResult,
  AutonomyTickOptions,
  BrowserObservation,
  BrowserSessionReport,
  DesktopShellStatus,
  EmbeddingProviderConfig,
  EmbeddingProviderType,
  EmbeddingStatusReport,
  GatewayAdapterReport,
  GatewayInboxEvent,
  GatewayOutboundMessage,
  GatewayPairing,
  GatewayStatus,
  HallowRuntime,
  HeartbeatReport,
  McpDiscoveryReport,
  McpProbeReport,
  McpServerConfig,
  McpToolCallReport,
  MemoryItem,
  MemoryPrivacy,
  MemoryScope,
  MemorySuggestion,
  MemoryStoreStats,
  MemoryType,
  OnboardingReport,
  MarketplaceInstallResult,
  MarketplacePackageSignature,
  MarketplaceRegistryBundle,
  MarketplaceSearchResult,
  NotificationItem,
  NotificationStatus,
  OAuthConnectorManifest,
  OAuthConnectorProvider,
  OAuthGrant,
  OAuthStatusReport,
  OAuthTokenRecord,
  PerfectBuildReport,
  QualityReport,
  ReactiveTriggerReport,
  SandboxRunResult,
  SecurityAuditReport,
  SkillHubReport,
  SkillInstallResult,
  SkillPackageVerification,
  UpdateMemoryInput,
  UpdateAutonomyPolicyInput,
  WebAuthLaunchReport,
  WebAuthProviderManifest,
  WebAuthStatusReport
} from "@hallow/runtime";

const HALLOW_CLI_VERSION = "0.0.1";
const HALLOW_RELEASE_LABEL = "001";

const HALLOW_WORDMARK = String.raw`
 __    __   ______   __       __        ______   __       __
|  \  |  \ /      \ |  \     |  \      /      \ |  \  _  |  \
| $$  | $$|  $$$$$$\| $$     | $$     |  $$$$$$\| $$ / \ | $$
| $$__| $$| $$__| $$| $$     | $$     | $$  | $$| $$/  $\| $$
| $$    $$| $$    $$| $$     | $$     | $$  | $$| $$  $$$\ $$
| $$$$$$$$| $$$$$$$$| $$     | $$     | $$  | $$| $$ $$\$$\$$
| $$  | $$| $$  | $$| $$_____| $$_____| $$__/ $$| $$$$  \$$$$
| $$  | $$| $$  | $$| $$     \| $$     \ \$$    $$| $$$    \$$$
 \$$   \$$ \$$   \$$ \$$$$$$$$ \$$$$$$$$  \$$$$$$  \$$      \$$
`.trim().split("\n");

const HALLOW_MASK_ASCII = String.raw`
          001111111100
       001/          \100
     01/   11111111   \10
    10|      11 11     |01
    10|    0_11 11_0   |01
    10|       000      |01
    10|    __/  \__    |01
     01\     11      /10
       001\__11__/100
           000000
`.split("\n").slice(1, -1);

type CommandContext = {
  args: string[];
  home: string;
  runtime: HallowRuntime;
  models: ModelRegistry;
};

type DemoRunResult = {
  reportPath: string;
  readinessScore: number;
  readinessStatus: string;
  mcpTools: number;
  mcpCallOk: boolean;
  browserArtifact?: string;
  securityStatus: string;
};

type TerminalWelcomeMode = "setup" | "start" | "status" | "welcome";

type TerminalWelcomeOptions = {
  mode: TerminalWelcomeMode;
  port?: number;
  startUrl?: string;
  desktop?: DesktopShellStatus;
};

type TerminalSnapshot = {
  readiness?: Awaited<ReturnType<HallowRuntime["getReadinessReport"]>>;
  doctorChecks?: Awaited<ReturnType<HallowRuntime["doctor"]>>;
  mcp?: Awaited<ReturnType<HallowRuntime["discoverMcpTools"]>>;
  gateway?: Awaited<ReturnType<HallowRuntime["getGatewayStatus"]>>;
  memory?: Awaited<ReturnType<HallowRuntime["getMemoryStoreStats"]>>;
  skillHub?: Awaited<ReturnType<HallowRuntime["getSkillHubReport"]>>;
  modelHealth?: Awaited<ReturnType<HallowRuntime["getModelHealth"]>>;
  tools?: Awaited<ReturnType<HallowRuntime["listTools"]>>;
  agents?: Awaited<ReturnType<HallowRuntime["listAgents"]>>;
  usage?: Awaited<ReturnType<HallowRuntime["getUsageReport"]>>;
  security?: Awaited<ReturnType<HallowRuntime["runSecurityAudit"]>>;
  desktop?: DesktopShellStatus;
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const home = readOption(args, "--home") ?? getHallowHome();
  await loadEnvFile(hallowPath(home, ".env"));
  const cleanArgs = stripOption(args, "--home");
  const runtime = new HallowRuntime(home);
  const models = new ModelRegistry(home);
  const context: CommandContext = {
    args: cleanArgs,
    home,
    runtime,
    models
  };

  await dispatch(context);
}

async function dispatch(context: CommandContext): Promise<void> {
  const [command, subcommand, ...rest] = context.args;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    if (!command) {
      await context.runtime.init();
      await printTerminalWelcome(context, { mode: "welcome" });
    } else {
      printHelp();
    }
    return;
  }

  if (command === "version" || command === "--version" || command === "-v") {
    console.log(`Hallow ${HALLOW_RELEASE_LABEL} (${HALLOW_CLI_VERSION})`);
    return;
  }

  if (command === "terminal" || command === "welcome") {
    await context.runtime.init();
    await printTerminalWelcome(context, { mode: "welcome" });
    return;
  }

  if (command === "init") {
    const result = await context.runtime.init();
    console.log(`Hallow initialized at ${result.home}`);
    console.log(`Created/verified ${result.created.length} paths. Skipped ${result.skipped.length} existing files.`);
    return;
  }

  if (command === "setup") {
    const commandArgs = context.args.slice(1);
    const port = readNumberOption(commandArgs, "--port");
    await context.runtime.init();
    const desktop = await context.runtime.setupDesktopShell({ port });
    await printTerminalWelcome(context, {
      mode: "setup",
      port: desktop.port ?? port ?? 4767,
      startUrl: desktop.start_url,
      desktop
    });
    return;
  }

  if (command === "doctor") {
    await context.runtime.init();
    const checks = await context.runtime.doctor();
    for (const check of checks) {
      console.log(`${check.ok ? "OK" : "FAIL"} ${check.name} - ${check.detail}`);
    }

    const failed = checks.filter((check) => !check.ok);
    if (failed.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "start") {
    const commandArgs = context.args.slice(1);
    const port = Number(readOption(commandArgs, "--port") ?? "");
    await context.runtime.init();
    const config = await context.runtime.readConfig();
    const selectedPort = Number.isFinite(port) && port > 0 ? port : config.gateway.local_console.port;
    const startUrl = `http://${config.gateway.local_console.host}:${selectedPort}/desktop`;
    await context.runtime.startLocalApi(selectedPort, { quiet: true });
    await printTerminalWelcome(context, { mode: "start", port: selectedPort, startUrl });
    return;
  }

  if (command === "status") {
    await context.runtime.init();
    const checks = await context.runtime.doctor();
    const okCount = checks.filter((check) => check.ok).length;
    console.log(`Hallow home: ${context.home}`);
    console.log(`Health: ${okCount}/${checks.length} checks passing`);
    return;
  }

  if (command === "readiness") {
    const report = await context.runtime.getReadinessReport();
    console.log(`Hallow readiness: ${report.score}% (${report.status})`);
    for (const check of report.checks) {
      console.log(`${check.ok ? "OK" : "GAP"} ${check.id}\t${check.weight}\t${check.detail}`);
    }
    for (const action of report.next_actions) {
      console.log(`- ${action}`);
    }
    if (report.status === "prototype" && context.args.includes("--strict")) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "demo") {
    await handleDemo(context, subcommand, rest);
    return;
  }

  if (command === "perfect") {
    await handlePerfect(context, subcommand, rest);
    return;
  }

  if (command === "onboarding") {
    await context.runtime.init();
    printOnboardingReport(await context.runtime.getOnboardingReport());
    return;
  }

  if (command === "desktop") {
    await handleDesktop(context, subcommand, rest);
    return;
  }

  if (command === "logs") {
    console.log(`Logs are stored at ${hallowPath(context.home, "logs")}`);
    return;
  }

  if (command === "agent") {
    await handleAgent(context, subcommand, rest);
    return;
  }

  if (command === "skill") {
    await handleSkill(context, subcommand, rest);
    return;
  }

  if (command === "memory") {
    await handleMemory(context, subcommand, rest);
    return;
  }

  if (command === "workspace") {
    await handleWorkspace(context, subcommand, rest);
    return;
  }

  if (command === "mcp") {
    await handleMcp(context, subcommand, rest);
    return;
  }

  if (command === "browser") {
    await handleBrowser(context, subcommand, rest);
    return;
  }

  if (command === "web-auth" || command === "webauth") {
    await handleWebAuth(context, subcommand, rest);
    return;
  }

  if (command === "tool") {
    await handleTool(context, subcommand, rest);
    return;
  }

  if (command === "schedule") {
    await handleSchedule(context, subcommand, rest);
    return;
  }

  if (command === "autonomy") {
    await handleAutonomy(context, subcommand, rest);
    return;
  }

  if (command === "security") {
    await handleSecurity(context, subcommand, rest);
    return;
  }

  if (command === "sandbox") {
    await handleSandbox(context, subcommand, rest);
    return;
  }

  if (command === "gateway") {
    await handleGateway(context, subcommand, rest);
    return;
  }

  if (command === "marketplace") {
    await handleMarketplace(context, subcommand, rest);
    return;
  }

  if (command === "integration" || command === "integrations") {
    await handleIntegration(context, subcommand, rest);
    return;
  }

  if (command === "fleet") {
    await handleFleet(context, subcommand, rest);
    return;
  }

  if (command === "task") {
    await handleTask(context, subcommand, rest);
    return;
  }

  if (command === "approval") {
    await handleApproval(context, subcommand, rest);
    return;
  }

  if (command === "model") {
    await handleModel(context, subcommand, rest);
    return;
  }

  if (command === "usage") {
    await handleUsage(context, subcommand, rest);
    return;
  }

  if (command === "embedding" || command === "embeddings") {
    await handleEmbedding(context, subcommand, rest);
    return;
  }

  if (command === "notification" || command === "notifications") {
    await handleNotification(context, subcommand, rest);
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exitCode = 1;
}

async function handleAgent(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "create") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow agent create <id>");
    }

    const name = readOption(rest, "--name");
    const agent = await context.runtime.createAgent(id, { name });
    console.log(`Agent created: ${agent.name} (${agent.id})`);
    console.log(hallowPath(context.home, "agents", agent.id, "agent.yaml"));
    return;
  }

  if (subcommand === "verify") {
    const path = rest[0];
    if (!path) {
      throw new Error("Usage: hallow agent verify <path>");
    }

    const verification = await context.runtime.verifyAgentPackage(path);
    printAgentPackageVerification(verification);
    if (!verification.ok) {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "install") {
    const path = rest[0];
    if (!path) {
      throw new Error("Usage: hallow agent install <path> [--force]");
    }

    const result = await context.runtime.installAgentPackage(path, {
      force: rest.includes("--force")
    });
    printAgentInstallResult(result);
    return;
  }

  if (subcommand === "list" || !subcommand) {
    const agents = await context.runtime.listAgents();
    for (const agent of agents) {
      console.log(`${agent.id}\t${agent.name}\t${agent.autonomy.level}`);
    }
    return;
  }

  if (subcommand === "run") {
    const agentId = rest[0];
    const prompt = rest.slice(1).join(" ").trim();
    if (!agentId || !prompt) {
      throw new Error('Usage: hallow agent run <id> "task prompt"');
    }

    const result = await context.runtime.runAgent(agentId, prompt);
    console.log(`Agent run complete: ${result.trace.status}`);
    console.log(`Model: ${result.usedModel}`);
    console.log(`Plan: ${result.plan.tools.length > 0 ? result.plan.tools.join(", ") : "no tools"}`);
    if (result.tool_uses.length > 0) {
      for (const toolUse of result.tool_uses) {
        console.log(`Tool: ${toolUse.tool} ${toolUse.status} ${toolUse.target}`);
      }
    }
    console.log(`Output: ${result.outputPath}`);
    console.log(`Trace: ${hallowPath(context.home, "traces", `${result.trace.id}.yaml`)}`);
    if (result.simulated) {
      console.log("Note: model route was unavailable, so Hallow used local fallback mode.");
    }
    if (result.trace.status === "failed") {
      process.exitCode = 1;
    }
    return;
  }

  throw new Error(`Unknown agent command: ${subcommand}`);
}

async function handleDemo(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  if (subcommand === "setup" || !subcommand) {
    const report = await setupDemo(context, { liveMcp: !rest.includes("--skip-live-mcp"), browser: !rest.includes("--skip-browser") });
    printDemoRunResult(report);
    return;
  }

  if (subcommand === "run") {
    const report = await runDemo(context, { liveMcp: !rest.includes("--skip-live-mcp"), browser: !rest.includes("--skip-browser") });
    printDemoRunResult(report);
    return;
  }

  if (subcommand === "checklist") {
    await context.runtime.init();
    const readiness = await context.runtime.getReadinessReport();
    const mcp = await context.runtime.discoverMcpTools();
    const security = await context.runtime.runSecurityAudit({ write: false });
    console.log(`Demo readiness: ${readiness.score}% ${readiness.status}`);
    console.log(`MCP servers: ${mcp.servers.length}`);
    console.log(`Security: ${security.status}`);
    for (const action of readiness.next_actions) {
      console.log(`- ${action}`);
    }
    return;
  }

  throw new Error(`Unknown demo command: ${subcommand}`);
}

async function handlePerfect(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "status" || subcommand === "checklist" || subcommand === "report" || !subcommand) {
    const report =
      subcommand === "report" || rest.includes("--write")
        ? await context.runtime.writePerfectBuildReport()
        : await context.runtime.getPerfectBuildReport();
    printPerfectBuildReport(report);
    if (report.report_path) {
      console.log(`Report: ${report.report_path}`);
    }
    return;
  }

  throw new Error(`Unknown perfect command: ${subcommand}`);
}

async function handleDesktop(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "setup" || !subcommand) {
    const status = await context.runtime.setupDesktopShell({ port: readNumberOption(rest, "--port") });
    printDesktopStatus(status);
    return;
  }

  if (subcommand === "status") {
    printDesktopStatus(await context.runtime.getDesktopShellStatus());
    return;
  }

  if (subcommand === "path") {
    const status = await context.runtime.getDesktopShellStatus();
    console.log(status.index_path);
    return;
  }

  throw new Error("Usage: hallow desktop setup [--port 4767] | status | path");
}

async function handleSkill(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "create") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow skill create <id>");
    }

    const internet = rest.includes("--internet");
    const skill = await context.runtime.createSkill(id, { internet });
    console.log(`Skill created: ${skill.name} (${skill.id})`);
    console.log(hallowPath(context.home, "skills", skill.id, "SKILL.md"));
    return;
  }

  if (subcommand === "verify") {
    const path = rest[0];
    if (!path) {
      throw new Error("Usage: hallow skill verify <path>");
    }

    const verification = await context.runtime.verifySkillPackage(path);
    printSkillPackageVerification(verification);
    if (!verification.ok) {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "install") {
    const path = rest[0];
    if (!path) {
      throw new Error("Usage: hallow skill install <path> [--force]");
    }

    const result = await context.runtime.installSkillPackage(path, {
      force: rest.includes("--force")
    });
    printSkillInstallResult(result);
    return;
  }

  if (subcommand === "test") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow skill test <id>");
    }

    const result = await context.runtime.testSkill(id);
    console.log(`Skill test ${result.passed ? "passed" : "failed"}: ${result.skill.id}`);
    console.log(`Task: ${result.task.id}`);
    console.log(`Expected: ${result.expected_status}`);
    console.log(`Actual: ${result.task.status}`);
    console.log(`Pass rate: ${formatPercent(result.metrics.pass_rate)}`);
    console.log(`Average quality: ${result.metrics.average_quality_score.toFixed(2)}`);
    console.log(`Promotion eligible: ${result.metrics.promotion_eligible ? "yes" : "no"}`);
    console.log(`Result: ${result.result_path}`);
    if (result.run) {
      console.log(`Trace: ${hallowPath(context.home, "traces", `${result.run.trace.id}.yaml`)}`);
    }

    if (!result.passed) {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "stats") {
    const id = rest[0];
    const metrics = id ? [await context.runtime.getSkillMetrics(id)] : await context.runtime.listSkillMetrics();

    for (const metric of metrics) {
      console.log(
        `${metric.skill_id}\truns=${metric.total_runs}\tpass=${formatPercent(
          metric.pass_rate
        )}\tquality=${metric.average_quality_score.toFixed(2)}\tpromote=${
          metric.promotion_eligible ? "yes" : "no"
        }`
      );
    }
    return;
  }

  if (subcommand === "reflect") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow skill reflect <id>");
    }

    const reflection = await context.runtime.reflectSkill(id);
    console.log(`Skill reflection written: ${reflection.reflection_path}`);
    console.log(reflection.summary);
    for (const action of reflection.next_actions) {
      console.log(`- ${action}`);
    }
    return;
  }

  if (subcommand === "improve") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow skill improve <id>");
    }

    const draft = await context.runtime.improveSkill(id);
    console.log(`Skill improvement draft written: ${draft.draft_path}`);
    console.log(`Versioned draft: ${draft.versioned_draft_path}`);
    console.log(`Record: ${draft.record_path}`);
    console.log(`Memory: ${draft.memory_id}`);
    console.log(draft.summary);
    for (const change of draft.changes) {
      console.log(`- ${change}`);
    }
    return;
  }

  if (subcommand === "review") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow skill review <id>");
    }

    const review = await context.runtime.reviewSkillImprovement(id);
    console.log(`Skill improvement review: ${review.status}`);
    console.log(`Draft: ${review.draft_path}`);
    console.log(`Review: ${review.review_path}`);
    console.log(`Memory: ${review.memory_id}`);
    console.log(review.summary);
    for (const check of review.checks) {
      console.log(`${check.ok ? "OK" : "BLOCKED"} ${check.id} - ${check.detail}`);
    }
    for (const action of review.next_actions) {
      console.log(`- ${action}`);
    }

    if (review.status !== "ready" && rest.includes("--strict")) {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "promote") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow skill promote <id> [--force] [--strict]");
    }

    const promotion = await context.runtime.promoteSkill(id, {
      force: rest.includes("--force")
    });
    console.log(`Skill promotion: ${promotion.status}`);
    console.log(`Active: ${promotion.active_path}`);
    console.log(`Draft: ${promotion.draft_path}`);
    if (promotion.backup_path) {
      console.log(`Backup: ${promotion.backup_path}`);
    }
    console.log(`Review: ${promotion.review_path} (${promotion.review_status})`);
    console.log(`Record: ${promotion.record_path}`);
    console.log(`Memory: ${promotion.memory_id}`);
    console.log(promotion.summary);
    for (const action of promotion.next_actions) {
      console.log(`- ${action}`);
    }

    if (promotion.status !== "promoted" && rest.includes("--strict")) {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "rollback") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow skill rollback <id> [--backup path]");
    }

    const rollback = await context.runtime.rollbackSkill(id, {
      backupPath: readOption(rest, "--backup")
    });
    console.log("Skill rollback complete");
    console.log(`Active: ${rollback.active_path}`);
    console.log(`Restored from: ${rollback.backup_path}`);
    console.log(`Record: ${rollback.record_path}`);
    console.log(`Memory: ${rollback.memory_id}`);
    console.log(rollback.summary);
    return;
  }

  if (subcommand === "confirm") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow skill confirm <id> [--dry-run] [--strict]");
    }

    const confirmation = await context.runtime.confirmSkill(id, {
      dryRun: rest.includes("--dry-run")
    });
    console.log(`Skill confirmation: ${confirmation.status}`);
    console.log(`Record: ${confirmation.record_path}`);
    if (confirmation.task_id) {
      console.log(`Task: ${confirmation.task_id}`);
    }
    if (confirmation.trace_id) {
      console.log(`Trace: ${hallowPath(context.home, "traces", `${confirmation.trace_id}.yaml`)}`);
    }
    if (confirmation.output_path) {
      console.log(`Output: ${confirmation.output_path}`);
    }
    if (confirmation.memory_id) {
      console.log(`Memory: ${confirmation.memory_id}`);
    }
    if (confirmation.quality_score !== undefined) {
      console.log(`Quality: ${confirmation.quality_score.toFixed(2)}`);
    }
    console.log(confirmation.summary);
    for (const action of confirmation.next_actions) {
      console.log(`- ${action}`);
    }

    if (confirmation.status !== "confirmed" && rest.includes("--strict")) {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "source") {
    const action = rest[0] ?? "list";
    if (action === "add") {
      const id = rest[1];
      const sourcePath = readOption(rest, "--path") ?? rest[2];
      if (!id || !sourcePath) {
        throw new Error("Usage: hallow skill source add <id> --path path [--trust local|signed|untrusted]");
      }

      const trust = readOption(rest, "--trust");
      const mode = readOption(rest, "--mode");
      const source = await context.runtime.addSkillSource(id, sourcePath, {
        trust: trust === "signed" || trust === "untrusted" ? trust : "local",
        install_mode: mode === "linked" ? "linked" : "copy",
        enabled: !rest.includes("--disabled")
      });
      console.log(`${source.id}\t${source.enabled ? "enabled" : "disabled"}\t${source.trust}\t${source.path}`);
      return;
    }

    if (action === "list" || action === "sources") {
      const sources = await context.runtime.listSkillSources();
      for (const source of sources) {
        console.log(`${source.id}\t${source.enabled ? "enabled" : "disabled"}\t${source.trust}\t${source.install_mode}\t${source.path}`);
      }
      return;
    }

    throw new Error("Usage: hallow skill source add <id> --path path | hallow skill source list");
  }

  if (subcommand === "sources") {
    const sources = await context.runtime.listSkillSources();
    for (const source of sources) {
      console.log(`${source.id}\t${source.enabled ? "enabled" : "disabled"}\t${source.trust}\t${source.install_mode}\t${source.path}`);
    }
    return;
  }

  if (subcommand === "hub") {
    printSkillHubReport(await context.runtime.getSkillHubReport({
      query: readOption(rest, "--query") ?? readOption(rest, "-q") ?? rest.filter((value) => !value.startsWith("--")).join(" ")
    }));
    return;
  }

  if (subcommand === "install-hub") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow skill install-hub <skill-id> [--source source-id] [--force]");
    }

    const result = await context.runtime.installSkillFromHub(id, {
      sourceId: readOption(rest, "--source"),
      force: rest.includes("--force")
    });
    console.log(`Skill hub install: ${result.entry.id} from ${result.entry.source_id}`);
    printSkillInstallResult(result.result);
    return;
  }

  if (subcommand === "list" || !subcommand) {
    const skills = await context.runtime.listSkills();
    for (const skill of skills) {
      const internet = skill.permissions.internet ? "internet" : "local";
      console.log(`${skill.id}\t${skill.name}\t${internet}\t${skill.version}`);
    }
    return;
  }

  throw new Error(`Unknown skill command: ${subcommand}`);
}

async function handleMemory(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "add") {
    const content = readOption(rest, "--content") ?? rest.join(" ").trim();
    if (!content) {
      throw new Error('Usage: hallow memory add --content "memory" [--type fact] [--privacy private]');
    }

    const memory = await context.runtime.addMemory({
      content,
      type: readOption(rest, "--type") as MemoryType | undefined,
      scope: readOption(rest, "--scope") as MemoryScope | undefined,
      privacy: readOption(rest, "--privacy") as MemoryPrivacy | undefined,
      confidence: readNumberOption(rest, "--confidence"),
      agentId: readOption(rest, "--agent"),
      skillId: readOption(rest, "--skill"),
      project: readOption(rest, "--project"),
      sourceTraceId: readOption(rest, "--trace"),
      tags: readCsvOption(rest, "--tags")
    });
    console.log(`Memory added: ${memory.id}`);
    console.log(`${memory.type}\t${memory.privacy}\t${memory.confidence.toFixed(2)}\t${oneLine(memory.content)}`);
    return;
  }

  if (subcommand === "suggest") {
    const content = readOption(rest, "--content") ?? readPositionalArgs(rest, [
      "--type",
      "--scope",
      "--privacy",
      "--confidence",
      "--agent",
      "--skill",
      "--project",
      "--trace",
      "--tags",
      "--reason",
      "--proposed-by"
    ]).join(" ").trim();
    if (!content) {
      throw new Error('Usage: hallow memory suggest --content "memory" [--reason "..."]');
    }

    const suggestion = await context.runtime.suggestMemory({
      content,
      type: readOption(rest, "--type") as MemoryType | undefined,
      scope: readOption(rest, "--scope") as MemoryScope | undefined,
      privacy: readOption(rest, "--privacy") as MemoryPrivacy | undefined,
      confidence: readNumberOption(rest, "--confidence"),
      agentId: readOption(rest, "--agent"),
      skillId: readOption(rest, "--skill"),
      project: readOption(rest, "--project"),
      sourceTraceId: readOption(rest, "--trace"),
      tags: readCsvOption(rest, "--tags"),
      reason: readOption(rest, "--reason"),
      proposedBy: readOption(rest, "--proposed-by")
    });
    console.log(`Memory suggestion queued: ${suggestion.id}`);
    printMemorySuggestion(suggestion);
    return;
  }

  if (subcommand === "suggestions") {
    const status = (readOption(rest, "--status") ?? "pending") as "pending" | "approved" | "denied" | "all";
    const suggestions = await context.runtime.listMemorySuggestions(status);
    for (const suggestion of suggestions) {
      printMemorySuggestion(suggestion);
    }
    return;
  }

  if (subcommand === "approve") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow memory approve <suggestion_id>");
    }

    const suggestion = await context.runtime.approveMemorySuggestion(id);
    console.log(`Memory suggestion approved: ${suggestion.id}`);
    printMemorySuggestion(suggestion);
    return;
  }

  if (subcommand === "deny") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow memory deny <suggestion_id>");
    }

    const suggestion = await context.runtime.denyMemorySuggestion(id);
    console.log(`Memory suggestion denied: ${suggestion.id}`);
    printMemorySuggestion(suggestion);
    return;
  }

  if (subcommand === "show") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow memory show <id>");
    }

    printMemoryItem(await context.runtime.getMemory(id), true);
    return;
  }

  if (subcommand === "update") {
    const id = rest[0];
    if (!id) {
      throw new Error('Usage: hallow memory update <id> [--content "memory"] [--type fact] [--privacy private]');
    }

    const update = readMemoryUpdate(rest.slice(1));
    if (!hasMemoryUpdate(update)) {
      throw new Error('Usage: hallow memory update <id> [--content "memory"] [--type fact] [--privacy private]');
    }

    const memory = await context.runtime.updateMemory(id, update);
    console.log(`Memory updated: ${memory.id}`);
    printMemoryItem(memory, false);
    return;
  }

  if (subcommand === "delete") {
    const id = rest[0];
    if (!id || !rest.includes("--yes")) {
      throw new Error("Usage: hallow memory delete <id> --yes");
    }

    const result = await context.runtime.deleteMemory(id);
    console.log(`Memory delete ${result.deleted ? "completed" : "skipped"}: ${result.id}`);
    console.log(`SQLite: ${result.database_path}`);
    console.log(`JSONL mirror: ${result.jsonl_path}`);
    console.log(`Markdown: ${result.markdown_path}`);
    return;
  }

  if (subcommand === "rebuild") {
    printMemoryStoreStats(await context.runtime.rebuildMemoryMirrors());
    return;
  }

  if (subcommand === "index") {
    const index = await context.runtime.rebuildMemoryIndex();
    console.log(`Memory index rebuilt: ${Object.keys(index.items).length} item(s)`);
    console.log(`Method: ${index.method}`);
    console.log(`Generated: ${index.generated_at}`);
    return;
  }

  if (subcommand === "tree") {
    const tree = await context.runtime.buildMemoryTree();
    console.log(`Memory tree built: ${tree.item_count} item(s)`);
    console.log(`Tree: ${hallowPath(context.home, "memory", "tree.yaml")}`);
    console.log(`Obsidian vault: ${tree.obsidian_vault_path}`);
    return;
  }

  if (subcommand === "list" || !subcommand) {
    const memories = await context.runtime.listMemory({
      type: readOption(rest, "--type") as MemoryType | undefined,
      scope: readOption(rest, "--scope") as MemoryScope | undefined,
      privacy: readOption(rest, "--privacy") as MemoryPrivacy | undefined,
      limit: readNumberOption(rest, "--limit")
    });
    for (const memory of memories) {
      console.log(
        `${memory.id}\t${memory.type}\t${memory.privacy}\t${memory.confidence.toFixed(2)}\t${oneLine(
          memory.content
        )}`
      );
    }
    return;
  }

  if (subcommand === "search") {
    const query = readOption(rest, "--query") ?? readPositionalArgs(rest, [
      "--type",
      "--scope",
      "--privacy",
      "--limit"
    ]).join(" ").trim();
    if (!query) {
      throw new Error('Usage: hallow memory search "query"');
    }

    const memories = await context.runtime.searchMemory(query, {
      type: readOption(rest, "--type") as MemoryType | undefined,
      scope: readOption(rest, "--scope") as MemoryScope | undefined,
      privacy: readOption(rest, "--privacy") as MemoryPrivacy | undefined,
      limit: readNumberOption(rest, "--limit")
    });
    for (const memory of memories) {
      console.log(
        `${memory.id}\t${memory.type}\t${memory.privacy}\t${memory.confidence.toFixed(2)}\t${oneLine(
          memory.content
        )}`
      );
    }
    return;
  }

  if (subcommand === "export") {
    const path = readOption(rest, "--path");
    if (rest.includes("--obsidian")) {
      const output = await context.runtime.exportObsidianVault();
      console.log(`Obsidian memory vault exported: ${output.vault_path}`);
      console.log(`Index: ${output.index_path}`);
      console.log(`Items: ${output.item_paths.length}`);
      return;
    }

    const output = await context.runtime.exportMemoryMarkdown(path);
    console.log(`Memory exported: ${output}`);
    return;
  }

  if (subcommand === "stats") {
    printMemoryStoreStats(await context.runtime.getMemoryStoreStats());
    return;
  }

  throw new Error(`Unknown memory command: ${subcommand}`);
}

async function handleMcp(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "add") {
    const name = rest[0];
    if (!name) {
      throw new Error("Usage: hallow mcp add <name> [--command npx --args a,b] [--url https://...] [--include tool_a,tool_b]");
    }

    const server = await context.runtime.addMcpServer({
      name,
      command: readOption(rest, "--command"),
      args: readCsvOption(rest, "--args"),
      url: readOption(rest, "--url"),
      enabled: readFlagOverride(rest, "--enabled", "--disabled"),
      include: readCsvOption(rest, "--include"),
      exclude: readCsvOption(rest, "--exclude"),
      timeoutSeconds: readNumberOption(rest, "--timeout"),
      supportsParallelToolCalls: rest.includes("--parallel")
    });
    printMcpServer(server);
    return;
  }

  if (subcommand === "discover" || subcommand === "refresh") {
    const report = await context.runtime.discoverMcpTools();
    printMcpDiscovery(report);
    return;
  }

  if (subcommand === "serve") {
    await serveHallowMcp(context);
    return;
  }

  if (subcommand === "probe") {
    const name = rest[0];
    if (!name) {
      throw new Error("Usage: hallow mcp probe <server>");
    }

    const report = await context.runtime.probeMcpServer(name);
    printMcpProbeReport(report);
    if (!report.ok) {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "call") {
    const server = rest[0];
    const tool = rest[1];
    if (!server || !tool) {
      throw new Error('Usage: hallow mcp call <server> <tool> [--json "{\\"path\\":\\"README.md\\"}"]');
    }

    const result = await context.runtime.callMcpTool(server, tool, readMcpCallArgs(rest));
    printMcpToolCallReport(result);
    if (!result.ok) {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "list" || !subcommand) {
    const servers = await context.runtime.listMcpServers();
    for (const server of servers) {
      printMcpServer(server);
    }
    if (servers.length === 0) {
      console.log("No MCP servers configured.");
    }
    return;
  }

  throw new Error(`Unknown mcp command: ${subcommand}`);
}

async function handleBrowser(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "observe" || subcommand === "snapshot") {
    const url = readOption(rest, "--url") ?? rest[0];
    if (!url) {
      throw new Error("Usage: hallow browser observe --url https://example.com");
    }

    const observation = await context.runtime.observeBrowserUrl(url, {
      maxChars: readNumberOption(rest, "--max-chars")
    });
    printBrowserObservation(observation);
    return;
  }

  if (subcommand === "session" || subcommand === "cdp") {
    const url = readOption(rest, "--url") ?? rest[0];
    if (!url) {
      throw new Error("Usage: hallow browser session --url https://example.com [--cdp http://127.0.0.1:9222]");
    }

    const session = await context.runtime.runBrowserSession(url, {
      cdpUrl: readOption(rest, "--cdp") ?? readOption(rest, "--cdp-url"),
      waitMs: readNumberOption(rest, "--wait-ms"),
      screenshot: !rest.includes("--no-screenshot"),
      maxHtmlChars: readNumberOption(rest, "--max-html-chars"),
      autoLaunch: rest.includes("--launch") || rest.includes("--auto-launch"),
      browserPath: readOption(rest, "--browser-path"),
      headless: !rest.includes("--headed"),
      port: readNumberOption(rest, "--port"),
      profilePath: readOption(rest, "--profile")
    });
    printBrowserSession(session);
    return;
  }

  if (subcommand === "launch-command") {
    const port = readNumberOption(rest, "--port") ?? 9222;
    const profile = readOption(rest, "--profile") ?? hallowPath(context.home, "browser-profile");
    const command = createBrowserDebugCommand(port, profile);
    console.log(command);
    return;
  }

  throw new Error(`Unknown browser command: ${subcommand}`);
}

async function handleWebAuth(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (!subcommand || subcommand === "status") {
    printWebAuthStatus(await context.runtime.getWebAuthStatus(rest[0]));
    return;
  }

  if (subcommand === "providers" || subcommand === "list") {
    const providers = await context.runtime.listWebAuthProviders();
    for (const provider of providers) {
      printWebAuthProvider(provider);
    }
    return;
  }

  if (subcommand === "policy") {
    const report = await context.runtime.getWebAuthStatus();
    console.log("Web auth policy:");
    console.log(`cookie_export=${report.policy.cookie_export}`);
    console.log(`token_extraction=${report.policy.token_extraction}`);
    console.log(`password_capture=${report.policy.password_capture}`);
    console.log(`manual_login_required=${report.policy.manual_login_required}`);
    console.log(`origin_allowlist_required=${report.policy.origin_allowlist_required}`);
    console.log(`audit_artifacts=${report.policy.audit_artifacts}`);
    return;
  }

  if (subcommand === "login" || subcommand === "signin") {
    const provider = rest[0];
    if (!provider) {
      throw new Error("Usage: hallow web-auth login <provider> [--port 9230] [--browser-path path] [--headless] [--attach-existing]");
    }

    printWebAuthLaunch(await context.runtime.launchWebAuthLogin(provider, {
      browserPath: readOption(rest, "--browser-path"),
      port: readNumberOption(rest, "--port"),
      headless: rest.includes("--headless"),
      attachExisting: rest.includes("--attach-existing")
    }));
    return;
  }

  if (subcommand === "open") {
    const provider = rest[0];
    if (!provider) {
      throw new Error("Usage: hallow web-auth open <provider> [--port 9230] [--browser-path path] [--headless] [--attach-existing]");
    }

    printWebAuthLaunch(await context.runtime.openWebAuthProvider(provider, {
      browserPath: readOption(rest, "--browser-path"),
      port: readNumberOption(rest, "--port"),
      headless: rest.includes("--headless"),
      attachExisting: rest.includes("--attach-existing")
    }));
    return;
  }

  if (subcommand === "configure") {
    const provider = rest[0];
    if (!provider) {
      throw new Error("Usage: hallow web-auth configure <provider> --login-url https://... [--home-url https://...] [--origin https://site]");
    }

    const configured = await context.runtime.configureWebAuthProvider(provider, {
      displayName: readOption(rest, "--name"),
      login_url: readOption(rest, "--login-url"),
      home_url: readOption(rest, "--home-url"),
      allowedOrigins: readCsvOption(rest, "--origins") ?? readCsvOption(rest, "--origin"),
      profile_path: readOption(rest, "--profile"),
      cdp_port: readNumberOption(rest, "--port"),
      enabled: readFlagOverride(rest, "--enabled", "--disabled"),
      notes: readOption(rest, "--notes")
    });
    printWebAuthProvider(configured);
    return;
  }

  throw new Error(`Unknown web-auth command: ${subcommand}`);
}

type CliJsonRpcMessage = {
  jsonrpc?: string;
  id?: number | string;
  method?: string;
  params?: unknown;
};

async function serveHallowMcp(context: CommandContext): Promise<void> {
  await context.runtime.init();
  process.stdin.setEncoding("utf8");
  let buffer = "";
  let queue = Promise.resolve();

  process.stdin.on("data", (chunk: string) => {
    buffer += chunk;
    const parsed = extractCliJsonRpcMessages(buffer);
    buffer = parsed.rest;
    for (const message of parsed.messages) {
      queue = queue.then(() => handleHallowMcpMessage(context, message));
    }
  });

  await new Promise<void>((resolveServer) => {
    process.stdin.on("end", () => {
      queue.finally(resolveServer);
    });
  });
}

async function handleHallowMcpMessage(context: CommandContext, message: CliJsonRpcMessage): Promise<void> {
  if (message.method === "notifications/initialized") {
    return;
  }

  if (message.id === undefined) {
    return;
  }

  try {
    if (message.method === "initialize") {
      writeMcpResponse(message.id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: "hallow",
          version: "0.0.1"
        }
      });
      return;
    }

    if (message.method === "tools/list") {
      writeMcpResponse(message.id, {
        tools: createHallowMcpTools()
      });
      return;
    }

    if (message.method === "tools/call") {
      const params = cliRecordValue(message.params) ?? {};
      const name = cliStringValue(params.name);
      const args = cliRecordValue(params.arguments) ?? {};
      if (!name) {
        writeMcpError(message.id, -32602, "tools/call requires a tool name.");
        return;
      }

      const result = await callHallowMcpTool(context, name, args);
      writeMcpResponse(message.id, {
        content: [
          {
            type: "text",
            text: typeof result === "string" ? result : JSON.stringify(result, null, 2)
          }
        ],
        structuredContent: result
      });
      return;
    }

    writeMcpError(message.id, -32601, `Unknown MCP method: ${message.method ?? "(missing)"}`);
  } catch (error) {
    writeMcpError(message.id, -32000, error instanceof Error ? error.message : String(error));
  }
}

function createHallowMcpTools(): Array<Record<string, unknown>> {
  return [
    {
      name: "hallow_readiness",
      description: "Return Hallow local runtime readiness.",
      inputSchema: {
        type: "object",
        properties: {}
      }
    },
    {
      name: "hallow_memory_search",
      description: "Search local Hallow memory.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number" }
        },
        required: ["query"]
      }
    },
    {
      name: "hallow_marketplace_search",
      description: "Search signed Hallow marketplace packages.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          type: { type: "string", enum: ["agent", "skill"] },
          limit: { type: "number" }
        }
      }
    },
    {
      name: "hallow_oauth_status",
      description: "Return OAuth connector and local token vault status.",
      inputSchema: {
        type: "object",
        properties: {}
      }
    },
    {
      name: "hallow_web_auth_status",
      description: "Return dedicated web-login browser profile status.",
      inputSchema: {
        type: "object",
        properties: {
          provider: { type: "string" }
        }
      }
    },
    {
      name: "hallow_perfect_build_status",
      description: "Return the Hallow perfect-build checklist and percentage.",
      inputSchema: {
        type: "object",
        properties: {}
      }
    },
    {
      name: "hallow_embedding_status",
      description: "Return local embedding/vector provider status.",
      inputSchema: {
        type: "object",
        properties: {}
      }
    },
    {
      name: "hallow_security_audit",
      description: "Run Hallow security audit.",
      inputSchema: {
        type: "object",
        properties: {}
      }
    },
    {
      name: "hallow_browser_observe",
      description: "Create a local browser observation artifact for a URL.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string" },
          maxChars: { type: "number" }
        },
        required: ["url"]
      }
    },
    {
      name: "hallow_sandbox_smoke",
      description: "Run a safe sandbox smoke command and return the artifact.",
      inputSchema: {
        type: "object",
        properties: {}
      }
    }
  ];
}

async function callHallowMcpTool(
  context: CommandContext,
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  if (name === "hallow_readiness") {
    return context.runtime.getReadinessReport();
  }

  if (name === "hallow_memory_search") {
    const query = cliStringValue(args.query);
    if (!query) {
      throw new Error("hallow_memory_search requires query.");
    }

    return {
      memory: await context.runtime.searchMemory(query, {
        limit: typeof args.limit === "number" ? args.limit : 10
      })
    };
  }

  if (name === "hallow_marketplace_search") {
    const type = cliStringValue(args.type);
    return {
      results: await context.runtime.searchMarketplace(cliStringValue(args.query) ?? "", {
        type: type === "agent" || type === "skill" ? type : undefined,
        limit: typeof args.limit === "number" ? args.limit : 10
      })
    };
  }

  if (name === "hallow_oauth_status") {
    return context.runtime.getOAuthStatus();
  }

  if (name === "hallow_web_auth_status") {
    return context.runtime.getWebAuthStatus(cliStringValue(args.provider));
  }

  if (name === "hallow_perfect_build_status") {
    return context.runtime.getPerfectBuildReport();
  }

  if (name === "hallow_embedding_status") {
    return context.runtime.getEmbeddingStatus();
  }

  if (name === "hallow_security_audit") {
    return context.runtime.runSecurityAudit({ write: false });
  }

  if (name === "hallow_browser_observe") {
    const url = cliStringValue(args.url);
    if (!url) {
      throw new Error("hallow_browser_observe requires url.");
    }

    return context.runtime.observeBrowserUrl(url, {
      maxChars: typeof args.maxChars === "number" ? args.maxChars : 2000
    });
  }

  if (name === "hallow_sandbox_smoke") {
    return context.runtime.runSandboxSmoke();
  }

  throw new Error(`Unknown Hallow MCP tool: ${name}`);
}

function writeMcpResponse(id: number | string, result: unknown): void {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function writeMcpError(id: number | string, code: number, message: string): void {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}

function extractCliJsonRpcMessages(buffer: string): { messages: CliJsonRpcMessage[]; rest: string } {
  const messages: CliJsonRpcMessage[] = [];
  let rest = buffer;

  while (rest.length > 0) {
    if (/^Content-Length:/i.test(rest)) {
      const headerEnd = rest.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        break;
      }

      const match = rest.slice(0, headerEnd).match(/Content-Length:\s*(\d+)/i);
      const length = match ? Number(match[1]) : Number.NaN;
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + length;
      if (!Number.isFinite(length) || rest.length < bodyEnd) {
        break;
      }

      const parsed = parseCliJsonRpcMessage(rest.slice(bodyStart, bodyEnd));
      if (parsed) {
        messages.push(parsed);
      }
      rest = rest.slice(bodyEnd);
      continue;
    }

    const newline = rest.indexOf("\n");
    if (newline === -1) {
      break;
    }

    const line = rest.slice(0, newline).trim();
    rest = rest.slice(newline + 1);
    if (!line) {
      continue;
    }

    const parsed = parseCliJsonRpcMessage(line);
    if (parsed) {
      messages.push(parsed);
    }
  }

  return {
    messages,
    rest
  };
}

function parseCliJsonRpcMessage(value: string): CliJsonRpcMessage | undefined {
  try {
    const parsed = JSON.parse(value) as unknown;
    return cliRecordValue(parsed) ? (parsed as CliJsonRpcMessage) : undefined;
  } catch {
    return undefined;
  }
}

function cliRecordValue(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function cliStringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function handleTool(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "list" || !subcommand) {
    const tools = await context.runtime.listTools();
    for (const [id, tool] of Object.entries(tools)) {
      console.log(`${id}\t${tool.enabled ? "enabled" : "disabled"}\t${tool.risk}\t${tool.approval}`);
    }
    return;
  }

  if (subcommand === "check") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow tool check <tool-id> [--target target]");
    }

    const decision = await context.runtime.checkTool(id, readOption(rest, "--target") ?? "");
    console.log(`${decision.allowed ? "ALLOW" : decision.approval_required ? "ASK" : "DENY"} ${decision.tool}`);
    console.log(`Risk: ${decision.risk}`);
    console.log(`Reason: ${decision.reason}`);
    return;
  }

  if (subcommand === "read") {
    const path = readOption(rest, "--path") ?? rest[0];
    if (!path) {
      throw new Error("Usage: hallow tool read --path relative/file.txt");
    }

    const result = await context.runtime.readWorkspaceFile(path);
    console.log(`${result.status.toUpperCase()} ${result.tool}`);
    console.log(`Target: ${result.target}`);
    console.log(result.message);
    if (result.content !== undefined) {
      console.log("");
      console.log(result.content);
    }
    if (result.status !== "success") {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "write") {
    const path = readOption(rest, "--path") ?? rest[0];
    const content = readOption(rest, "--content");
    if (!path || content === undefined) {
      throw new Error('Usage: hallow tool write --path relative/file.txt --content "text" [--approval approval_id]');
    }

    const result = await context.runtime.writeWorkspaceFile(path, content, {
      approvalId: readOption(rest, "--approval")
    });
    console.log(`${result.status.toUpperCase()} ${result.tool}`);
    console.log(`Target: ${result.target}`);
    console.log(result.message);
    if (result.approval) {
      console.log(`Approval: ${result.approval.id} (${result.approval.status})`);
    }
    if (result.output_path) {
      console.log(`Output: ${result.output_path}`);
    }
    if (result.status === "denied") {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "fetch") {
    const url = readOption(rest, "--url") ?? rest[0];
    if (!url) {
      throw new Error("Usage: hallow tool fetch --url https://example.com [--save path.md] [--approval id]");
    }

    const result = await context.runtime.fetchWebUrl(url, {
      savePath: readOption(rest, "--save"),
      approvalId: readOption(rest, "--approval"),
      maxChars: readNumberOption(rest, "--max-chars")
    });
    console.log(`${result.status.toUpperCase()} ${result.tool}`);
    console.log(`URL: ${result.url}`);
    if (result.status_code !== undefined) {
      console.log(`HTTP: ${result.status_code}`);
    }
    if (result.title) {
      console.log(`Title: ${result.title}`);
    }
    if (result.memory_id) {
      console.log(`Memory: ${result.memory_id}`);
    }
    console.log(result.message);
    if (result.save) {
      console.log(`Save: ${result.save.status}`);
      if (result.save.approval) {
        console.log(`Approval: ${result.save.approval.id} (${result.save.approval.status})`);
      }
      if (result.save.output_path) {
        console.log(`Output: ${result.save.output_path}`);
      }
    }
    if (!result.save && result.content) {
      console.log("");
      console.log(oneLine(result.content, 1000));
    }
    if (result.status === "denied") {
      process.exitCode = 1;
    }
    return;
  }

  throw new Error(`Unknown tool command: ${subcommand}`);
}

async function handleWorkspace(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "path" || !subcommand) {
    console.log(await context.runtime.getWorkspacePath());
    return;
  }

  if (subcommand === "import") {
    const sourcePath = readOption(rest, "--path") ?? rest[0];
    const destinationPath = readOption(rest, "--as") ?? readOption(rest, "--dest");

    if (!sourcePath) {
      throw new Error("Usage: hallow workspace import <source-file> [--as relative/file.txt]");
    }

    const result = await context.runtime.importWorkspaceFile(sourcePath, destinationPath);
    console.log(`${result.status.toUpperCase()} ${result.tool}`);
    console.log(`Workspace: ${await context.runtime.getWorkspacePath()}`);
    console.log(`Target: ${result.target}`);
    console.log(result.message);
    if (result.output_path) {
      console.log(`Imported: ${result.output_path}`);
    }
    if (result.status !== "success") {
      process.exitCode = 1;
    }
    return;
  }

  throw new Error(`Unknown workspace command: ${subcommand}`);
}

async function handleTask(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "create") {
    const prompt = readOption(rest, "--prompt") ?? rest.join(" ").trim();
    if (!prompt) {
      throw new Error('Usage: hallow task create --prompt "task" [--agent hallow] [--skill skill-id] [--risk R1]');
    }

    const task = await context.runtime.createTask({
      agent: readOption(rest, "--agent"),
      skill: readOption(rest, "--skill"),
      prompt,
      source: "manual",
      risk: readOption(rest, "--risk") as RiskLevel | undefined,
      maxAttempts: readNumberOption(rest, "--max-attempts"),
      retryDelaySeconds: readNumberOption(rest, "--retry-delay-seconds"),
      runAfter: readOption(rest, "--run-after")
    });
    console.log(`Task queued: ${task.id}`);
    console.log(
      `${task.agent}\t${task.status}\tattempts=${task.attempts ?? 0}/${task.max_attempts ?? 1}\t${task.prompt}`
    );
    return;
  }

  if (subcommand === "list" || !subcommand) {
    const status = (readOption(rest, "--status") ?? "all") as
      | "queued"
      | "running"
      | "succeeded"
      | "failed"
      | "cancelled"
      | "all";
    const tasks = await context.runtime.listTasks(status);
    for (const task of tasks) {
      const attempts = `${task.attempts ?? 0}/${task.max_attempts ?? 1}`;
      const nextRun = task.next_run_at ? `\tnext=${task.next_run_at}` : "";
      console.log(`${task.id}\t${task.status}\t${task.agent}\t${task.skill ?? "-"}\t${attempts}${nextRun}\t${oneLine(task.prompt)}`);
    }
    return;
  }

  if (subcommand === "run-due") {
    const results = await context.runtime.runDueTasks({
      limit: readNumberOption(rest, "--limit")
    });
    console.log(`Due tasks completed: ${results.length}`);
    for (const result of results) {
      const attempts = `${result.task.attempts ?? 0}/${result.task.max_attempts ?? 1}`;
      const retry = result.retried ? ` retry=${result.task.next_run_at ?? "-"}` : "";
      console.log(`${result.task.id}\t${result.task.status}\t${attempts}${retry}`);
    }
    return;
  }

  if (subcommand === "run") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow task run <id>");
    }

    const result = await context.runtime.runTask(id);
    console.log(`Task ${result.task.status}: ${result.task.id}`);
    if (result.run) {
      console.log(`Output: ${result.run.outputPath}`);
      console.log(`Trace: ${hallowPath(context.home, "traces", `${result.run.trace.id}.yaml`)}`);
    }
    if (result.task.error) {
      console.log(`Error: ${result.task.error}`);
    }
    if (result.retried && result.task.next_run_at) {
      console.log(`Retry queued: ${result.task.next_run_at}`);
    }
    return;
  }

  if (subcommand === "cancel") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow task cancel <id>");
    }

    const task = await context.runtime.cancelTask(id);
    console.log(`Task cancelled: ${task.id}`);
    return;
  }

  throw new Error(`Unknown task command: ${subcommand}`);
}

async function handleSchedule(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "add") {
    const id = rest[0];
    const prompt = readOption(rest, "--prompt") ?? rest.slice(1).join(" ").trim();
    if (!id || !prompt) {
      throw new Error('Usage: hallow schedule add <id> --prompt "task" [--daily 08:00] [--every-minutes 60] [--cron "*/15 * * * *"]');
    }

    const job = await context.runtime.createSchedule({
      id,
      agent: readOption(rest, "--agent"),
      skill: readOption(rest, "--skill"),
      prompt,
      daily: readOption(rest, "--daily"),
      cron: readOption(rest, "--cron"),
      everyMinutes: readNumberOption(rest, "--every-minutes"),
      timezone: readOption(rest, "--timezone")
    });
    console.log(`Schedule saved: ${job.id}`);
    console.log(`${job.agent}\t${job.schedule.type}\t${job.prompt}`);
    return;
  }

  if (subcommand === "list" || !subcommand) {
    const schedules = await context.runtime.listSchedules();
    for (const job of schedules) {
      const cadence =
        job.schedule.type === "daily"
          ? `daily ${job.schedule.time ?? "08:00"}`
          : job.schedule.type === "interval"
            ? `every ${job.schedule.every_minutes ?? 60}m`
            : job.schedule.type === "cron"
              ? `cron ${job.schedule.cron ?? "* * * * *"}`
              : "manual";
      console.log(`${job.id}\t${job.agent}\t${cadence}\t${job.enabled ? "enabled" : "disabled"}`);
    }
    return;
  }

  if (subcommand === "run") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow schedule run <id>");
    }

    const result = await context.runtime.runSchedule(id);
    console.log(`Schedule run complete: ${result.trace.status}`);
    console.log(`Output: ${result.outputPath}`);
    console.log(`Trace: ${hallowPath(context.home, "traces", `${result.trace.id}.yaml`)}`);
    return;
  }

  if (subcommand === "run-due") {
    const nowText = readOption(rest, "--now");
    const now = nowText ? new Date(nowText) : undefined;
    if (nowText && Number.isNaN(now?.getTime())) {
      throw new Error("Invalid --now value. Use an ISO date string.");
    }

    const results = await context.runtime.runDueSchedules(now);
    console.log(`Due schedules completed: ${results.length}`);
    for (const result of results) {
      console.log(`${result.trace.agent_id}\t${result.trace.status}\t${result.outputPath}`);
    }
    return;
  }

  throw new Error(`Unknown schedule command: ${subcommand}`);
}

async function handleAutonomy(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "tick" || !subcommand) {
    const result = await context.runtime.autonomyTick(readAutonomyTickOptions(rest));
    printAutonomyTickResult(result);

    if (result.status !== "success" && rest.includes("--strict")) {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "loop") {
    const result = await context.runtime.autonomyLoop({
      iterations: readNumberOption(rest, "--iterations"),
      intervalSeconds: readNumberOption(rest, "--interval-seconds"),
      forever: rest.includes("--forever"),
      force: rest.includes("--force"),
      tick: readAutonomyTickOptions(rest)
    });
    printAutonomyLoopResult(result);

    if (result.status !== "completed" && rest.includes("--strict")) {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "quality") {
    printQualityReport(await context.runtime.getQualityReport());
    return;
  }

  if (subcommand === "react") {
    const report = await context.runtime.runReactiveTriggers({
      dryRun: rest.includes("--dry-run"),
      limit: readNumberOption(rest, "--limit")
    });
    printReactiveTriggerReport(report);
    return;
  }

  if (subcommand === "heartbeat") {
    const report = await context.runtime.heartbeat({ dryRun: rest.includes("--dry-run") });
    printHeartbeatReport(report);
    return;
  }

  if (subcommand === "heal") {
    const report = await context.runtime.healAutonomy({
      maxRounds: readNumberOption(rest, "--max-rounds"),
      skillId: readOption(rest, "--skill"),
      autoPromote: rest.includes("--auto-promote"),
      confirmPromotions: rest.includes("--confirm-promotions"),
      dryRun: rest.includes("--dry-run")
    });
    printAutonomyHealReport(report);
    if (report.status !== "healthy" && report.status !== "dry_run" && rest.includes("--strict")) {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "stop") {
    const path = await context.runtime.requestAutonomyStop(readOption(rest, "--reason") ?? "CLI stop requested");
    console.log(`Autonomy stop requested: ${path}`);
    return;
  }

  if (subcommand === "clear-stop") {
    await context.runtime.clearAutonomyStop();
    console.log("Autonomy stop flag cleared.");
    return;
  }

  if (subcommand === "clear-lock") {
    await context.runtime.clearAutonomyLoopLock();
    console.log("Autonomy loop lock cleared.");
    return;
  }

  if (subcommand === "loop-status") {
    const state = await context.runtime.readAutonomyLoopState();
    const lock = await context.runtime.readAutonomyLoopLock();
    if (!state && !lock) {
      console.log("No autonomy loop state yet.");
      return;
    }

    if (state) {
      printAutonomyLoopResult(state);
    }

    if (lock) {
      printAutonomyLoopLock(lock, context.runtime.autonomyLoopLockPath);
    } else {
      console.log("Lock: none");
    }
    return;
  }

  if (subcommand === "policy") {
    const action = rest[0] ?? "show";

    if (action === "show" || action === "list") {
      printAutonomyPolicy(await context.runtime.readAutonomyPolicy());
      return;
    }

    if (action === "set") {
      const update = readAutonomyPolicyUpdate(rest.slice(1));
      const policy = await context.runtime.updateAutonomyPolicy(update);
      printAutonomyPolicy(policy);
      return;
    }

    throw new Error("Usage: hallow autonomy policy [show|set]");
  }

  if (subcommand === "enable") {
    printAutonomyPolicy(await context.runtime.updateAutonomyPolicy({ enabled: true }));
    return;
  }

  if (subcommand === "disable") {
    printAutonomyPolicy(await context.runtime.updateAutonomyPolicy({ enabled: false }));
    return;
  }

  throw new Error(`Unknown autonomy command: ${subcommand}`);
}

async function handleSecurity(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "audit" || !subcommand) {
    const report = await context.runtime.runSecurityAudit();
    if (rest.includes("--json")) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printSecurityAuditReport(report);
    }
    if (report.status === "unsafe" && rest.includes("--strict")) {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "sandbox") {
    console.log(JSON.stringify(await context.runtime.readSandboxProfile(), null, 2));
    return;
  }

  if (subcommand === "api-token" || subcommand === "api-auth") {
    const action = rest[0] ?? "status";
    const status = action === "rotate"
      ? await context.runtime.rotateApiToken()
      : await context.runtime.getApiAuthStatus();
    console.log(`API token: ${status.token_exists ? "ready" : "missing"}`);
    console.log(`Path: ${status.token_path}`);
    console.log(`Digest: ${status.token_digest ?? "-"}`);
    console.log(`Header: ${status.header}`);
    console.log(`Bearer supported: ${status.bearer_supported}`);
    console.log(`State-changing requests require token: ${status.state_changing_requests_require_token}`);
    return;
  }

  throw new Error(`Unknown security command: ${subcommand}`);
}

async function handleSandbox(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "status" || subcommand === "profile") {
    const profile = await context.runtime.readSandboxProfile();
    console.log(`Sandbox backend: ${profile.default_terminal_backend}`);
    console.log(`Workspace only: ${profile.filesystem.workspace_only}`);
    console.log(`Allow delete: ${profile.filesystem.allow_delete}`);
    console.log(`Public network: ${profile.network.allow_public_internet}`);
    console.log(`Private network: ${profile.network.allow_private_network}`);
    console.log(`Isolate tools: ${profile.process.isolate_tools}`);
    console.log(`Timeout: ${profile.process.max_runtime_seconds}s`);
    return;
  }

  if (subcommand === "run") {
    const separator = rest.indexOf("--");
    const command = readOption(rest, "--command") ?? rest[0];
    if (!command) {
      throw new Error("Usage: hallow sandbox run <command> -- [args...]");
    }

    const args = readCsvOption(rest, "--args") ?? (separator >= 0 ? rest.slice(separator + 1) : rest.slice(1).filter((value) => !value.startsWith("--")));
    const result = await context.runtime.runSandboxCommand({
      command,
      args,
      cwd: readOption(rest, "--cwd"),
      timeoutSeconds: readNumberOption(rest, "--timeout")
    });
    printSandboxRunResult(result);
    if (result.status !== "success") {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "smoke" || !subcommand) {
    const result = await context.runtime.runSandboxSmoke();
    printSandboxRunResult(result);
    if (result.status !== "success") {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "enable-local") {
    const profile = await context.runtime.enableLocalSandboxBackend();
    console.log(`Sandbox backend: ${profile.default_terminal_backend}`);
    console.log(`Workspace only: ${profile.filesystem.workspace_only}`);
    console.log(`Timeout: ${profile.process.max_runtime_seconds}s`);
    return;
  }

  if (subcommand === "enable-docker") {
    const profile = await context.runtime.enableDockerSandboxBackend();
    console.log(`Sandbox backend: ${profile.default_terminal_backend}`);
    console.log(`Workspace only: ${profile.filesystem.workspace_only}`);
    console.log(`Network public: ${profile.network.allow_public_internet}`);
    console.log(`Network private: ${profile.network.allow_private_network}`);
    console.log(`Isolate tools: ${profile.process.isolate_tools}`);
    console.log("Smoke: hallow sandbox smoke");
    return;
  }

  if (subcommand === "enable-wsl") {
    const profile = await context.runtime.enableWslSandboxBackend();
    console.log(`Sandbox backend: ${profile.default_terminal_backend}`);
    console.log(`Workspace only: ${profile.filesystem.workspace_only}`);
    console.log(`Network private: ${profile.network.allow_private_network}`);
    console.log(`Isolate tools: ${profile.process.isolate_tools}`);
    console.log("Smoke: hallow sandbox smoke");
    return;
  }

  if (subcommand === "enable-node-permission") {
    const profile = await context.runtime.enableNodePermissionSandboxBackend();
    console.log(`Sandbox backend: ${profile.default_terminal_backend}`);
    console.log(`Workspace only: ${profile.filesystem.workspace_only}`);
    console.log(`Allow delete: ${profile.filesystem.allow_delete}`);
    console.log(`Isolate tools: ${profile.process.isolate_tools}`);
    console.log("Smoke: hallow sandbox smoke");
    return;
  }

  throw new Error(`Unknown sandbox command: ${subcommand}`);
}

async function handleGateway(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "status" || !subcommand) {
    printGatewayStatus(await context.runtime.getGatewayStatus());
    return;
  }

  if (subcommand === "channels") {
    const channels = await context.runtime.listGatewayChannels();
    for (const channel of channels) {
      console.log(
        `${channel.id}\t${channel.kind}\t${channel.enabled ? "enabled" : "disabled"}\tallow=${channel.allow_from.join(",") || "-"}\tsend=${channel.external_send}`
      );
    }
    return;
  }

  if (subcommand === "adapters") {
    printGatewayAdapterReport(await context.runtime.getGatewayAdapterReport());
    return;
  }

  if (subcommand === "pair") {
    const channel = rest[0];
    const from = readOption(rest, "--from");
    if (!channel || !from) {
      throw new Error("Usage: hallow gateway pair <channel> --from sender [--label name]");
    }

    const result = await context.runtime.createGatewayPairing({
      channel,
      from,
      label: readOption(rest, "--label")
    });
    console.log(`Gateway pairing: ${result.pairing.id}`);
    console.log(`Channel: ${result.pairing.channel}`);
    console.log(`From: ${result.pairing.from}`);
    console.log(`Digest: ${result.pairing.token_digest}`);
    console.log(`Token: ${result.token}`);
    console.log(`Usage: ${result.usage}`);
    return;
  }

  if (subcommand === "pairings") {
    const pairings = await context.runtime.listGatewayPairings(readOption(rest, "--channel"));
    for (const pairing of pairings) {
      printGatewayPairing(pairing);
    }
    return;
  }

  if (subcommand === "revoke-pairing") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow gateway revoke-pairing <pairing-id>");
    }

    printGatewayPairing(await context.runtime.revokeGatewayPairing(id));
    return;
  }

  if (subcommand === "enable" || subcommand === "disable") {
    const id = rest[0];
    if (!id) {
      throw new Error(`Usage: hallow gateway ${subcommand} <channel>`);
    }
    const channel = await context.runtime.configureGatewayChannel(id, { enabled: subcommand === "enable" });
    console.log(`${channel.id}\t${channel.enabled ? "enabled" : "disabled"}`);
    return;
  }

  if (subcommand === "send-mode") {
    const id = rest[0];
    const mode = readOption(rest, "--send") ?? rest[1];
    if (!id || (mode !== "auto" && mode !== "ask" && mode !== "deny")) {
      throw new Error("Usage: hallow gateway send-mode <channel> --send auto|ask|deny");
    }

    const channel = await context.runtime.configureGatewayChannel(id, { external_send: mode });
    console.log(`${channel.id}\tsend=${channel.external_send}`);
    return;
  }

  if (subcommand === "allow") {
    const id = rest[0];
    const from = readCsvOption(rest, "--from") ?? rest.slice(1).filter((value) => !value.startsWith("--"));
    if (!id || from.length === 0) {
      throw new Error("Usage: hallow gateway allow <channel> --from sender1,sender2");
    }
    const current = (await context.runtime.listGatewayChannels()).find((channel) => channel.id === id);
    const channel = await context.runtime.configureGatewayChannel(id, {
      allow_from: Array.from(new Set([...(current?.allow_from ?? []), ...from]))
    });
    console.log(`${channel.id}\tallow=${channel.allow_from.join(",")}`);
    return;
  }

  if (subcommand === "ingest") {
    const text = readOption(rest, "--text") ?? readPositionalArgs(rest, ["--channel", "--from", "--agent", "--pairing-token"]).join(" ").trim();
    if (!text) {
      throw new Error('Usage: hallow gateway ingest --channel local-webhook --from system --text "message"');
    }
    const event = await context.runtime.ingestGatewayEvent({
      channel: readOption(rest, "--channel") ?? "local-webhook",
      from: readOption(rest, "--from") ?? "system",
      agent: readOption(rest, "--agent"),
      pairingToken: readOption(rest, "--pairing-token"),
      text
    });
    printGatewayEvent(event);
    return;
  }

  if (subcommand === "send") {
    const text = readOption(rest, "--text") ?? readPositionalArgs(rest, ["--channel", "--to", "--approval"]).join(" ").trim();
    if (!text) {
      throw new Error('Usage: hallow gateway send --channel slack --to channel-or-id --text "message" [--dry-run]');
    }

    printGatewayOutbound(await context.runtime.sendGatewayMessage({
      channel: readOption(rest, "--channel") ?? rest[0] ?? "web",
      to: readOption(rest, "--to"),
      text,
      dryRun: rest.includes("--dry-run"),
      approvalId: readOption(rest, "--approval")
    }));
    return;
  }

  if (subcommand === "inbox") {
    const events = await context.runtime.listGatewayInbox(readNumberOption(rest, "--limit") ?? 20);
    for (const event of events) {
      printGatewayEvent(event);
    }
    return;
  }

  if (subcommand === "outbox") {
    const messages = await context.runtime.listGatewayOutbox(readNumberOption(rest, "--limit") ?? 20);
    for (const message of messages) {
      printGatewayOutbound(message);
    }
    return;
  }

  throw new Error(`Unknown gateway command: ${subcommand}`);
}

async function handleMarketplace(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "sign") {
    const type = rest.includes("--agent") ? "agent" : rest.includes("--skill") ? "skill" : (readOption(rest, "--type") as "agent" | "skill" | undefined);
    const path = readOption(rest, "--path") ?? rest.find((value) => !value.startsWith("--") && value !== "agent" && value !== "skill");
    if ((type !== "agent" && type !== "skill") || !path) {
      throw new Error("Usage: hallow marketplace sign --type agent|skill --path package/path");
    }
    printMarketplaceSignature(await context.runtime.signMarketplacePackage(type, path));
    return;
  }

  if (subcommand === "verify") {
    const path = readOption(rest, "--path") ?? rest[0];
    if (!path) {
      throw new Error("Usage: hallow marketplace verify --path package/path");
    }
    const result = await context.runtime.verifyMarketplaceSignature(path);
    console.log(`${result.ok ? "OK" : "FAIL"} ${result.detail}`);
    if (result.signature) {
      printMarketplaceSignature(result.signature);
    }
    if (result.expected_digest && result.actual_digest) {
      console.log(`Expected: ${result.expected_digest}`);
      console.log(`Actual:   ${result.actual_digest}`);
    }
    if (result.cryptographic !== undefined) {
      console.log(`Cryptographic: ${result.cryptographic ? "verified" : "failed"}`);
    }
    if (!result.ok) {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "export" || subcommand === "publish") {
    const bundle = await context.runtime.exportMarketplaceRegistry(readOption(rest, "--path"));
    printMarketplaceRegistry(bundle);
    return;
  }

  if (subcommand === "registry") {
    printMarketplaceRegistry(await context.runtime.getMarketplaceRegistryBundle());
    return;
  }

  if (subcommand === "search" || subcommand === "find") {
    const query = readOption(rest, "--query") ?? readPositionalArgs(rest, ["--type", "--limit"]).join(" ").trim();
    const results = await context.runtime.searchMarketplace(query, {
      type: readOption(rest, "--type") as "agent" | "skill" | undefined,
      limit: readNumberOption(rest, "--limit")
    });
    for (const result of results) {
      printMarketplaceSearchResult(result);
    }
    if (results.length === 0) {
      console.log("No marketplace packages matched.");
    }
    return;
  }

  if (subcommand === "install") {
    const ref = readOption(rest, "--package") ?? readOption(rest, "--ref") ?? rest[0];
    if (!ref) {
      throw new Error("Usage: hallow marketplace install <agent:id|skill:id> [--force]");
    }

    printMarketplaceInstall(await context.runtime.installMarketplacePackage(ref, {
      type: readOption(rest, "--type") as "agent" | "skill" | undefined,
      force: rest.includes("--force")
    }));
    return;
  }

  if (subcommand === "serve") {
    const port = readNumberOption(rest, "--port");
    console.log("Marketplace API endpoints: /api/marketplace/registry /api/marketplace/search /api/marketplace/install");
    await context.runtime.startLocalApi(port);
    return;
  }

  if (subcommand === "list" || !subcommand) {
    const index = await context.runtime.readMarketplaceIndex();
    for (const [id, signature] of Object.entries(index.packages)) {
      console.log(`${id}\t${signature.digest}\t${signature.signed_at}`);
    }
    return;
  }

  throw new Error(`Unknown marketplace command: ${subcommand}`);
}

async function handleIntegration(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "autofetch" || subcommand === "fetch") {
    const [action = "run", ...args] = rest;

    if (action === "run") {
      const url = readOption(args, "--url") ?? args[0];
      if (!url) {
        throw new Error("Usage: hallow integration autofetch run --url https://...");
      }

      const result = await context.runtime.fetchWebUrl(url, {
        savePath: readOption(args, "--save"),
        maxChars: readNumberOption(args, "--max-chars")
      });
      console.log(`Autofetch ${result.status}: ${result.url}`);
      console.log(result.message);
      if (result.title) {
        console.log(`Title: ${result.title}`);
      }
      if (result.memory_id) {
        console.log(`Memory: ${result.memory_id}`);
      }
      if (result.save?.output_path) {
        console.log(`Saved: ${result.save.output_path}`);
      }
      if (result.status !== "success") {
        process.exitCode = 1;
      }
      return;
    }

    if (action === "add") {
      const id = args[0];
      const url = readOption(args, "--url") ?? args[1];
      if (!id || !url) {
        throw new Error("Usage: hallow integration autofetch add <id> --url https://... [--every-minutes 60]");
      }

      const job = await context.runtime.createSchedule({
        id: `autofetch-${id}`,
        agent: "hallow",
        prompt: `Auto-fetch watched source into memory: ${url}`,
        everyMinutes: readNumberOption(args, "--every-minutes") ?? 60
      });
      console.log(`Autofetch schedule: ${job.id}`);
      console.log(`Prompt: ${job.prompt}`);
      console.log(`Every minutes: ${job.schedule.every_minutes ?? "-"}`);
      return;
    }

    throw new Error("Usage: hallow integration autofetch run|add");
  }

  if (subcommand !== "oauth" && subcommand !== "oauth2" && subcommand !== "auth") {
    throw new Error("Usage: hallow integration oauth status|connectors|auth|callback|store-token|configure | hallow integration autofetch run|add");
  }

  const [action, ...args] = rest;
  if (!action || action === "status") {
    printOAuthStatus(await context.runtime.getOAuthStatus());
    return;
  }

  if (action === "init") {
    printOAuthStatus(await context.runtime.getOAuthStatus());
    return;
  }

  if (action === "connectors" || action === "list") {
    const connectors = await context.runtime.listOAuthConnectors();
    for (const connector of connectors) {
      printOAuthConnector(connector);
    }
    return;
  }

  if (action === "configure") {
    const id = args[0];
    if (!id) {
      throw new Error("Usage: hallow integration oauth configure <id> [--provider github|google|slack|notion|microsoft|custom]");
    }

    const connector = await context.runtime.configureOAuthConnector(id, {
      provider: readOption(args, "--provider") as OAuthConnectorProvider | undefined,
      displayName: readOption(args, "--name"),
      auth_url: readOption(args, "--auth-url"),
      token_url: readOption(args, "--token-url"),
      redirect_uri: readOption(args, "--redirect-uri"),
      scopes: readCsvOption(args, "--scopes") ?? readCsvOption(args, "--scope"),
      client_id_env: readOption(args, "--client-id-env"),
      client_secret_env: readOption(args, "--client-secret-env"),
      pkce: readBooleanOption(args, "--pkce"),
      enabled: readFlagOverride(args, "--enabled", "--disabled")
    });
    printOAuthConnector(connector);
    return;
  }

  if (action === "auth" || action === "authorize") {
    const connector = args[0];
    if (!connector) {
      throw new Error("Usage: hallow integration oauth auth <connector> [--scope a,b]");
    }

    const grant = await context.runtime.createOAuthGrant(connector, {
      scopes: readCsvOption(args, "--scopes") ?? readCsvOption(args, "--scope"),
      redirectUri: readOption(args, "--redirect-uri")
    });
    printOAuthGrant(grant);
    return;
  }

  if (action === "callback") {
    const state = readOption(args, "--state") ?? args[0];
    const code = readOption(args, "--code") ?? args[1];
    if (!state || !code) {
      throw new Error("Usage: hallow integration oauth callback --state STATE --code CODE");
    }

    printOAuthGrant(await context.runtime.captureOAuthCallback({ state, code }));
    return;
  }

  if (action === "store-token") {
    const connector = args[0];
    const accessToken = readOption(args, "--access-token");
    if (!connector || !accessToken) {
      throw new Error("Usage: hallow integration oauth store-token <connector> --access-token TOKEN");
    }

    printOAuthToken(await context.runtime.storeOAuthToken(connector, {
      accessToken,
      refreshToken: readOption(args, "--refresh-token"),
      tokenType: readOption(args, "--token-type"),
      expiresIn: readNumberOption(args, "--expires-in"),
      scopes: readCsvOption(args, "--scopes") ?? readCsvOption(args, "--scope")
    }));
    return;
  }

  throw new Error(`Unknown integration oauth command: ${action}`);
}

async function handleFleet(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "spawn") {
    const id = rest[0];
    if (!id) {
      throw new Error('Usage: hallow fleet spawn <agent-id> --purpose "research watcher"');
    }
    const instance = await context.runtime.spawnFleetInstance(id, readOption(rest, "--purpose") ?? rest.slice(1).join(" "));
    console.log(`${instance.id}\t${instance.status}\t${instance.purpose}`);
    return;
  }

  if (subcommand === "list" || !subcommand) {
    const instances = await context.runtime.listFleetInstances();
    for (const instance of instances) {
      console.log(`${instance.id}\t${instance.status}\t${instance.purpose}`);
    }
    return;
  }

  throw new Error(`Unknown fleet command: ${subcommand}`);
}

async function handleApproval(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "create") {
    const action = rest[0];
    const target = readOption(rest, "--target") ?? rest[1];

    if (!action || !target) {
      throw new Error('Usage: hallow approval create <action> --target "target" [--risk R3] [--reason "..."]');
    }

    const approval = await context.runtime.createApproval({
      agent: readOption(rest, "--agent"),
      action,
      target,
      risk: readOption(rest, "--risk") as RiskLevel | undefined,
      reason: readOption(rest, "--reason")
    });
    console.log(`Approval created: ${approval.id}`);
    console.log(`${approval.risk}\t${approval.action}\t${approval.target}`);
    return;
  }

  if (subcommand === "list" || !subcommand) {
    const status = (readOption(rest, "--status") ?? "pending") as "pending" | "approved" | "denied" | "all";
    const approvals = await context.runtime.listApprovals(status);
    for (const approval of approvals) {
      console.log(`${approval.id}\t${approval.status}\t${approval.risk}\t${approval.action}\t${approval.target}`);
    }
    return;
  }

  if (subcommand === "approve" || subcommand === "deny") {
    const id = rest[0];
    if (!id) {
      throw new Error(`Usage: hallow approval ${subcommand} <id>`);
    }

    const approval = await context.runtime.resolveApproval(id, subcommand === "approve" ? "approved" : "denied");
    console.log(`Approval ${approval.status}: ${approval.id}`);
    return;
  }

  throw new Error(`Unknown approval command: ${subcommand}`);
}

async function handleNotification(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "list" || !subcommand) {
    const status = (readOption(rest, "--status") ?? "unread") as NotificationStatus | "all";
    const limit = readNumberOption(rest, "--limit") ?? 20;
    const notifications = await context.runtime.listNotifications(status, limit);
    for (const notification of notifications) {
      printNotification(notification);
    }
    return;
  }

  if (subcommand === "read") {
    const id = rest[0];
    if (!id) {
      throw new Error("Usage: hallow notification read <id>");
    }

    const notification = await context.runtime.markNotificationRead(id);
    console.log(`Notification read: ${notification.id}`);
    return;
  }

  throw new Error(`Unknown notification command: ${subcommand}`);
}

async function handleModel(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "add") {
    const name = rest[0];
    if (!name) {
      throw new Error("Usage: hallow model add <name> [--base-url url] [--api-key-env ENV] [--default-model model]");
    }

    const options: AddProviderOptions = {
      type: readOption(rest, "--type") as AddProviderOptions["type"],
      baseUrl: readOption(rest, "--base-url"),
      apiKeyEnv: readOption(rest, "--api-key-env"),
      defaultModel: readOption(rest, "--default-model")
    };
    const provider = await context.models.addProvider(name, options);
    console.log(`Model provider configured: ${name}`);
    console.log(JSON.stringify(provider, null, 2));
    return;
  }

  if (subcommand === "list" || !subcommand) {
    const providers = await context.models.listProviders();
    for (const [name, provider] of Object.entries(providers)) {
      console.log(`${name}\t${provider.type}\t${provider.default_model ?? ""}\t${provider.base_url ?? ""}`);
    }
    return;
  }

  if (subcommand === "catalog" || subcommand === "models") {
    const catalog = context.models.listCatalog({
      provider: readOption(rest, "--provider"),
      query: readOption(rest, "--query") ?? readOption(rest, "-q") ?? rest.filter((arg) => !arg.startsWith("--")).join(" ")
    });
    console.log(`Model catalog: ${catalog.models.length} model(s), ${catalog.providers.length} provider(s)`);
    if (rest.includes("--providers")) {
      for (const provider of catalog.providers) {
        printModelCatalogProvider(provider);
      }
    } else {
      for (const entry of catalog.models) {
        printModelCatalogEntry(entry);
      }
    }
    return;
  }

  if (subcommand === "install-catalog" || subcommand === "sync-catalog") {
    const providers = readCsvOption(rest, "--providers");
    const result = await context.models.installCatalog({
      providers,
      overwrite: rest.includes("--overwrite")
    });
    console.log(`Model catalog installed: ${result.provider_count} provider(s), ${result.model_count} model preset(s)`);
    console.log(`Installed: ${result.installed.join(",") || "-"}`);
    console.log(`Skipped: ${result.skipped.join(",") || "-"}`);
    return;
  }

  if (subcommand === "routes") {
    const routes = await context.models.readRoutes();
    console.log(`Default route: ${routes.default_route}`);
    for (const [name, route] of Object.entries(routes.routes)) {
      console.log(`route:${name}\tprimary=${route.primary}\tfallback=${route.fallback?.join(",") || "-"}`);
    }
    return;
  }

  if (subcommand === "test") {
    const name = rest[0] ?? "ollama";
    const result = await context.models.testProvider(name);
    console.log(`${result.ok ? "OK" : "FAIL"} ${result.provider}: ${result.message}`);
    if (!result.ok) {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === "health" || subcommand === "status") {
    const health = await context.runtime.getModelHealth({ test: rest.includes("--test") });
    console.log(`Model health: ${health.providers.length} provider(s), default route=${health.default_route}`);

    for (const provider of health.providers) {
      const key =
        provider.key_available === false
          ? `missing ${provider.api_key_env ?? "key"}`
          : provider.api_key_env
            ? `${provider.api_key_env}=set`
            : "local/no key";
      console.log(
        `${provider.name}\t${provider.type}\t${provider.default_model ?? "-"}\t${key}\t${provider.base_url ?? "-"}`
      );
    }

    for (const route of health.routes) {
      console.log(`route:${route.name}\tprimary=${route.primary}\tfallback=${route.fallback.join(",") || "-"}`);
    }

    if (health.tests) {
      for (const test of health.tests) {
        console.log(`${test.ok ? "OK" : "FAIL"} ${test.provider}: ${oneLine(test.message, 140)}`);
      }

      if (health.tests.some((test) => !test.ok)) {
        process.exitCode = 1;
      }
    }
    return;
  }

  throw new Error(`Unknown model command: ${subcommand}`);
}

async function handleEmbedding(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (subcommand === "status" || !subcommand) {
    printEmbeddingStatus(await context.runtime.getEmbeddingStatus());
    return;
  }

  if (subcommand === "list") {
    const providers = await context.runtime.listEmbeddingProviders();
    for (const provider of providers) {
      printEmbeddingProvider(provider);
    }
    return;
  }

  if (subcommand === "configure" || subcommand === "add") {
    const name = rest[0];
    if (!name) {
      throw new Error("Usage: hallow embedding configure <name> [--type openai_compatible|ollama|local_token] [--model model] [--base-url url] [--api-key-env ENV] [--default]");
    }

    const provider = await context.runtime.configureEmbeddingProvider(name, {
      type: readOption(rest, "--type") as EmbeddingProviderType | undefined,
      enabled: !rest.includes("--disabled"),
      model: readOption(rest, "--model"),
      baseUrl: readOption(rest, "--base-url"),
      apiKeyEnv: readOption(rest, "--api-key-env"),
      dimensions: readNumberOption(rest, "--dimensions"),
      batchSize: readNumberOption(rest, "--batch-size"),
      setDefault: rest.includes("--default")
    });
    console.log(`Embedding provider configured: ${provider.name}`);
    printEmbeddingProvider(provider);
    return;
  }

  if (subcommand === "index") {
    const index = await context.runtime.rebuildMemoryIndex();
    console.log(`Embedding index rebuilt: ${Object.keys(index.items).length} item(s)`);
    console.log(`Method: ${index.method}`);
    console.log(`Generated: ${index.generated_at}`);
    printEmbeddingStatus(await context.runtime.getEmbeddingStatus());
    return;
  }

  throw new Error(`Unknown embedding command: ${subcommand}`);
}

async function handleUsage(
  context: CommandContext,
  subcommand: string | undefined,
  rest: string[]
): Promise<void> {
  await context.runtime.init();

  if (!subcommand || subcommand === "report" || subcommand === "status") {
    const report = await context.runtime.getUsageReport(readNumberOption(rest, "--limit") ?? 10);
    console.log(`Usage ledger: ${report.entry_count} entr${report.entry_count === 1 ? "y" : "ies"}`);
    console.log(`Ledger: ${report.ledger_path}`);
    console.log(`Input tokens est: ${report.total_input_tokens_estimate}`);
    console.log(`Output tokens est: ${report.total_output_tokens_estimate}`);
    console.log(`Total tokens est: ${report.total_tokens_estimate}`);
    console.log(`Cost USD est: ${report.total_cost_usd_estimate}`);
    for (const model of report.by_model) {
      console.log(
        `${model.provider}:${model.model}\tcount=${model.count}\ttokens=${model.total_tokens_estimate}\tcost=${model.total_cost_usd_estimate}`
      );
    }
    return;
  }

  if (subcommand === "list") {
    const entries = await context.runtime.listUsageEntries(readNumberOption(rest, "--limit") ?? 20);
    for (const entry of entries) {
      console.log(
        `${entry.created_at}\t${entry.provider}:${entry.model}\t${entry.status}\ttokens=${entry.total_tokens_estimate}\ttrace=${entry.trace_id ?? "-"}`
      );
    }
    return;
  }

  throw new Error("Usage: hallow usage report|list [--limit 20]");
}

async function prepareDemo(context: CommandContext): Promise<void> {
  await context.runtime.init();
  await context.runtime.addMcpServer({
    name: "filesystem",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
    include: ["read_file", "read_text_file", "list_directory", "list_allowed_directories"],
    timeoutSeconds: 45
  });
  await context.runtime.configureGatewayChannel("local-webhook", {
    enabled: true,
    allow_from: ["system", "localhost"],
    require_pairing: true,
    external_send: "ask"
  });
  await context.runtime.addMemory({
    type: "workflow",
    scope: "global",
    content: "Hallow demo mode prepares a local-first autonomous agent OS showcase with MCP, memory, gateway, security, marketplace, and browser observation evidence.",
    confidence: 0.92,
    privacy: "private",
    tags: ["demo", "hallow", "showcase"]
  });
  await context.runtime.signMarketplacePackage("agent", "examples/agents/research-smoke");
  await context.runtime.signMarketplacePackage("skill", "examples/skills/marketplace-smoke");
  await context.runtime.rebuildMemoryIndex();
  await context.runtime.buildMemoryTree();
  await context.runtime.runSecurityAudit();
}

async function setupDemo(
  context: CommandContext,
  options: { liveMcp: boolean; browser: boolean }
): Promise<DemoRunResult> {
  await prepareDemo(context);
  const [readiness, quality, mcp, gateway, security] = await Promise.all([
    context.runtime.getReadinessReport(),
    context.runtime.getQualityReport(),
    context.runtime.discoverMcpTools(),
    context.runtime.getGatewayStatus(),
    context.runtime.runSecurityAudit({ write: false })
  ]);
  const reportPath = hallowPath(context.home, "demo", "DEMO_SETUP.md");
  await writeText(reportPath, createDemoReport({
    mode: "setup",
    readiness,
    quality,
    mcp,
    gateway,
    security,
    options
  }));
  return {
    reportPath,
    readinessScore: readiness.score,
    readinessStatus: readiness.status,
    mcpTools: mcp.servers.reduce((total, server) => total + server.registered_tools.length, 0),
    mcpCallOk: false,
    securityStatus: security.status
  };
}

async function runDemo(
  context: CommandContext,
  options: { liveMcp: boolean; browser: boolean }
): Promise<DemoRunResult> {
  await prepareDemo(context);
  const mcpProbe = options.liveMcp ? await context.runtime.probeMcpServer("filesystem") : undefined;
  const mcpCall = options.liveMcp
    ? await context.runtime.callMcpTool("filesystem", "list_directory", { path: "." })
    : undefined;
  const browserObservation = options.browser
    ? await context.runtime.observeBrowserUrl("https://example.com", { maxChars: 2000 })
    : undefined;
  const gatewayEvent = await context.runtime.ingestGatewayEvent({
    channel: "local-webhook",
    from: "system",
    text: "Demo event: summarize Hallow local agent OS readiness for the operator."
  });
  const heartbeat = await context.runtime.heartbeat({ dryRun: true });
  await context.runtime.rebuildMemoryIndex();
  await context.runtime.buildMemoryTree();
  const [readiness, quality, mcp, gateway, security] = await Promise.all([
    context.runtime.getReadinessReport(),
    context.runtime.getQualityReport(),
    context.runtime.discoverMcpTools(),
    context.runtime.getGatewayStatus(),
    context.runtime.runSecurityAudit({ write: false })
  ]);
  const reportPath = hallowPath(context.home, "demo", "DEMO_REPORT.md");
  await writeText(reportPath, createDemoReport({
    mode: "run",
    readiness,
    quality,
    mcp,
    gateway,
    security,
    mcpProbe,
    mcpCall,
    browserObservation,
    gatewayEvent,
    heartbeat,
    options
  }));
  return {
    reportPath,
    readinessScore: readiness.score,
    readinessStatus: readiness.status,
    mcpTools: mcpProbe?.tools.length ?? mcp.servers.reduce((total, server) => total + server.registered_tools.length, 0),
    mcpCallOk: mcpCall?.ok ?? false,
    browserArtifact: browserObservation?.artifact_path,
    securityStatus: security.status
  };
}

function createDemoReport(input: {
  mode: "setup" | "run";
  readiness: Awaited<ReturnType<HallowRuntime["getReadinessReport"]>>;
  quality: QualityReport;
  mcp: McpDiscoveryReport;
  gateway: GatewayStatus;
  security: SecurityAuditReport;
  mcpProbe?: McpProbeReport;
  mcpCall?: McpToolCallReport;
  browserObservation?: BrowserObservation;
  gatewayEvent?: GatewayInboxEvent;
  heartbeat?: HeartbeatReport;
  options: { liveMcp: boolean; browser: boolean };
}): string {
  const demoComplete =
    input.readiness.score === 100 &&
    input.security.status === "hardened" &&
    (input.mode === "setup" || (!input.options.liveMcp || input.mcpCall?.ok === true)) &&
    (input.mode === "setup" || !input.options.browser || Boolean(input.browserObservation));
  return [
    "# Hallow Demo Report",
    "",
    `Mode: ${input.mode}`,
    `Generated: ${new Date().toISOString()}`,
    `Demo status: ${demoComplete ? "100% demo-ready" : "needs attention"}`,
    "",
    "## Proof",
    "",
    `- Readiness: ${input.readiness.score}% (${input.readiness.status})`,
    `- Doctor checks: ${input.readiness.checks.find((check) => check.id === "runtime_doctor")?.detail ?? "-"}`,
    `- Security: ${input.security.status}`,
    `- MCP configured servers: ${input.mcp.servers.length}`,
    `- MCP live probe tools: ${input.mcpProbe?.tools.length ?? "not run"}`,
    `- MCP live call: ${input.mcpCall ? (input.mcpCall.ok ? "ok" : "failed") : "not run"}`,
    `- Browser observation: ${input.browserObservation?.artifact_path ?? "not run"}`,
    `- Gateway event: ${input.gatewayEvent?.id ?? "not run"}`,
    `- Quality average: ${input.quality.average_trace_quality.toFixed(2)}`,
    `- Gateway: ${input.gateway.enabled_channels}/${input.gateway.total_channels} channel(s) enabled`,
    `- Heartbeat: ${input.heartbeat?.status ?? "not run"}`,
    "",
    "## Demo Commands",
    "",
    "```bash",
    "corepack pnpm hallow --home .hallow-dev demo run",
    "corepack pnpm hallow --home .hallow-dev readiness",
    "corepack pnpm hallow --home .hallow-dev mcp probe filesystem",
    "corepack pnpm hallow --home .hallow-dev mcp call filesystem list_directory --path .",
    "corepack pnpm hallow --home .hallow-dev browser observe --url https://example.com --max-chars 2000",
    "corepack pnpm hallow --home .hallow-dev security audit",
    "```",
    "",
    "## What This Demo Proves",
    "",
    "- Hallow runs locally.",
    "- Memory is local, indexed, tree-built, and Obsidian-exportable.",
    "- MCP is not only config: Hallow can handshake with a real stdio MCP server and call a tool.",
    "- Browser observation creates a local artifact and memory.",
    "- Gateway events can become queued autonomous tasks.",
    "- Security audit, sandbox policy, package signing, and readiness are visible.",
    "",
    "## Still Not Claimed",
    "",
    "- This is not a polished desktop product yet.",
    "- This does not claim real OAuth/channel adapters are complete.",
    "- This does not claim hard sandbox execution for untrusted packages is complete.",
    ""
  ].join("\n");
}

function printDemoRunResult(result: DemoRunResult): void {
  console.log(`Demo ready: ${result.readinessScore}% (${result.readinessStatus})`);
  console.log(`Security: ${result.securityStatus}`);
  console.log(`MCP tools: ${result.mcpTools}`);
  console.log(`MCP call: ${result.mcpCallOk ? "ok" : "not run"}`);
  if (result.browserArtifact) {
    console.log(`Browser artifact: ${result.browserArtifact}`);
  }
  console.log(`Report: ${result.reportPath}`);
}

function printPerfectBuildReport(report: PerfectBuildReport): void {
  console.log(`Hallow perfect build: ${report.score}% (${report.status})`);
  console.log(`Weight: ${report.completed_weight}/${report.total_weight}`);
  for (const check of report.checks) {
    console.log(`${check.ok ? "[x]" : "[ ]"} ${check.id}\t${check.weight}\t${check.detail}`);
  }
  for (const action of report.next_actions) {
    console.log(`- ${action}`);
  }
}

function printEmbeddingStatus(report: EmbeddingStatusReport): void {
  console.log(`Embedding layer: ${report.ready ? "ready" : "needs attention"}`);
  console.log(`Default: ${report.default_provider}`);
  console.log(`Index: ${report.index_method}, ${report.index_items} item(s)`);
  for (const provider of report.providers) {
    printEmbeddingProvider(provider);
  }
  for (const action of report.next_actions) {
    console.log(`- ${action}`);
  }
}

function printEmbeddingProvider(provider: EmbeddingProviderConfig & { active?: boolean; key_available?: boolean; detail?: string }): void {
  const flags = [
    provider.enabled ? "enabled" : "disabled",
    provider.active ? "default" : "",
    provider.key_available === false ? "missing-key" : ""
  ].filter(Boolean);
  console.log(
    `${provider.name}\t${provider.type}\t${provider.model ?? "-"}\t${flags.join(",") || "-"}\t${provider.base_url ?? "-"}`
  );
  if (provider.detail) {
    console.log(`  ${provider.detail}`);
  }
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function readNumberOption(args: string[], name: string): number | undefined {
  const value = readOption(args, name);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readFlagOverride(args: string[], positive: string, negative: string): boolean | undefined {
  if (args.includes(negative)) {
    return false;
  }

  if (args.includes(positive)) {
    return true;
  }

  return undefined;
}

function readBooleanOption(args: string[], name: string): boolean | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    return true;
  }

  if (["1", "true", "yes", "on", "enable", "enabled"].includes(value.toLowerCase())) {
    return true;
  }

  if (["0", "false", "no", "off", "disable", "disabled"].includes(value.toLowerCase())) {
    return false;
  }

  return undefined;
}

function readAutonomyPolicyUpdate(args: string[]): UpdateAutonomyPolicyInput {
  const update: UpdateAutonomyPolicyInput = {};
  const booleanOptions: Array<[keyof UpdateAutonomyPolicyInput, string]> = [
    ["enabled", "--enabled"],
    ["run_schedules", "--run-schedules"],
    ["run_tasks", "--run-tasks"],
    ["improve_skills", "--improve-skills"],
    ["test_skills", "--test-skills"],
    ["auto_promote", "--auto-promote"],
    ["confirm_promotions", "--confirm-promotions"],
    ["dry_run", "--dry-run"]
  ];

  for (const [key, option] of booleanOptions) {
    const value = readBooleanOption(args, option);
    if (value !== undefined) {
      update[key] = value as never;
    }
  }

  const maxSkillTests = readNumberOption(args, "--max-skill-tests");
  if (maxSkillTests !== undefined) {
    update.max_skill_tests_per_tick = maxSkillTests;
  }

  const maxTaskRuns = readNumberOption(args, "--max-task-runs");
  if (maxTaskRuns !== undefined) {
    update.max_task_runs_per_tick = maxTaskRuns;
  }

  const allowedSkills = readCsvOption(args, "--allow-skills");
  if (allowedSkills) {
    update.allowed_skills = allowedSkills;
  }

  const blockedSkills = readCsvOption(args, "--block-skills");
  if (blockedSkills) {
    update.blocked_skills = blockedSkills;
  }

  if (args.includes("--clear-allow-skills")) {
    update.allowed_skills = [];
  }

  if (args.includes("--clear-block-skills")) {
    update.blocked_skills = [];
  }

  return update;
}

function readAutonomyTickOptions(args: string[]): AutonomyTickOptions {
  return {
    runSchedules: readFlagOverride(args, "--schedules", "--no-schedules"),
    runTasks: readFlagOverride(args, "--tasks", "--no-tasks"),
    improveSkills: readFlagOverride(args, "--improve", "--no-improve"),
    testSkills: readFlagOverride(args, "--tests", "--no-tests"),
    autoPromote: readFlagOverride(args, "--auto-promote", "--no-auto-promote"),
    confirmPromotions: readFlagOverride(args, "--confirm-promotions", "--no-confirm-promotions"),
    maxSkillTests: readNumberOption(args, "--max-skill-tests"),
    maxTaskRuns: readNumberOption(args, "--max-task-runs"),
    skillId: readOption(args, "--skill"),
    dryRun: readFlagOverride(args, "--dry-run", "--no-dry-run"),
    ignorePolicy: args.includes("--ignore-policy")
  };
}

function readCsvOption(args: string[], name: string): string[] | undefined {
  const value = readOption(args, name);
  if (!value) {
    return undefined;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readJsonOption(args: string[], name: string): Record<string, unknown> {
  const value = readOption(args, name);
  if (!value) {
    return {};
  }

  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${name} must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
}

function readMcpCallArgs(args: string[]): Record<string, unknown> {
  const json = readOption(args, "--json");
  if (json) {
    return readJsonOption(args, "--json");
  }

  const result: Record<string, unknown> = {};
  const path = readOption(args, "--path");
  if (path) {
    result.path = path;
  }

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== "--arg") {
      continue;
    }

    const pair = args[index + 1] ?? "";
    const separator = pair.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    result[pair.slice(0, separator)] = pair.slice(separator + 1);
    index += 1;
  }

  return result;
}

function readMemoryUpdate(args: string[]): UpdateMemoryInput {
  const update: UpdateMemoryInput = {};
  const content = readOption(args, "--content");
  const tags = readCsvOption(args, "--tags");

  if (content !== undefined) {
    update.content = content;
  }

  if (readOption(args, "--type")) {
    update.type = readOption(args, "--type") as MemoryType;
  }

  if (readOption(args, "--scope")) {
    update.scope = readOption(args, "--scope") as MemoryScope;
  }

  if (readOption(args, "--privacy")) {
    update.privacy = readOption(args, "--privacy") as MemoryPrivacy;
  }

  if (readNumberOption(args, "--confidence") !== undefined) {
    update.confidence = readNumberOption(args, "--confidence");
  }

  if (readOption(args, "--agent") !== undefined) {
    update.agentId = readOption(args, "--agent");
  }

  if (readOption(args, "--skill") !== undefined) {
    update.skillId = readOption(args, "--skill");
  }

  if (readOption(args, "--project") !== undefined) {
    update.project = readOption(args, "--project");
  }

  if (readOption(args, "--trace") !== undefined) {
    update.sourceTraceId = readOption(args, "--trace");
  }

  if (args.includes("--tags")) {
    update.tags = tags ?? [];
  }

  return update;
}

function hasMemoryUpdate(update: UpdateMemoryInput): boolean {
  return Object.values(update).some((value) => value !== undefined);
}

function readPositionalArgs(args: string[], valueOptions: string[]): string[] {
  const values: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current.startsWith("--")) {
      if (valueOptions.includes(current)) {
        index += 1;
      }
      continue;
    }

    values.push(current);
  }

  return values;
}

function oneLine(value: string, maxLength = 96): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 3)}...`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function printOnboardingReport(report: OnboardingReport): void {
  console.log(report.headline);
  for (const step of report.steps) {
    console.log(`${step.ok ? "OK" : "TODO"} ${step.id}\t${step.title}\t${step.detail}`);
    if (!step.ok && step.command) {
      console.log(`  ${step.command}`);
    }
  }
  for (const action of report.next_actions) {
    console.log(`- ${action}`);
  }
}

function printDesktopStatus(status: DesktopShellStatus): void {
  console.log(`Hallow desktop: ${status.ready ? "ready" : "needs setup"}`);
  console.log(`Index: ${status.index_path}`);
  if (status.start_url) {
    console.log(`URL: ${status.start_url}`);
  }
  console.log(
    `Files: manifest=${status.files.manifest ? "ok" : "missing"} index=${status.files.index ? "ok" : "missing"} launchers=${
      status.files.windows_launcher && status.files.unix_launcher ? "ok" : "missing"
    }`
  );
  for (const step of status.steps) {
    console.log(`${step.ok ? "OK" : "TODO"} ${step.id}\t${step.detail}`);
  }
  for (const action of status.next_actions) {
    console.log(`- ${action}`);
  }
}

function formatStartCommand(home: string, port: number): string {
  const parts = ["hallow"];
  if (home !== getHallowHome()) {
    parts.push("--home", quoteCliArg(home));
  }
  parts.push("start");
  if (port !== 4767) {
    parts.push("--port", String(port));
  }
  return parts.join(" ");
}

function quoteCliArg(value: string): string {
  return /^[A-Za-z0-9_./:\\-]+$/.test(value) ? value : JSON.stringify(value);
}

function printModelCatalogProvider(provider: ModelCatalogProvider): void {
  const key = provider.api_key_env ? provider.api_key_env : "local/no-key";
  console.log(`${provider.name}\t${provider.type}\t${provider.default_model ?? "-"}\t${key}\t${provider.base_url ?? "-"}`);
  console.log(`  ${provider.note}`);
}

function printModelCatalogEntry(entry: ModelCatalogEntry): void {
  console.log(
    `${entry.provider}:${entry.model}\t${entry.tier}\t${entry.requires_key ? "key" : "local"}\t${entry.family}\t${entry.label}`
  );
}

function printMcpServer(server: McpServerConfig): void {
  const target = server.transport === "http" ? server.url ?? "-" : `${server.command ?? "-"} ${(server.args ?? []).join(" ")}`.trim();
  const include = server.tools?.include?.join(",") || "*";
  const exclude = server.tools?.exclude?.join(",") || "-";
  console.log(`${server.name}\t${server.transport}\t${server.enabled ? "enabled" : "disabled"}\t${target}\tinclude=${include}\texclude=${exclude}`);
}

function printMcpDiscovery(report: McpDiscoveryReport): void {
  console.log(`MCP discovery: ${report.servers.length} server(s)`);
  for (const server of report.servers) {
    console.log(`${server.name}\t${server.status}\t${server.registered_tools.join(",") || "-"}\t${server.detail}`);
  }
  for (const action of report.next_actions) {
    console.log(`- ${action}`);
  }
}

function printMcpProbeReport(report: McpProbeReport): void {
  console.log(`MCP probe ${report.ok ? "OK" : "FAIL"}: ${report.server} (${report.transport})`);
  if (report.protocol_version) {
    console.log(`Protocol: ${report.protocol_version}`);
  }
  for (const tool of report.tools) {
    console.log(`${tool.name}\t${oneLine(tool.description ?? "no description", 140)}`);
  }
  if (report.error) {
    console.log(`Error: ${report.error}`);
  }
  if (report.stderr?.trim()) {
    console.log(`stderr: ${oneLine(report.stderr, 240)}`);
  }
}

function printMcpToolCallReport(report: McpToolCallReport): void {
  console.log(`MCP call ${report.ok ? "OK" : "FAIL"}: ${report.server}.${report.tool}`);
  if (report.artifact_path) {
    console.log(`Artifact: ${report.artifact_path}`);
  }
  if (report.error) {
    console.log(`Error: ${report.error}`);
  }
  if (report.result !== undefined) {
    console.log(JSON.stringify(report.result, null, 2));
  }
}

function printBrowserObservation(observation: BrowserObservation): void {
  console.log(`Browser observation: ${observation.title}`);
  console.log(`URL: ${observation.url}`);
  console.log(`Status: ${observation.status_code}`);
  console.log(`Artifact: ${observation.artifact_path}`);
  console.log(`Memory: ${observation.memory_id}`);
  console.log(oneLine(observation.summary, 180));
}

function printBrowserSession(session: BrowserSessionReport): void {
  console.log(`Browser CDP session: ${session.title}`);
  console.log(`URL: ${session.url}`);
  console.log(`CDP: ${session.cdp_url}`);
  if (session.launched_browser) {
    console.log(`Launched: ${session.launched_browser.executable_path}`);
    console.log(`Profile: ${session.launched_browser.profile_path}`);
  }
  console.log(`HTML: ${session.html_path}`);
  if (session.screenshot_path) {
    console.log(`Screenshot: ${session.screenshot_path}`);
  }
  console.log(`Artifact: ${session.artifact_path}`);
  console.log(`Memory: ${session.memory_id}`);
  console.log(oneLine(session.summary, 180));
}

function createBrowserDebugCommand(port: number, profile: string): string {
  const chrome = process.platform === "win32" ? "chrome.exe" : "google-chrome";
  return `${chrome} --remote-debugging-port=${port} --user-data-dir="${profile}" --no-first-run --no-default-browser-check`;
}

function printAgentPackageVerification(verification: AgentPackageVerification): void {
  console.log(`Agent package ${verification.ok ? "verified" : "blocked"}: ${verification.source_path}`);
  if (verification.agent) {
    console.log(`Agent: ${verification.agent.id} ${verification.agent.autonomy.level}`);
  }
  console.log(`Manifest: ${verification.manifest_path}`);
  if (verification.soul_path) {
    console.log(`Soul: ${verification.soul_path}`);
  }

  for (const check of verification.checks) {
    console.log(`${check.ok ? "OK" : "FAIL"} ${check.id} - ${check.detail}`);
  }
}

function printAgentInstallResult(result: AgentInstallResult): void {
  console.log(`Agent installed: ${result.agent.id}`);
  console.log(`Source: ${result.source_path}`);
  console.log(`Installed: ${result.installed_path}`);
  console.log(`Replaced: ${result.replaced}`);
  console.log(`Memory: ${result.memory_id}`);
}

function printSkillPackageVerification(verification: SkillPackageVerification): void {
  console.log(`Skill package ${verification.ok ? "verified" : "blocked"}: ${verification.source_path}`);
  if (verification.skill) {
    console.log(`Skill: ${verification.skill.id} ${verification.skill.version}`);
  }
  console.log(`Manifest: ${verification.manifest_path}`);
  if (verification.entry_path) {
    console.log(`Entry: ${verification.entry_path}`);
  }

  for (const check of verification.checks) {
    console.log(`${check.ok ? "OK" : "FAIL"} ${check.id} - ${check.detail}`);
  }
}

function printSkillInstallResult(result: SkillInstallResult): void {
  console.log(`Skill installed: ${result.skill.id}`);
  console.log(`Source: ${result.source_path}`);
  console.log(`Installed: ${result.installed_path}`);
  console.log(`Replaced: ${result.replaced}`);
  console.log(`Memory: ${result.memory_id}`);
}

function printSkillHubReport(report: SkillHubReport): void {
  console.log(`Skill hub: ${report.entries.length} package(s), ${report.sources.length} source(s)`);
  console.log(`Sources: ${report.sources_path}`);
  for (const source of report.sources) {
    console.log(`source:${source.id}\t${source.enabled ? "enabled" : "disabled"}\t${source.trust}\t${source.path}`);
  }
  for (const entry of report.entries) {
    console.log(
      `${entry.installed ? "installed" : "available"}\t${entry.id}\t${entry.version}\t${entry.source_id}\t${entry.trust}\t${entry.source_path}`
    );
  }
  for (const action of report.next_actions) {
    console.log(`- ${action}`);
  }
}

function printMemoryItem(memory: MemoryItem, detailed: boolean): void {
  console.log(`${memory.id}\t${memory.type}\t${memory.privacy}\t${memory.confidence.toFixed(2)}\t${oneLine(memory.content)}`);

  if (!detailed) {
    return;
  }

  console.log(`Scope: ${memory.scope}`);
  console.log(`Agent: ${memory.agent_id ?? "-"}`);
  console.log(`Skill: ${memory.skill_id ?? "-"}`);
  console.log(`Project: ${memory.project ?? "-"}`);
  console.log(`Source trace: ${memory.source_trace_id ?? "-"}`);
  console.log(`Tags: ${memory.tags.length > 0 ? memory.tags.join(",") : "-"}`);
  console.log(`Created: ${memory.created_at}`);
  console.log(`Updated: ${memory.updated_at}`);
  console.log("Content:");
  console.log(memory.content);
}

function printMemorySuggestion(suggestion: MemorySuggestion): void {
  console.log(
    `${suggestion.id}\t${suggestion.status}\t${suggestion.memory.type}\t${suggestion.memory.privacy}\t${suggestion.memory.confidence.toFixed(
      2
    )}\t${oneLine(suggestion.memory.content)}`
  );
  console.log(`Reason: ${suggestion.reason}`);
  console.log(`Proposed by: ${suggestion.proposed_by}`);
  if (suggestion.memory_id) {
    console.log(`Memory: ${suggestion.memory_id}`);
  }
}

function printNotification(notification: NotificationItem): void {
  console.log(
    `${notification.id}\t${notification.status}\t${notification.level}\t${notification.source}\t${oneLine(
      `${notification.title}: ${notification.message}`,
      140
    )}`
  );
}

function printMemoryStoreStats(stats: MemoryStoreStats): void {
  console.log(`Memory backend: ${stats.backend}`);
  console.log(`SQLite: ${stats.database_path}`);
  console.log(`SQLite items: ${stats.sqlite_items}`);
  console.log(`JSONL mirror: ${stats.jsonl_path}`);
  console.log(`JSONL items: ${stats.jsonl_items}`);
  console.log(`Markdown: ${stats.markdown_path}`);
  console.log(`Markdown exists: ${stats.markdown_exists}`);
  console.log(`Index: ${stats.index_path}`);
  console.log(`Index items: ${stats.index_items}`);
  console.log(`Index exists: ${stats.index_exists}`);
}

function printAutonomyPolicy(policy: AutonomyPolicy): void {
  console.log(`Autonomy policy: ${policy.enabled ? "enabled" : "disabled"}`);
  console.log(`run_schedules=${policy.run_schedules}`);
  console.log(`run_tasks=${policy.run_tasks}`);
  console.log(`improve_skills=${policy.improve_skills}`);
  console.log(`test_skills=${policy.test_skills}`);
  console.log(`auto_promote=${policy.auto_promote}`);
  console.log(`confirm_promotions=${policy.confirm_promotions}`);
  console.log(`dry_run=${policy.dry_run}`);
  console.log(`max_skill_tests_per_tick=${policy.max_skill_tests_per_tick}`);
  console.log(`max_task_runs_per_tick=${policy.max_task_runs_per_tick}`);
  console.log(`allowed_skills=${policy.allowed_skills.length > 0 ? policy.allowed_skills.join(",") : "*"}`);
  console.log(`blocked_skills=${policy.blocked_skills.length > 0 ? policy.blocked_skills.join(",") : "-"}`);
  console.log(`updated_at=${policy.updated_at}`);
}

function printAutonomyTickResult(result: AutonomyTickResult): void {
  console.log(`Autonomy tick ${result.status}: ${result.id}`);
  console.log(result.summary);
  console.log(`Report: ${result.report_path}`);
  if (result.memory_id) {
    console.log(`Memory: ${result.memory_id}`);
  }

  for (const task of result.tasks) {
    const retry = task.next_run_at ? ` next=${task.next_run_at}` : "";
    console.log(`Task ${task.task_id}: ${task.status} attempts=${task.attempts}/${task.max_attempts}${retry} - ${task.summary}`);
  }

  for (const schedule of result.schedules) {
    console.log(`Schedule ${schedule.schedule_id}: ${schedule.status} - ${schedule.summary}`);
  }

  for (const skill of result.skills) {
    const review = skill.review_status ? ` review=${skill.review_status}` : "";
    const promotion = skill.promotion_status ? ` promotion=${skill.promotion_status}` : "";
    const confirmation = skill.confirmation_status ? ` confirmation=${skill.confirmation_status}` : "";
    const test = skill.test_passed === undefined ? "" : ` test=${skill.test_passed ? "pass" : "fail"}`;
    console.log(`Skill ${skill.skill_id}: ${skill.status}${test}${review}${promotion}${confirmation} - ${skill.summary}`);
  }

  for (const action of result.next_actions) {
    console.log(`- ${action}`);
  }

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.log(`Error: ${error}`);
    }
  }
}

function printAutonomyLoopResult(result: AutonomyLoopResult): void {
  console.log(`Autonomy loop ${result.status}: ${result.id}`);
  console.log(`Iterations: ${result.iterations_completed}/${result.iterations_requested}`);
  console.log(`Interval: ${result.interval_seconds}s`);
  console.log(`State: ${result.state_path}`);
  console.log(`Stop: ${result.stop_path}`);
  console.log(`Lock: ${result.lock_path}`);
  console.log(`PID: ${result.pid}`);
  console.log(`Heartbeat: ${result.heartbeat_at}`);

  for (const tick of result.ticks) {
    console.log(`Tick ${tick.id}: ${tick.status} - ${tick.summary}`);
  }

  for (const error of result.errors) {
    console.log(`Error: ${error}`);
  }
}

function printAutonomyLoopLock(lock: AutonomyLoopLock, path: string): void {
  console.log(`Lock active: ${lock.loop_id}`);
  console.log(`Lock path: ${path}`);
  console.log(`PID: ${lock.pid}`);
  console.log(`Started: ${lock.started_at}`);
  console.log(`Heartbeat: ${lock.heartbeat_at}`);
}

function printAutonomyHealReport(report: AutonomyHealReport): void {
  console.log(`Autonomy heal ${report.status}: ${report.id}`);
  console.log(`Rounds: ${report.rounds.length}/${report.max_rounds}`);
  console.log(`Report: ${report.report_path}`);
  for (const round of report.rounds) {
    console.log(
      `Round ${round.round}: before=${round.before_unhealthy.join(",") || "-"} after=${round.after_unhealthy.join(",") || "-"} tick=${round.tick_id ?? "-"} ${round.summary}`
    );
  }
  for (const error of report.errors) {
    console.log(`Error: ${error}`);
  }
  for (const action of report.next_actions) {
    console.log(`- ${action}`);
  }
}

function printQualityReport(report: QualityReport): void {
  console.log(`Quality: traces=${report.trace_count} avg=${report.average_trace_quality.toFixed(2)} failed_tasks=${report.failed_task_count}`);
  for (const skill of report.skills) {
    console.log(
      `${skill.skill_id}\t${skill.status}\truns=${skill.total_runs}\tpass=${formatPercent(skill.pass_rate)}\tq=${skill.average_quality_score.toFixed(2)}\t${skill.reason}`
    );
  }
  for (const action of report.next_actions) {
    console.log(`- ${action}`);
  }
}

function printReactiveTriggerReport(report: ReactiveTriggerReport): void {
  console.log(`Reactive triggers: ${report.actions.length} action(s)`);
  for (const action of report.actions) {
    console.log(`${action.id}\t${action.status}\t${action.trigger}\t${action.target}\t${action.summary}`);
    if (action.artifact_path) {
      console.log(`Artifact: ${action.artifact_path}`);
    }
    if (action.error) {
      console.log(`Error: ${action.error}`);
    }
  }
  for (const nextAction of report.next_actions) {
    console.log(`- ${nextAction}`);
  }
}

function printHeartbeatReport(report: HeartbeatReport): void {
  console.log(`Heartbeat: ${report.status}`);
  if (report.notification_id) {
    console.log(`Notification: ${report.notification_id}`);
  }
  printQualityReport(report.quality);
  printReactiveTriggerReport(report.reactive);
}

function printSecurityAuditReport(report: SecurityAuditReport): void {
  console.log(`Security audit: ${report.status}`);
  for (const check of report.checks) {
    console.log(`${check.level.toUpperCase()} ${check.id} - ${check.detail}`);
    if (check.level !== "ok") {
      console.log(`  ${check.recommendation}`);
    }
  }
  for (const action of report.next_actions) {
    console.log(`- ${action}`);
  }
}

function printSandboxRunResult(result: SandboxRunResult): void {
  console.log(`Sandbox ${result.status}: ${result.command} ${result.args.join(" ")}`.trim());
  console.log(`CWD: ${result.cwd}`);
  console.log(`Artifact: ${result.artifact_path}`);
  if (result.exit_code !== undefined) {
    console.log(`Exit: ${result.exit_code}`);
  }
  if (result.reason) {
    console.log(`Reason: ${result.reason}`);
  }
  if (result.stdout.trim()) {
    console.log("stdout:");
    console.log(result.stdout.trim());
  }
  if (result.stderr.trim()) {
    console.log("stderr:");
    console.log(result.stderr.trim());
  }
}

function printGatewayStatus(status: GatewayStatus): void {
  console.log(`Gateway: ${status.enabled_channels}/${status.total_channels} channel(s) enabled, ${status.active_pairings} active pairing(s), ${status.pending_events} queued event(s), ${status.outbound_messages} outbound message(s)`);
  for (const channel of status.channels) {
    console.log(`${channel.id}\t${channel.kind}\t${channel.enabled ? "enabled" : "disabled"}\tallow=${channel.allow_from.join(",") || "-"}\tsend=${channel.external_send}`);
  }
}

function printGatewayPairing(pairing: GatewayPairing): void {
  console.log(
    `${pairing.id}\t${pairing.status}\t${pairing.channel}\tfrom=${pairing.from}\tdigest=${pairing.token_digest}\tlast=${pairing.last_used_at ?? "-"}`
  );
}

function printGatewayAdapterReport(report: GatewayAdapterReport): void {
  console.log(`Gateway adapters: ${report.adapters.length}`);
  for (const adapter of report.adapters) {
    console.log(
      `${adapter.channel}\t${adapter.kind}\t${adapter.enabled ? "enabled" : "disabled"}\t${adapter.configured ? "configured" : "missing-env"}\tsend=${adapter.send_mode}\t${adapter.detail}`
    );
  }
  for (const action of report.next_actions) {
    console.log(`- ${action}`);
  }
}

function printGatewayEvent(event: GatewayInboxEvent): void {
  console.log(`${event.id}\t${event.status}\t${event.channel}\tfrom=${event.from}\t${oneLine(event.text, 120)}`);
  console.log(`Reason: ${event.reason}`);
  if (event.task_id) {
    console.log(`Task: ${event.task_id}`);
  }
}

function printGatewayOutbound(message: GatewayOutboundMessage): void {
  console.log(`${message.id}\t${message.status}\t${message.channel}\tto=${message.to}\t${oneLine(message.text, 120)}`);
  console.log(`Reason: ${message.reason}`);
  if (message.approval_id) {
    console.log(`Approval: ${message.approval_id}`);
  }
  if (message.provider_response) {
    console.log(`Provider: ${oneLine(message.provider_response, 180)}`);
  }
}

function printMarketplaceSignature(signature: MarketplacePackageSignature): void {
  console.log(`${signature.package_type}:${signature.package_id}`);
  console.log(`Digest: ${signature.digest}`);
  console.log(`Signature: ${signature.signature_algorithm ?? "legacy-digest"}`);
  console.log(`Signed: ${signature.signed_at}`);
  console.log(`Source: ${signature.source_path}`);
  console.log(`Claims: ${signature.claims.join(",")}`);
}

function printMarketplaceRegistry(bundle: MarketplaceRegistryBundle): void {
  console.log(`Marketplace registry: ${bundle.package_count} package(s)`);
  console.log(`Source index: ${bundle.source_index_path}`);
  if (bundle.artifact_path) {
    console.log(`Artifact: ${bundle.artifact_path}`);
  }
  for (const record of bundle.packages) {
    console.log(`${record.key}\t${record.digest}\t${record.signed_at}\t${record.source_path}`);
  }
}

function printMarketplaceSearchResult(result: MarketplaceSearchResult): void {
  console.log(`${result.key}\tscore=${result.score}\tmatched=${result.matched_on.join(",") || "-"}\t${result.source_path}`);
  console.log(`  ${result.install_command}`);
}

function printMarketplaceInstall(result: MarketplaceInstallResult): void {
  console.log(`Marketplace install: ${result.installed_type}:${result.package.package_id}`);
  console.log(`Source: ${result.package.source_path}`);
  console.log(`Digest: ${result.package.digest}`);
  console.log(`Installed: ${result.result.installed_path}`);
}

function printOAuthStatus(report: OAuthStatusReport): void {
  console.log(`OAuth pack: ${report.ready ? "ready" : "needs setup"}`);
  console.log(`Connectors: ${report.standard_connector_count}/5 standard, ${report.connector_count} total`);
  console.log(`Tokens: ${report.token_count}; pending grants: ${report.pending_grants}`);
  console.log(`Registry: ${report.registry_path}`);
  console.log(`Vault: ${report.vault_path}`);
  for (const connector of report.connectors) {
    console.log(
      `${connector.id}\t${connector.provider}\t${connector.enabled ? "enabled" : "disabled"}\ttokens=${connector.token_count}\t${connector.detail}`
    );
  }
  for (const action of report.next_actions) {
    console.log(`- ${action}`);
  }
}

function printOAuthConnector(connector: OAuthConnectorManifest): void {
  console.log(`${connector.id}\t${connector.provider}\t${connector.enabled ? "enabled" : "disabled"}`);
  console.log(`Auth: ${connector.auth_url}`);
  console.log(`Token: ${connector.token_url}`);
  console.log(`Redirect: ${connector.redirect_uri}`);
  console.log(`Client env: ${connector.client_id_env}${connector.client_secret_env ? ` / ${connector.client_secret_env}` : ""}`);
  console.log(`Scopes: ${connector.scopes.join(",") || "-"}`);
}

function printOAuthGrant(grant: OAuthGrant): void {
  console.log(`OAuth grant: ${grant.id} ${grant.status}`);
  console.log(`Connector: ${grant.connector}`);
  console.log(`State: ${grant.state}`);
  console.log(`Expires: ${grant.expires_at}`);
  console.log(`Auth URL: ${grant.auth_url}`);
}

function printOAuthToken(token: OAuthTokenRecord): void {
  console.log(`OAuth token stored: ${token.id}`);
  console.log(`Connector: ${token.connector}`);
  console.log(`Type: ${token.token_type ?? "Bearer"}`);
  console.log(`Expires: ${token.expires_at ?? "-"}`);
  console.log(`Scopes: ${token.scopes.join(",") || "-"}`);
  console.log("Access token: [redacted]");
}

function printWebAuthStatus(report: WebAuthStatusReport): void {
  console.log(`Web auth pack: ${report.ready ? "ready" : "needs setup"}`);
  console.log(`Providers: ${report.enabled_provider_count}/${report.provider_count} enabled`);
  console.log(`Registry: ${report.registry_path}`);
  console.log(`Profiles: ${report.profiles_dir}`);
  console.log(`Sessions: ${report.sessions_dir}`);
  console.log(
    `Policy: cookie_export=${report.policy.cookie_export}, token_extraction=${report.policy.token_extraction}, password_capture=${report.policy.password_capture}`
  );
  for (const provider of report.providers) {
    console.log(
      `${provider.id}\t${provider.enabled ? "enabled" : "disabled"}\tport=${provider.cdp_port}\tprofile=${provider.profile_exists ? "yes" : "no"}\tartifacts=${provider.session_artifacts}\t${provider.detail}`
    );
  }
  for (const action of report.next_actions) {
    console.log(`- ${action}`);
  }
}

function printWebAuthProvider(provider: WebAuthProviderManifest): void {
  console.log(`${provider.id}\t${provider.enabled ? "enabled" : "disabled"}\tport=${provider.cdp_port}`);
  console.log(`Name: ${provider.display_name}`);
  console.log(`Login: ${provider.login_url}`);
  console.log(`Home: ${provider.home_url}`);
  console.log(`Origins: ${provider.allowed_origins.join(",") || "-"}`);
  console.log(`Profile: ${provider.profile_path}`);
  console.log(`Mode: ${provider.mode}`);
  console.log(`Notes: ${provider.notes}`);
}

function printWebAuthLaunch(report: WebAuthLaunchReport): void {
  console.log(`Web auth ${report.action}: ${report.provider} ${report.status}`);
  console.log(`URL: ${report.target_url}`);
  console.log(`CDP: ${report.cdp_url}`);
  console.log(`Profile: ${report.profile_path}`);
  if (report.launched_browser) {
    console.log(`Browser: ${report.launched_browser.executable_path}`);
    console.log(`PID: ${report.launched_browser.pid ?? "-"}`);
  }
  console.log(`Artifact: ${report.artifact_path}`);
  console.log("Policy: no cookie export, no token extraction, no password capture.");
  for (const instruction of report.instructions) {
    console.log(`- ${instruction}`);
  }
}

async function printTerminalWelcome(context: CommandContext, options: TerminalWelcomeOptions): Promise<void> {
  const snapshot = await collectTerminalSnapshot(context, options.desktop);
  const width = terminalWidth();
  const session = createTerminalSessionId();
  const readiness = snapshot.readiness;
  const checkCount = snapshot.doctorChecks?.length ?? 0;
  const passingChecks = snapshot.doctorChecks?.filter((check) => check.ok).length ?? 0;
  const mcpServers = snapshot.mcp?.servers.length ?? 0;
  const mcpTools = snapshot.mcp?.servers.reduce((total, server) => total + server.registered_tools.length, 0) ?? 0;
  const modelProviders = snapshot.modelHealth?.providers.length ?? 0;
  const modelRoutes = snapshot.modelHealth?.routes.length ?? 0;
  const enabledTools = Object.values(snapshot.tools ?? {}).filter((tool) => tool.enabled).length;
  const totalTools = Object.keys(snapshot.tools ?? {}).length;
  const installedSkills = snapshot.skillHub?.entries.filter((entry) => entry.installed).length ?? 0;
  const skillEntries = snapshot.skillHub?.entries.length ?? 0;
  const agentCount = snapshot.agents?.length ?? 0;
  const startUrl = options.startUrl ?? snapshot.desktop?.start_url ?? "/desktop";
  const port = options.port ?? snapshot.desktop?.port ?? 4767;

  printTerminalText("");
  for (const line of HALLOW_WORDMARK) {
    printTerminalText(line, "1;97");
  }
  printTerminalText(repeatChar("-", width), "90");

  const rightBlock = [
    `Hallow Agent OS ${HALLOW_RELEASE_LABEL} / v${HALLOW_CLI_VERSION}  ::  ${terminalModeLabel(options.mode)}`,
    `session ${session}  ::  local-first / private runtime`,
    `readiness ${readiness ? `${readiness.score}% ${readiness.status}` : "collecting"}  ::  checks ${checkCount > 0 ? `${passingChecks}/${checkCount}` : "pending"}`,
    `memory ${snapshot.memory ? `${snapshot.memory.sqlite_items} item(s), ${snapshot.memory.index_items} indexed` : "vault pending"}`,
    `mcp ${mcpServers} server(s), ${mcpTools} registered tool(s)`,
    `models ${modelProviders} provider(s), ${modelRoutes} route(s)`,
    `gateway ${snapshot.gateway ? `${snapshot.gateway.enabled_channels}/${snapshot.gateway.total_channels} channel(s), ${snapshot.gateway.active_pairings} pairing(s)` : "not scanned"}`,
    `tools ${enabledTools}/${totalTools} enabled  ::  skills ${installedSkills}/${skillEntries} installed  ::  agents ${agentCount}`,
    `runtime http://127.0.0.1:${port}/desktop`
  ];

  const logoWidth = Math.max(...HALLOW_MASK_ASCII.map((line) => line.length));
  const detailWidth = Math.max(24, width - logoWidth - 3);
  const bodyRows = Math.max(HALLOW_MASK_ASCII.length, rightBlock.length);
  for (let index = 0; index < bodyRows; index += 1) {
    const logo = padRight(HALLOW_MASK_ASCII[index] ?? "", logoWidth);
    const detail = clipText(rightBlock[index] ?? "", detailWidth);
    printTerminalText(`${logo}   ${detail}`, index < HALLOW_MASK_ASCII.length ? "37" : undefined);
  }

  printTerminalSection("RUNTIME CHECKS", [
    formatMetric("readiness", readiness ? `${readiness.score}% ${readiness.status}` : "pending"),
    formatMetric("doctor", checkCount > 0 ? `${passingChecks}/${checkCount} passing` : "pending"),
    formatMetric("security", snapshot.security?.status ?? "not scanned"),
    formatMetric("usage", snapshot.usage ? `${snapshot.usage.entry_count} run(s), $${snapshot.usage.total_cost_usd_estimate.toFixed(4)} est.` : "not scanned")
  ], width);

  printTerminalSection("AVAILABLE TOOLS", terminalToolRows(snapshot), width);
  printTerminalSection("AVAILABLE SKILLS", terminalSkillRows(snapshot), width);
  printTerminalSection("MODEL ROUTES", terminalModelRows(snapshot), width);
  printTerminalSection("MCP SURFACE", terminalMcpRows(snapshot), width);
  printTerminalSection("NEXT COMMANDS", terminalNextRows(context, options, startUrl, port), width);

  const nextActions = readiness?.next_actions.slice(0, 2) ?? [];
  if (nextActions.length > 0 && readiness?.status !== "strong") {
    printTerminalSection("ATTENTION", nextActions, width);
  }

  printTerminalText(repeatChar("-", width), "90");
  printTerminalText(`Type "hallow help" for commands. Open runtime: ${startUrl}`, "90");
}

async function collectTerminalSnapshot(context: CommandContext, desktop?: DesktopShellStatus): Promise<TerminalSnapshot> {
  const [
    readiness,
    doctorChecks,
    mcp,
    gateway,
    memory,
    skillHub,
    modelHealth,
    tools,
    agents,
    usage,
    security,
    desktopStatus
  ] = await Promise.allSettled([
    context.runtime.getReadinessReport(),
    context.runtime.doctor(),
    context.runtime.discoverMcpTools(),
    context.runtime.getGatewayStatus(),
    context.runtime.getMemoryStoreStats(),
    context.runtime.getSkillHubReport(),
    context.runtime.getModelHealth(),
    context.runtime.listTools(),
    context.runtime.listAgents(),
    context.runtime.getUsageReport(5),
    context.runtime.runSecurityAudit({ write: false }),
    desktop ? Promise.resolve(desktop) : context.runtime.getDesktopShellStatus()
  ]);

  return {
    readiness: settledValue(readiness),
    doctorChecks: settledValue(doctorChecks),
    mcp: settledValue(mcp),
    gateway: settledValue(gateway),
    memory: settledValue(memory),
    skillHub: settledValue(skillHub),
    modelHealth: settledValue(modelHealth),
    tools: settledValue(tools),
    agents: settledValue(agents),
    usage: settledValue(usage),
    security: settledValue(security),
    desktop: settledValue(desktopStatus)
  };
}

function settledValue<T>(result: PromiseSettledResult<T>): T | undefined {
  return result.status === "fulfilled" ? result.value : undefined;
}

function terminalToolRows(snapshot: TerminalSnapshot): string[] {
  const entries = Object.entries(snapshot.tools ?? {}).sort(([left], [right]) => left.localeCompare(right));
  const rows = entries.slice(0, 8).map(([id, tool]) => formatMetric(id, `${tool.enabled ? "enabled" : "disabled"} / ${tool.risk} / ${tool.approval}`));
  if (entries.length > rows.length) {
    rows.push(`and ${entries.length - rows.length} more tool(s)`);
  }
  return rows.length > 0 ? rows : ["No tools registered yet. Run hallow setup."];
}

function terminalSkillRows(snapshot: TerminalSnapshot): string[] {
  const entries = snapshot.skillHub?.entries ?? [];
  const rows = entries.slice(0, 8).map((entry) =>
    formatMetric(entry.id, `${entry.installed ? "installed" : "available"} / ${entry.trust} / ${entry.version}`)
  );
  if (entries.length > rows.length) {
    rows.push(`and ${entries.length - rows.length} more skill package(s)`);
  }
  return rows.length > 0 ? rows : ["No skill packages found yet. Add a local skill source or install from the hub."];
}

function terminalModelRows(snapshot: TerminalSnapshot): string[] {
  const health = snapshot.modelHealth;
  if (!health) {
    return ["Model registry not scanned yet."];
  }

  const rows = health.routes.slice(0, 6).map((route) => {
    const fallback = route.fallback.length > 0 ? ` -> ${route.fallback.join(",")}` : "";
    return formatMetric(route.name, `${route.primary}${fallback}`);
  });
  if (health.routes.length > rows.length) {
    rows.push(`and ${health.routes.length - rows.length} more route(s)`);
  }
  if (rows.length === 0) {
    return health.providers.slice(0, 6).map((provider) =>
      formatMetric(provider.name, `${provider.type} / ${provider.default_model ?? "no default model"}`)
    );
  }
  return rows;
}

function terminalMcpRows(snapshot: TerminalSnapshot): string[] {
  const servers = snapshot.mcp?.servers ?? [];
  const rows = servers.slice(0, 6).map((server) =>
    formatMetric(server.name, `${server.status} / ${server.transport} / ${server.registered_tools.length} tool(s)`)
  );
  if (servers.length > rows.length) {
    rows.push(`and ${servers.length - rows.length} more MCP server(s)`);
  }
  return rows.length > 0 ? rows : ["No MCP server registered yet. Try hallow mcp add filesystem --command npx --args ..."];
}

function terminalNextRows(context: CommandContext, options: TerminalWelcomeOptions, startUrl: string, port: number): string[] {
  const startCommand = formatStartCommand(context.home, port);
  if (options.mode === "setup") {
    return [
      formatMetric("start", startCommand),
      formatMetric("open", startUrl),
      formatMetric("doctor", "hallow doctor"),
      formatMetric("agent", "hallow agent create research")
    ];
  }

  if (options.mode === "start") {
    return [
      formatMetric("open", startUrl),
      formatMetric("create", "hallow agent create research"),
      formatMetric("run", 'hallow agent run hallow "summarize this workspace"'),
      formatMetric("heartbeat", "hallow autonomy heartbeat --dry-run")
    ];
  }

  return [
    formatMetric("global install", "irm https://hallow-agent.xyz/install.ps1 | iex"),
    formatMetric("mac/linux", "curl -fsSL https://hallow-agent.xyz/install.sh | bash"),
    formatMetric("open", "hallow"),
    formatMetric("start", startCommand),
    formatMetric("doctor", "hallow doctor")
  ];
}

function printTerminalSection(title: string, rows: string[], width: number): void {
  printTerminalText("");
  printTerminalText(title, "1;97");
  for (const row of rows) {
    printTerminalText(`  ${clipText(row, width - 2)}`, "37");
  }
}

function formatMetric(label: string, value: string): string {
  return `${padRight(label, 24)} ${value}`;
}

function printTerminalText(value: string, colorCode?: string): void {
  console.log(terminalColor(value, colorCode));
}

function terminalColor(value: string, colorCode?: string): string {
  if (!colorCode || !supportsAnsi()) {
    return value;
  }
  return `\x1b[${colorCode}m${value}\x1b[0m`;
}

function supportsAnsi(): boolean {
  return Boolean(process.stdout.isTTY && process.env.NO_COLOR === undefined && process.env.TERM !== "dumb");
}

function terminalWidth(): number {
  return Math.max(80, Math.min(process.stdout.columns ?? 104, 118));
}

function terminalModeLabel(mode: TerminalWelcomeMode): string {
  if (mode === "setup") {
    return "setup complete";
  }
  if (mode === "start") {
    return "runtime online";
  }
  if (mode === "status") {
    return "status";
  }
  return "operator terminal";
}

function createTerminalSessionId(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
  return `${stamp.slice(0, 8)}_${stamp.slice(8, 14)}`;
}

function padRight(value: string, length: number): string {
  return value.length >= length ? value : `${value}${" ".repeat(length - value.length)}`;
}

function clipText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function repeatChar(value: string, count: number): string {
  return value.repeat(Math.max(0, count));
}

function stripOption(args: string[], name: string): string[] {
  const index = args.indexOf(name);
  if (index === -1) {
    return args;
  }

  return args.filter((_, itemIndex) => itemIndex !== index && itemIndex !== index + 1);
}

function printHelp(): void {
  console.log(`Hallow

Usage:
  hallow init [--home path]
  hallow setup [--port 4767]
  hallow terminal
  hallow doctor [--home path]
  hallow status [--home path]
  hallow readiness [--strict]
  hallow demo setup [--skip-live-mcp] [--skip-browser]
  hallow demo run [--skip-live-mcp] [--skip-browser]
  hallow demo checklist
  hallow perfect status
  hallow perfect checklist [--write]
  hallow perfect report
  hallow onboarding
  hallow desktop setup [--port 4767]
  hallow desktop status
  hallow desktop path
  hallow start [--home path] [--port 4767]
  hallow agent create <id> [--name "Name"]
  hallow agent verify <path>
  hallow agent install <path> [--force]
  hallow agent list
  hallow agent run <id> "task prompt"
  hallow skill create <id> [--internet]
  hallow skill verify <path>
  hallow skill install <path> [--force]
  hallow skill source add <id> --path path [--trust local|signed|untrusted]
  hallow skill source list
  hallow skill hub [--query text]
  hallow skill install-hub <skill-id> [--source source-id] [--force]
  hallow skill list
  hallow skill test <id>
  hallow skill stats [id]
  hallow skill reflect <id>
  hallow skill improve <id>
  hallow skill review <id> [--strict]
  hallow skill promote <id> [--force] [--strict]
  hallow skill rollback <id> [--backup path]
  hallow skill confirm <id> [--dry-run] [--strict]
  hallow memory add --content "memory" [--type fact] [--privacy private] [--tags a,b]
  hallow memory suggest --content "memory" [--reason "..."]
  hallow memory suggestions [--status pending|approved|denied|all]
  hallow memory approve <suggestion_id>
  hallow memory deny <suggestion_id>
  hallow memory show <id>
  hallow memory update <id> [--content "memory"] [--type fact] [--privacy private] [--tags a,b]
  hallow memory delete <id> --yes
  hallow memory rebuild
  hallow memory index
  hallow memory tree
  hallow memory list [--limit 20]
  hallow memory search "query"
  hallow memory export [--path file] [--obsidian]
  hallow memory stats
  hallow workspace path
  hallow workspace import <source-file> [--as relative/file.txt]
  hallow embedding status
  hallow embedding list
  hallow embedding configure <name> [--type openai_compatible|ollama|local_token] [--model model] [--base-url url] [--api-key-env ENV] [--default]
  hallow embedding index
  hallow mcp add <name> [--command npx --args a,b] [--url https://...] [--include tool_a,tool_b]
  hallow mcp list
  hallow mcp discover
  hallow mcp probe <server>
  hallow mcp call <server> <tool> [--path file] [--arg key=value] [--json '{"path":"README.md"}']
  hallow mcp serve
  hallow browser observe --url https://example.com [--max-chars 12000]
  hallow browser session --url https://example.com [--cdp http://127.0.0.1:9222] [--launch] [--wait-ms 1500] [--no-screenshot]
  hallow browser launch-command [--port 9222]
  hallow web-auth status [provider]
  hallow web-auth providers
  hallow web-auth policy
  hallow web-auth login <provider> [--port 9230] [--browser-path path] [--headless] [--attach-existing]
  hallow web-auth open <provider> [--port 9230] [--browser-path path] [--headless] [--attach-existing]
  hallow web-auth configure <provider> --login-url https://... [--home-url https://...] [--origin https://site]
  hallow sandbox status
  hallow sandbox enable-local
  hallow sandbox enable-docker
  hallow sandbox enable-wsl
  hallow sandbox enable-node-permission
  hallow sandbox smoke
  hallow sandbox run <command> -- [args...]
  hallow tool list
  hallow tool check <tool-id>
  hallow tool read --path relative/file.txt
  hallow tool write --path relative/file.txt --content "text" [--approval approval_id]
  hallow tool fetch --url https://example.com [--save web/example.md] [--approval approval_id]
  hallow task create --prompt "task" [--agent hallow] [--skill skill-id] [--max-attempts 3]
  hallow task list [--status queued|running|succeeded|failed|cancelled|all]
  hallow task run <id>
  hallow task run-due [--limit 10]
  hallow task cancel <id>
  hallow schedule add <id> --prompt "task" [--daily 08:00] [--every-minutes 60] [--cron "*/15 * * * *"]
  hallow schedule list
  hallow schedule run <id>
  hallow schedule run-due [--now ISO_DATE]
  hallow autonomy tick [--skill id] [--max-skill-tests 1] [--max-task-runs 3] [--auto-promote] [--confirm-promotions] [--dry-run]
  hallow autonomy loop [--iterations 3] [--interval-seconds 60] [--forever] [--force]
  hallow autonomy quality
  hallow autonomy react [--dry-run] [--limit 3]
  hallow autonomy heartbeat [--dry-run]
  hallow autonomy heal [--max-rounds 3] [--skill id] [--auto-promote] [--confirm-promotions] [--dry-run]
  hallow autonomy loop-status
  hallow autonomy stop [--reason "..."]
  hallow autonomy clear-stop
  hallow autonomy clear-lock
  hallow autonomy policy show
  hallow autonomy policy set [--auto-promote true] [--confirm-promotions true] [--max-skill-tests 1] [--max-task-runs 3]
  hallow autonomy enable
  hallow autonomy disable
  hallow security audit [--strict] [--json]
  hallow security sandbox
  hallow security api-token [status|rotate]
  hallow gateway status
  hallow gateway channels
  hallow gateway adapters
  hallow gateway pair <channel> --from sender [--label name]
  hallow gateway pairings [--channel channel]
  hallow gateway revoke-pairing <pairing-id>
  hallow gateway enable <channel>
  hallow gateway send-mode <channel> --send auto|ask|deny
  hallow gateway allow <channel> --from sender1,sender2
  hallow gateway ingest --channel local-webhook --from system [--pairing-token token] --text "message"
  hallow gateway inbox [--limit 20]
  hallow gateway send --channel slack --to target --text "message" [--dry-run] [--approval id]
  hallow gateway outbox [--limit 20]
  hallow marketplace sign --type agent|skill --path package/path
  hallow marketplace verify --path package/path
  hallow marketplace export [--path registry.json]
  hallow marketplace registry
  hallow marketplace search "query" [--type agent|skill]
  hallow marketplace install <agent:id|skill:id> [--force]
  hallow marketplace serve [--port 4767]
  hallow marketplace list
  hallow integration oauth status
  hallow integration oauth connectors
  hallow integration oauth auth <connector> [--scope a,b]
  hallow integration oauth callback --state STATE --code CODE
  hallow integration oauth store-token <connector> --access-token TOKEN
  hallow integration oauth configure <id> [--provider github|google|slack|notion|microsoft|custom]
  hallow integration autofetch run --url https://... [--save path] [--max-chars 6000]
  hallow integration autofetch add <id> --url https://... [--every-minutes 60]
  hallow fleet spawn <agent-id> --purpose "research watcher"
  hallow fleet list
  hallow approval create <action> --target "target" [--risk R3]
  hallow approval list [--status pending|approved|denied|all]
  hallow approval approve <id>
  hallow approval deny <id>
  hallow notification list [--status unread|read|all] [--limit 20]
  hallow notification read <id>
  hallow model add <name> [--type openai_compatible] [--base-url url] [--api-key-env ENV] [--default-model model]
  hallow model list
  hallow model catalog [--provider openai] [--query coding] [--providers]
  hallow model install-catalog [--providers openai,anthropic,google,ollama] [--overwrite]
  hallow model routes
  hallow model test <name>
  hallow model health [--test]
  hallow usage report [--limit 10]
  hallow usage list [--limit 20]

Examples:
  hallow
  hallow agent run hallow "turn my weekly repo review into a reusable workflow"
  hallow model add ollama
  hallow start
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
