import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

export const HALLOW_HOME_ENV = "HALLOW_HOME";
export const HALLOW_DIR_NAME = ".hallow";

export function getHallowHome(explicitHome?: string): string {
  const configured = explicitHome ?? process.env[HALLOW_HOME_ENV];
  if (configured && configured.trim().length > 0) {
    return resolveHomePath(configured);
  }

  return join(homedir(), HALLOW_DIR_NAME);
}

export function resolveHomePath(value: string): string {
  const trimmed = value.trim();

  if (trimmed === "~") {
    return homedir();
  }

  if (trimmed.startsWith("~/") || trimmed.startsWith("~\\")) {
    return join(homedir(), trimmed.slice(2));
  }

  if (isAbsolute(trimmed)) {
    return trimmed;
  }

  return resolve(trimmed);
}

export function hallowPath(home: string, ...segments: string[]): string {
  return join(home, ...segments);
}

