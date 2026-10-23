import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import openapi from "../src/app/lib/openapi.js";

const root = path.resolve("src/app/api");
const actual = [];
async function visit(directory, segments = []) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (segments.length === 0 && item.name === "test") continue;
    const full = path.join(directory, item.name);
    if (item.isDirectory()) await visit(full, [...segments, item.name]);
    else if (/^route\.[jt]s$/.test(item.name)) {
      const source = await readFile(full, "utf8");
      const route = "/" + segments.map((segment) => segment.replace(/^\[(.+)\]$/, "{$1}")).join("/");
      for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
        const exported = new RegExp(`export\\s+(?:(?:async\\s+)?function\\s+${method}\\b|const\\s+${method}\\b|\\{[^}]*\\b${method}\\b)`);
        if (exported.test(source)) actual.push(`${method.toLowerCase()} ${route}`);
      }
    }
  }
}
await visit(root);
const documented = Object.entries(openapi.paths).flatMap(([route, operations]) =>
  Object.keys(operations).filter((key) => /^(get|post|put|patch|delete|head|options)$/.test(key)).map((method) => `${method} ${route}`));
const a = actual.sort();
const d = documented.sort();
console.log("MISSING FROM DOC:");
a.filter((x) => !d.includes(x)).forEach((x) => console.log("  " + x));
console.log("DOCUMENTED BUT NOT REAL:");
d.filter((x) => !a.includes(x)).forEach((x) => console.log("  " + x));
