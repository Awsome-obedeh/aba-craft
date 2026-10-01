// Resolver hook so the escrow smoke test can run under plain Node.
//
// Two things the app gets for free from Next.js that Node does not:
//   1. the `@/` -> `src/` alias
//   2. extensionless imports (Next resolves `foo` to `foo.js`)
//
// Without this hook the test crashes on the first aliased import.

import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const SRC_DIR = path.resolve(process.cwd(), "src") + path.sep;
const SRC_URL = pathToFileURL(SRC_DIR).href;

export async function resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) {
        return nextResolve(specifier, context);
    }

    const target = path.join(SRC_DIR, specifier.slice(2));

    // If the path has no extension and a .js file exists, use it — this is what
    // Next's resolver does for us inside the app.
    if (!path.extname(target) && fs.existsSync(target + ".js")) {
        return nextResolve(pathToFileURL(target + ".js").href, context);
    }

    return nextResolve(SRC_URL + specifier.slice(2), context);
}
