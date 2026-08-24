import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

let envLoaded = false;

/**
 * Finds the monorepo root directory by traversing upwards from the current directory
 * until a directory containing `turbo.json` or `package.json` with `workspaces` is found.
 */
export function findMonorepoRoot(startDir: string = process.cwd()): string {
  let currentDir = path.resolve(startDir);
  const rootAnchor = path.parse(currentDir).root;

  while (currentDir !== rootAnchor) {
    const turboPath = path.join(currentDir, "turbo.json");
    const packageJsonPath = path.join(currentDir, "package.json");

    if (fs.existsSync(turboPath)) {
      return currentDir;
    }

    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        if (pkg.workspaces) {
          return currentDir;
        }
      } catch {
        // Continue searching upwards
      }
    }

    currentDir = path.dirname(currentDir);
  }

  // Fallback to startDir if root not found
  return startDir;
}

/**
 * Loads environment variables from the monorepo root and optional local overrides.
 * Ensures consistent loading regardless of where commands or scripts are executed.
 */
export function loadEnv(options: { force?: boolean } = {}): void {
  if (envLoaded && !options.force) {
    return;
  }

  const rootDir = findMonorepoRoot();
  const nodeEnv = process.env.NODE_ENV || "development";

  // Ordered list of root env files (least specific to most specific)
  const envFilesToLoad = [
    path.join(rootDir, ".env"),
    path.join(rootDir, `.env.${nodeEnv}`),
    path.join(rootDir, ".env.local"),
    path.join(rootDir, `.env.${nodeEnv}.local`),
  ];

  // If cwd is not rootDir, check if there's a workspace-specific .env or .env.local
  const cwd = process.cwd();
  if (cwd !== rootDir) {
    envFilesToLoad.push(path.join(cwd, ".env"));
    envFilesToLoad.push(path.join(cwd, `.env.${nodeEnv}`));
    envFilesToLoad.push(path.join(cwd, ".env.local"));
    envFilesToLoad.push(path.join(cwd, `.env.${nodeEnv}.local`));
  }

  for (const envPath of envFilesToLoad) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
    }
  }

  envLoaded = true;
}

// Auto-load upon import in Node/Bun runtimes
if (typeof process !== "undefined" && process.env) {
  loadEnv();
}
