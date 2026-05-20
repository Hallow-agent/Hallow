import YAML from "yaml";
import { readTextIfExists, writeText } from "./fs.js";

export async function readYaml<T>(path: string, fallback: T): Promise<T> {
  const content = await readTextIfExists(path);
  if (!content) {
    return fallback;
  }

  return YAML.parse(content) as T;
}

export async function writeYaml(path: string, value: unknown): Promise<void> {
  await writeText(path, YAML.stringify(value));
}

export function toYaml(value: unknown): string {
  return YAML.stringify(value);
}

