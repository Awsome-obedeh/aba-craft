// Registers the `@/` alias resolver hook for plain-Node scripts.
// Used via: node --import ./scripts/register-hook.mjs <script>

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./alias-hook.mjs", pathToFileURL("./scripts/"));
