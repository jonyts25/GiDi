/**
 * Arranque producción: migraciones + API.
 * Usa npx prisma (no pnpm exec) — en Railway/pnpm workspaces pnpm exec falla desde apps/api.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const apiRoot = path.join(__dirname, "..");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: apiRoot,
    env: process.env,
    ...opts,
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

console.log("Running prisma migrate deploy...");
run("npx", ["prisma", "migrate", "deploy"]);

const candidates = [
  path.join(apiRoot, "dist", "main.js"),
  path.join(apiRoot, "dist", "apps", "api", "main.js"),
];

const entry = candidates.find((p) => fs.existsSync(p));
if (!entry) {
  console.error("ERROR: no se encontró main.js en dist/. Ejecuta pnpm run build primero.");
  process.exit(1);
}

console.log(`Starting: ${entry}`);
run(process.execPath, [entry]);
