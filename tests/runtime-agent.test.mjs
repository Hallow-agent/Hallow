import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import test from "node:test";
import { HallowRuntime } from "../packages/runtime/dist/index.js";

async function createRuntime(t, model) {
  const home = await mkdtemp(join(tmpdir(), "hallow-test-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  const runtime = new HallowRuntime(home, model);
  await runtime.init();
  return runtime;
}

function finalModel(content = "done") {
  return {
    async generateTurn() {
      return { provider: "fake", model: "test", content, tool_calls: [], finish_reason: "stop" };
    }
  };
}

test("sessions persist messages and can be archived", async (t) => {
  const runtime = await createRuntime(t, finalModel("hello"));
  const result = await runtime.runAgent("hallow", "first prompt");
  const session = await runtime.getSession(result.session_id);
  assert.equal(session.message_count, 2);
  assert.equal(session.title, "first prompt");
  assert.deepEqual((await runtime.listSessionMessages(session.id)).map((item) => item.role), ["user", "assistant"]);
  assert.equal((await runtime.archiveSession(session.id)).status, "archived");
});

test("one session carries prior conversation into the next turn", async (t) => {
  const seen = [];
  const model = {
    async generateTurn(input) {
      seen.push(input.messages.map((message) => `${message.role}:${message.content}`));
      return { provider: "fake", model: "test", content: `answer-${seen.length}`, tool_calls: [] };
    }
  };
  const runtime = await createRuntime(t, model);
  const first = await runtime.runAgent("hallow", "alpha");
  await runtime.runAgent("hallow", "beta", { sessionId: first.session_id });
  assert.deepEqual(seen[1].slice(0, 3), ["user:alpha", "assistant:answer-1", "user:beta"]);
  assert.equal((await runtime.getSession(first.session_id)).message_count, 4);
});

test("model-selected file tool executes and loops back to the model", async (t) => {
  let calls = 0;
  const model = {
    async generateTurn(input) {
      calls += 1;
      if (calls === 1) {
        assert.ok(input.tools.some((tool) => tool.name === "read_file"));
        return {
          provider: "fake",
          model: "test",
          content: "",
          tool_calls: [{ id: "call-1", name: "read_file", arguments: { path: "note.txt" } }]
        };
      }
      const toolResult = input.messages.at(-1);
      assert.equal(toolResult.role, "tool");
      assert.match(toolResult.content, /trusted evidence/);
      return { provider: "fake", model: "test", content: "verified", tool_calls: [] };
    }
  };
  const runtime = await createRuntime(t, model);
  await writeFile(join(runtime.home, "workspace", "note.txt"), "trusted evidence", "utf8");
  const result = await runtime.runAgent("hallow", "inspect the note");
  assert.equal(result.content, "verified");
  assert.equal(result.iterations, 2);
  assert.equal(result.tool_uses[0].tool, "filesystem.read");
  assert.equal(result.tool_uses[0].status, "success");
});

test("relevant local memory is injected without prompt tags", async (t) => {
  let system = "";
  const model = {
    async generateTurn(input) {
      system = input.system;
      return { provider: "fake", model: "test", content: "ok", tool_calls: [] };
    }
  };
  const runtime = await createRuntime(t, model);
  await runtime.addMemory({ content: "The user prefers Indonesian replies.", type: "preference" });
  await runtime.runAgent("hallow", "Which language should you use?");
  assert.match(system, /prefers Indonesian replies/);
});

test("tool loop stops at its configured iteration boundary", async (t) => {
  const model = {
    async generateTurn() {
      return {
        provider: "fake",
        model: "test",
        content: "",
        tool_calls: [{ id: crypto.randomUUID(), name: "memory_search", arguments: { query: "none" } }]
      };
    }
  };
  const runtime = await createRuntime(t, model);
  const result = await runtime.runAgent("hallow", "keep searching", { maxIterations: 2 });
  assert.equal(result.iterations, 2);
  assert.match(result.content, /Stopped after 2 model iterations/);
  assert.equal(result.tool_uses.length, 2);
});

test("model can save an explicitly requested durable memory", async (t) => {
  let calls = 0;
  const model = {
    async generateTurn() {
      calls += 1;
      return calls === 1
        ? {
            provider: "fake",
            model: "test",
            content: "",
            tool_calls: [{
              id: "remember-1",
              name: "memory_save",
              arguments: { content: "The user prefers Indonesian.", type: "preference" }
            }]
          }
        : { provider: "fake", model: "test", content: "saved", tool_calls: [] };
    }
  };
  const runtime = await createRuntime(t, model);
  const result = await runtime.runAgent("hallow", "remember my language preference");
  assert.equal(result.tool_uses[0].tool, "memory.write");
  assert.equal(result.tool_uses[0].status, "success");
  assert.match((await runtime.listMemory({ type: "preference" }))[0].content, /prefers Indonesian/);
});

test("cancellation persists a safe terminal message", async (t) => {
  const model = {
    async generateTurn(input) {
      return new Promise((resolve, reject) => {
        input.signal.addEventListener("abort", () => reject(input.signal.reason), { once: true });
      });
    }
  };
  const runtime = await createRuntime(t, model);
  const controller = new AbortController();
  const running = runtime.runAgent("hallow", "long task", { signal: controller.signal });
  setTimeout(() => controller.abort(new Error("test cancel")), 10);
  const result = await running;
  assert.equal(result.cancelled, true);
  assert.equal(result.trace.status, "failed");
  assert.match(result.content, /cancelled by the user/);
  assert.equal((await runtime.getSession(result.session_id)).message_count, 2);
});

test("long sessions compact older turns before the model call", async (t) => {
  let lastInput;
  const model = {
    async generateTurn(input) {
      lastInput = input;
      return { provider: "fake", model: "test", content: "ok", tool_calls: [] };
    }
  };
  const runtime = await createRuntime(t, model);
  let sessionId;
  for (let index = 0; index < 4; index += 1) {
    const result = await runtime.runAgent("hallow", `${index}-${"x".repeat(22_000)}`, { sessionId });
    sessionId = result.session_id;
  }
  assert.match(lastInput.system, /Earlier conversation compacted locally/);
  assert.ok(lastInput.messages.reduce((total, message) => total + message.content.length, 0) < 60_000);
  assert.equal((await runtime.getSession(sessionId)).message_count, 8);
});

test("delegation creates a bounded child session and returns its evidence", async (t) => {
  const model = {
    async generateTurn(input) {
      const last = input.messages.at(-1);
      if (!input.tools.some((tool) => tool.name === "delegate_task")) {
        return { provider: "fake", model: "test", content: "child finding", tool_calls: [] };
      }
      if (last.role === "tool" && last.tool_name === "delegate_task") {
        assert.match(last.content, /child finding/);
        return { provider: "fake", model: "test", content: "parent synthesis", tool_calls: [] };
      }
      return {
        provider: "fake",
        model: "test",
        content: "",
        tool_calls: [{ id: "child-1", name: "delegate_task", arguments: { task: "research one fact", max_iterations: 2 } }]
      };
    }
  };
  const runtime = await createRuntime(t, model);
  const result = await runtime.runAgent("hallow", "delegate research");
  assert.equal(result.content, "parent synthesis");
  assert.equal(result.tool_uses[0].tool, "agent.delegate");
  assert.equal(result.tool_uses[0].status, "success");
  assert.equal((await runtime.listSessions()).length, 2);
});

test("workspace writes stop for approval and resume with the approved id", async (t) => {
  let approvalId;
  const model = {
    async generateTurn(input) {
      const last = input.messages.at(-1);
      if (last.role === "tool") {
        const payload = JSON.parse(last.content);
        if (payload.approval_id && !payload.ok) {
          approvalId = payload.approval_id;
          return { provider: "fake", model: "test", content: `approve ${approvalId}`, tool_calls: [] };
        }
        return { provider: "fake", model: "test", content: "file written", tool_calls: [] };
      }
      if (last.content === "approved") {
        return {
          provider: "fake",
          model: "test",
          content: "",
          tool_calls: [{ id: "write-2", name: "write_file", arguments: { path: "safe.txt", content: "safe", approval_id: approvalId } }]
        };
      }
      return {
        provider: "fake",
        model: "test",
        content: "",
        tool_calls: [{ id: "write-1", name: "write_file", arguments: { path: "safe.txt", content: "safe" } }]
      };
    }
  };
  const runtime = await createRuntime(t, model);
  const first = await runtime.runAgent("hallow", "write a safe file");
  assert.equal(first.tool_uses[0].status, "needs_approval");
  await assert.rejects(readFile(join(runtime.home, "workspace", "safe.txt"), "utf8"));
  await runtime.resolveApproval(approvalId, "approved");
  const second = await runtime.runAgent("hallow", "approved", { sessionId: first.session_id });
  assert.equal(second.tool_uses[0].status, "success");
  assert.equal(await readFile(join(runtime.home, "workspace", "safe.txt"), "utf8"), "safe");
});

test("local webhook gateway preserves one conversation per paired sender", async (t) => {
  const seen = [];
  const model = {
    async generateTurn(input) {
      seen.push(input.messages.map((message) => message.content));
      return { provider: "fake", model: "test", content: `reply-${seen.length}`, tool_calls: [] };
    }
  };
  const runtime = await createRuntime(t, model);
  await runtime.configureGatewayChannel("local-webhook", { enabled: true, allow_from: ["tester"] });
  const firstEvent = await runtime.ingestGatewayEvent({ channel: "local-webhook", from: "tester", text: "first" });
  const firstRun = await runtime.runTask(firstEvent.task_id);
  const secondEvent = await runtime.ingestGatewayEvent({ channel: "local-webhook", from: "tester", text: "second" });
  const secondRun = await runtime.runTask(secondEvent.task_id);
  assert.equal(firstEvent.session_id, secondEvent.session_id);
  assert.equal(firstRun.run.session_id, secondRun.run.session_id);
  assert.deepEqual(seen[1].slice(0, 3), ["first", "reply-1", "second"]);
});

test("sessions can branch from an earlier sequence without mutating the source", async (t) => {
  const runtime = await createRuntime(t, finalModel("answer"));
  const first = await runtime.runAgent("hallow", "original");
  await runtime.runAgent("hallow", "later", { sessionId: first.session_id });
  const branch = await runtime.branchSession(first.session_id, { throughSequence: 2, title: "experiment" });
  assert.notEqual(branch.id, first.session_id);
  assert.equal(branch.title, "experiment");
  assert.equal(branch.message_count, 2);
  assert.equal((await runtime.getSession(first.session_id)).message_count, 4);
  const continued = await runtime.runAgent("hallow", "branch only", { sessionId: branch.id });
  assert.equal((await runtime.getSession(continued.session_id)).message_count, 4);
  assert.equal((await runtime.getSession(first.session_id)).message_count, 4);
});
