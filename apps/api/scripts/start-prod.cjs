/**
 * Arranque producción: migraciones + API.
 * Usa npx prisma (no pnpm exec) — en Railway/pnpm workspaces pnpm exec falla desde apps/api.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const apiRoot = path.join(__dirname, "..");
const FAILED_MIGRATION = "20260611120000_fix_followup_unique_index_drop";

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

function migrateDeploy() {
  const r = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "pipe",
    cwd: apiRoot,
    env: process.env,
    encoding: "utf8",
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  if (out) process.stderr.write(out);

  if (r.status === 0) return;

  if (out.includes("P3009") && out.includes(FAILED_MIGRATION)) {
    console.log(`Recovering failed migration ${FAILED_MIGRATION}…`);
    run("npx", ["prisma", "migrate", "resolve", "--rolled-back", FAILED_MIGRATION]);
    migrateDeploy();
    return;
  }

  process.exit(r.status ?? 1);
}

console.log("Running prisma migrate deploy...");
migrateDeploy();

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
