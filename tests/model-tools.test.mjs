import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ModelRegistry } from "../packages/models/dist/index.js";

async function createProvider(t, type, responder) {
  const requests = [];
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    requests.push({ url: request.url, headers: request.headers, body: body ? JSON.parse(body) : {} });
    const payload = responder(requests.at(-1));
    response.writeHead(200, { "content-type": typeof payload === "string" ? "text/event-stream" : "application/json" });
    response.end(typeof payload === "string" ? payload : JSON.stringify(payload));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  const home = await mkdtemp(join(tmpdir(), "hallow-model-test-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  const registry = new ModelRegistry(home);
  await registry.ensureDefaults();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  await writeFile(registry.providersPath, [
    "providers:",
    "  fake:",
    `    type: ${type}`,
    `    base_url: ${baseUrl}`,
    ...(type === "ollama" ? [] : ["    api_key_env: HALLOW_MODEL_TEST_KEY"]),
    "    default_model: test-model",
    ""
  ].join("\n"));
  process.env.HALLOW_MODEL_TEST_KEY = "test-secret";
  t.after(() => delete process.env.HALLOW_MODEL_TEST_KEY);
  return { registry, requests };
}

const tool = {
  name: "read_file",
  description: "Read a file",
  input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
};

test("OpenAI-compatible adapter sends and parses native tool calls", async (t) => {
  const { registry, requests } = await createProvider(t, "openai_compatible", () => ({
    choices: [{
      finish_reason: "tool_calls",
      message: {
        content: null,
        tool_calls: [{ id: "call-1", function: { name: "read_file", arguments: '{"path":"README.md"}' } }]
      }
    }]
  }));
  const result = await registry.generateTurn({ model: "fake:test-model", messages: [{ role: "user", content: "read" }], tools: [tool] });
  assert.equal(requests[0].url, "/chat/completions");
  assert.equal(requests[0].body.tools[0].function.name, "read_file");
  assert.deepEqual(result.tool_calls[0], { id: "call-1", name: "read_file", arguments: { path: "README.md" } });
});

test("Anthropic adapter maps tool_use and tool_result blocks", async (t) => {
  let responseNumber = 0;
  const { registry, requests } = await createProvider(t, "anthropic", () => {
    responseNumber += 1;
    return responseNumber === 1
      ? { stop_reason: "tool_use", content: [{ type: "tool_use", id: "call-a", name: "read_file", input: { path: "a.txt" } }] }
      : { stop_reason: "end_turn", content: [{ type: "text", text: "complete" }] };
  });
  const first = await registry.generateTurn({ model: "fake:test-model", messages: [{ role: "user", content: "read" }], tools: [tool] });
  assert.equal(first.tool_calls[0].name, "read_file");
  const second = await registry.generateTurn({
    model: "fake:test-model",
    tools: [tool],
    messages: [
      { role: "user", content: "read" },
      { role: "assistant", content: "", tool_calls: first.tool_calls },
      { role: "tool", content: "file data", tool_call_id: "call-a", tool_name: "read_file" }
    ]
  });
  assert.equal(second.content, "complete");
  assert.equal(requests[1].body.messages[2].content[0].type, "tool_result");
});

test("Ollama adapter accepts structured native tool calls", async (t) => {
  const { registry, requests } = await createProvider(t, "ollama", () => ({
    done_reason: "stop",
    message: { content: "", tool_calls: [{ function: { name: "read_file", arguments: { path: "local.txt" } } }] }
  }));
  const result = await registry.generateTurn({ model: "fake:test-model", messages: [{ role: "user", content: "read" }], tools: [tool] });
  assert.equal(requests[0].url, "/api/chat");
  assert.equal(requests[0].body.stream, false);
  assert.deepEqual(result.tool_calls[0].arguments, { path: "local.txt" });
});

test("legacy generateText remains compatible", async (t) => {
  const { registry } = await createProvider(t, "openai_compatible", () => ({
    choices: [{ finish_reason: "stop", message: { content: "legacy-ok" } }]
  }));
  const result = await registry.generateText({ model: "fake:test-model", prompt: "hello" });
  assert.equal(result.content, "legacy-ok");
});

test("OpenAI-compatible adapter streams text and reconstructs fragmented tool arguments", async (t) => {
  const stream = [
    'data: {"choices":[{"delta":{"content":"Working "}}]}',
    'data: {"choices":[{"delta":{"content":"now."}}]}',
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-s","function":{"name":"read_file","arguments":"{\\"path\\":"}}]}}]}',
    'data: {"choices":[{"finish_reason":"tool_calls","delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"stream.txt\\"}"}}]}}]}',
    "data: [DONE]",
    ""
  ].join("\n");
  const { registry, requests } = await createProvider(t, "openai_compatible", () => stream);
  const deltas = [];
  const result = await registry.generateTurn({
    model: "fake:test-model",
    messages: [{ role: "user", content: "stream" }],
    tools: [tool],
    onTextDelta: (delta) => deltas.push(delta)
  });
  assert.equal(requests[0].body.stream, true);
  assert.deepEqual(deltas, ["Working ", "now."]);
  assert.equal(result.content, "Working now.");
  assert.deepEqual(result.tool_calls[0].arguments, { path: "stream.txt" });
});
