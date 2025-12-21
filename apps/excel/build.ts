#!/usr/bin/env bun
import fs from "node:fs";
import path from "node:path";
import tailwindPlugin from "bun-plugin-tailwind";

const ROOT = import.meta.dirname;

// ============================================================================
// Helpers
// ============================================================================

function clean(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function printSummary(dir: string) {
  console.log("\n  📊 Output:");
  for (const file of fs.readdirSync(dir)) {
    const size = (fs.statSync(path.join(dir, file)).size / 1024).toFixed(2);
    console.log(`     ${file}: ${size} KB`);
  }
}

/** Inline JS and CSS into HTML (required for Google Apps Script) */
async function inlineAssets(
  htmlPath: string,
  outputs: Bun.BuildArtifact[],
): Promise<string> {
  let html = await Bun.file(htmlPath).text();

  for (const output of outputs) {
    const name = path.basename(output.path);
    let content = await Bun.file(output.path).text();

    if (name.endsWith(".js")) {
      // Escape </script> to prevent breaking HTML
      content = content.replaceAll("</script>", "<\\/script>");
      const regex = new RegExp(
        `<script[^>]*src=["']\\./` +
          name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
          `["'][^>]*></script>`,
        "g",
      );
      html = html.replace(
        regex,
        () => `<script type="module">${content}</script>`,
      );
    } else if (name.endsWith(".css")) {
      const regex = new RegExp(
        `<link[^>]*href=["']\\./` +
          name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
          `["'][^>]*/?>`,
        "g",
      );
      html = html.replace(regex, `<style>${content}</style>`);
    }

    fs.unlinkSync(output.path);
  }

  return html;
}

/** Transform Bun IIFE to Google Apps Script format with stub functions */
async function transformForAppsScript(
  codePath: string,
  sourceEntry: string,
): Promise<string> {
  let code = await Bun.file(codePath).text();
  const source = await Bun.file(sourceEntry).text();

  // Extract exported function names
  const exports = [
    ...source.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g),
    ...source.matchAll(/export\s+const\s+(\w+)/g),
  ].map((m) => m[1]);

  const assignments = exports.map((n) => `  exports.${n} = ${n};`).join("\n");
  const stubs = exports.map((n) => `function ${n}() {};`).join("\n");

  // Transform IIFE wrapper
  code = code
    .replace(/^\(\(\)\s*=>\s*\{/, '(function(exports) {\n  "use strict";')
    .replace(/\}\)\(\);?\s*$/, "");

  return `${code}
${assignments}
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
})(this.globalThis = this.globalThis || {});
${stubs}
`;
}

async function buildExcel() {
  console.log("\n📊 Building Excel...\n");

  const outDir = path.join(ROOT, "dist");
  clean(outDir);

  console.log("  📦 Building frontend...");
  const result = await Bun.build({
    entrypoints: [path.join(ROOT, "frontend/index.html")],
    outdir: outDir,
    minify: true,
    target: "browser",
    plugins: [tailwindPlugin],
    sourcemap: "linked",
    external: ["effect"], // Optional dep from @ai-sdk/provider-utils
    define: { "process.env.NODE_ENV": '"production"' },
  });

  if (!result.success) throw new Error("Build failed");

  // Rename to index.html
  const htmlOutput = result.outputs.find((o) => o.path.endsWith(".html"));
  if (htmlOutput && !htmlOutput.path.endsWith("index.html")) {
    fs.renameSync(htmlOutput.path, path.join(outDir, "index.html"));
  }

  console.log("  ✅ Frontend built");
  printSummary(outDir);
}

// ============================================================================
// Main
// ============================================================================

console.log("🚀 Starting build...");
const start = performance.now();

await buildExcel();

console.log(`\n🎉 Done in ${(performance.now() - start).toFixed(0)}ms`);
