#!/usr/bin/env bun
import fs from "node:fs";
import path from "node:path";
import tailwindPlugin from "bun-plugin-tailwind";

function toCamelCase(str: string): string {
  // @ts-expect-error - Fix later
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

function parseValue(value: string): boolean | number | string | string[] {
  if (value === "true") return true;
  if (value === "false") return false;

  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d*\.\d+$/.test(value)) return parseFloat(value);

  if (value.includes(",")) return value.split(",").map((v) => v.trim());

  return value;
}

function parseArgs(): Partial<Bun.BuildConfig> {
  const config: Partial<Bun.BuildConfig> = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (!arg.startsWith("--")) continue;

    if (arg.startsWith("--no-")) {
      const key = toCamelCase(arg.slice(5));
      // @ts-expect-error - Fix later
      config[key] = false;
      continue;
    }

    if (
      !arg.includes("=") &&
      (i === args.length - 1 || args[i + 1]?.startsWith("--"))
    ) {
      const key = toCamelCase(arg.slice(2));
      // @ts-expect-error - Fix later
      config[key] = true;
      continue;
    }

    let key: string;
    let value: string;

    if (arg.includes("=")) {
      [key, value] = arg.slice(2).split("=", 2) as [string, string];
    } else {
      key = arg.slice(2);
      value = args[++i] ?? "";
    }

    key = toCamelCase(key);

    if (key.includes(".")) {
      const [parentKey, childKey] = key.split(".");
      // @ts-expect-error - Fix later
      config[parentKey] = config[parentKey] || {};
      // @ts-expect-error - Fix later
      config[parentKey][childKey] = parseValue(value);
    } else {
      // @ts-expect-error - Fix later
      config[key] = parseValue(value);
    }
  }

  return config;
}

function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

async function build(cliConfig: Partial<Bun.BuildConfig>) {
  const entrypoints = [...new Bun.Glob("frontend/**/*.html").scanSync()]
    .map((filePath) => path.resolve(filePath))
    .filter((filePath) => !filePath.includes("node_modules"));

  const result = await Bun.build({
    entrypoints,
    outdir,
    plugins: [tailwindPlugin],
    minify: true,
    target: "browser",
    sourcemap: "linked",
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    ...cliConfig,
  });

  return result.outputs.map((output) => ({
    File: path.relative(process.cwd(), output.path),
    Type: output.kind,
    Size: formatFileSize(output.size),
  }));
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(await Bun.$`bun build --help`);
  process.exit(0);
}

console.log("🚀 Starting build process...");

const cliConfig = parseArgs();
const outdir = cliConfig.outdir || path.join(process.cwd(), "dist");

if (fs.existsSync(outdir)) {
  console.log(`🗑️ Cleaning previous build at ${outdir}`);
  fs.rmSync(outdir, { recursive: true, force: false });
}

const start = performance.now();
const output = await build(cliConfig);
const end = performance.now();

console.table(output);
console.log(`✅ Build completed in ${(end - start).toFixed(2)}ms`);
