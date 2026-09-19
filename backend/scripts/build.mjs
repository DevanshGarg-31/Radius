/**
 * Bundles the Lambda into a single file and zips it:
 *   dist/index.js   (handler: index.handler)
 *   dist/lambda.zip (upload this in the Lambda console)
 */
import { createWriteStream, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { ZipArchive } from "archiver";
import { build } from "esbuild";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  minify: true,
  sourcemap: "inline",
  logLevel: "info",
});

// The zip has no package.json, so Lambda loads index.js as CommonJS; mirror that locally.
writeFileSync("dist/package.json", JSON.stringify({ type: "commonjs" }));

await new Promise((resolve, reject) => {
  const out = createWriteStream("dist/lambda.zip");
  const zip = new ZipArchive({ zlib: { level: 9 } });
  out.on("close", resolve);
  zip.on("error", reject);
  zip.pipe(out);
  zip.file("dist/index.js", { name: "index.js" });
  zip.finalize();
});

console.log("Built dist/lambda.zip (handler: index.handler)");
