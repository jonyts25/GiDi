const fs = require("fs");
const path = require("path");
const main = path.join(__dirname, "..", "dist", "main.js");
if (!fs.existsSync(main)) {
  console.error("ERROR: dist/main.js no existe tras nest build");
  process.exit(1);
}
console.log("OK: dist/main.js");
