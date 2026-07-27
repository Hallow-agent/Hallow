import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import solc from "solc";

test("non-custodial receipt registry compiles without Solidity errors", async () => {
  const source = await readFile(new URL("../contracts/HallowReceiptRegistry.sol", import.meta.url), "utf8");
  const output = JSON.parse(solc.compile(JSON.stringify({
    language: "Solidity",
    sources: { "HallowReceiptRegistry.sol": { content: source } },
    settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } }
  })));
  const errors = (output.errors ?? []).filter((entry) => entry.severity === "error");
  assert.deepEqual(errors, []);
  const contract = output.contracts["HallowReceiptRegistry.sol"].HallowReceiptRegistry;
  assert.ok(contract.evm.bytecode.object.length > 100);
  assert.deepEqual(contract.abi.filter((item) => item.type === "function").map((item) => item.name).sort(), ["receipts", "record"]);
  assert.equal(source.includes("payable"), false);
  assert.equal(source.includes("delegatecall"), false);
  assert.equal(source.includes("selfdestruct"), false);
});
