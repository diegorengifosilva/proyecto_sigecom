import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const forbidden = ["161.132.55.80"];
const errors = [];

if (!fs.existsSync(distDir)) {
  console.error("[SIGECOM] No existe frontend/dist. El build no se completó.");
  process.exit(1);
}

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|html|css)$/i.test(entry.name)) {
      const text = fs.readFileSync(full, "utf8");
      for (const needle of forbidden) {
        if (text.includes(needle)) {
          errors.push(`${path.relative(distDir, full)} contiene "${needle}"`);
        }
      }
    }
  }
};

walk(distDir);

const swPath = path.join(distDir, "sw.js");
if (!fs.existsSync(swPath)) {
  errors.push("Falta dist/sw.js");
} else {
  const sw = fs.readFileSync(swPath, "utf8");
  if (!sw.includes("/\\/api\\//") && !sw.includes("/^\\/api\\//") && !sw.includes("denylist")) {
    errors.push("dist/sw.js no tiene denylist para /api/ (los reportes en iframe volverían a cargar la SPA)");
  }
}

if (errors.length) {
  console.error("[SIGECOM] Build de producción inseguro:\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log("[SIGECOM] Bundle de producción OK (API relativa, sin IP pública).");
