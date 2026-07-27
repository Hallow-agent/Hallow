import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const names = ["install.ps1", "install.sh", "install.cmd"];
const requiredMarkers = {
  "install.ps1": ["[switch]$DryRun", "[switch]$VerifyOnly", "HALLOW IS READY", "hallow update"],
  "install.sh": ["--dry-run", "--verify", "HALLOW IS READY", "hallow update"],
  "install.cmd": ["HALLOW_INSTALL_PS1_URL", "HALLOW AGENT OS 001"]
};

for (const name of names) {
  const script = await readFile(resolve(root, "scripts", name), "utf8");
  const publicCopy = await readFile(resolve(root, "site", name), "utf8");
  if (script !== publicCopy) {
    throw new Error(`${name} differs between scripts/ and site/. Sync both copies before release.`);
  }
  for (const marker of requiredMarkers[name]) {
    if (!script.includes(marker)) {
      throw new Error(`${name} is missing installer contract marker: ${marker}`);
    }
  }
  console.log(`OK ${name} - public copy matches installer source`);
}
