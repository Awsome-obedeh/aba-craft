import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import SwaggerParser from "@apidevtools/swagger-parser";
import openapi from "../src/app/lib/openapi.js";

test("OpenAPI schema and references are valid", async () => {
  await SwaggerParser.validate(structuredClone(openapi), { resolve: { external: false } });
});

test("every active API method is documented and test routes are excluded", async () => {
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
  assert.deepEqual(documented.sort(), actual.sort());
  assert.ok(!Object.keys(openapi.paths).some((route) => route.startsWith("/test")));
  const ids = Object.values(openapi.paths).flatMap((item) => Object.values(item).map((operation) => operation.operationId));
  assert.equal(new Set(ids).size, ids.length, "operationId must be unique");
});

test("multipart signup matches the handler's string JSON fields and binary file", () => {
  const properties = openapi.components.schemas.SellerSignupForm.properties;
  assert.equal(properties.account.type, "string");
  assert.equal(JSON.parse(properties.account.example).acceptedTerms, true);
  assert.equal(properties.business.type, "string");
  assert.equal(JSON.parse(properties.business.example).businessType, "leather_retailer");
  assert.equal(properties.cacDocument.format, "binary");
  assert.deepEqual(openapi.paths["/auth/documents/{businessId}"].get.security, [{ bearerAuth: [] }]);
  assert.deepEqual(openapi.paths["/auth/refresh"].post.security, [{ refreshCookie: [] }]);
});
