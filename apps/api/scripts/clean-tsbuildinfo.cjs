/** Evita build vacío: si dist se borra pero queda .tsbuildinfo, tsc no emite nada. */
const fs = require("fs");
const path = require("path");
const info = path.join(__dirname, "..", "tsconfig.build.tsbuildinfo");
try {
  fs.unlinkSync(info);
} catch {
  /* ok */
}
