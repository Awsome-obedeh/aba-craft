import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateProductUpdate } from "../src/app/lib/product-update.js";

// Inject database/auth boundaries while exercising the actual route handlers.
const source = readFileSync(new URL("../src/app/api/test/products/[slug]/route.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
const createRoutes = new Function("connectDB", "verifyAuth", "Product", "Category", "validateProductUpdate", "NextResponse", `${source}\nreturn { GET, PUT, DELETE };`);
const context = { params: Promise.resolve({ slug: "leather-bag" }) };
const record = { _id: "product-1", productName: "Leather bag", status: "draft", category: "507f1f77bcf86cd799439011", quantity: 0, price: 0, productImages: [], notes: "Private note" };
function setup(role = "vendor", found = record) {
  const queries = [], updates = [], selections = [];
  const chain = value => ({ select(value) { selections.push(value); return this; }, populate() { return this; }, lean: async () => value, then: resolve => Promise.resolve(value).then(resolve) });
  const routes = createRoutes(async () => {}, async () => ({ isValid: true, user: { id: "owner-1", role } }), {
    findOne(filter) { queries.push(filter); return chain(found); },
    findOneAndUpdate(filter, update) { updates.push({ filter, update }); return chain(found); },
  }, { findOne: async () => null, exists: async () => true }, validateProductUpdate, { json: (body, options) => ({ body, status: options?.status || 200 }) });
  return { ...routes, queries, updates, selections };
}
test("vendor detail returns a draft using only the owner query and includes private notes", async () => {
  const api = setup();
  const res = await api.GET({}, context);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.notes, "Private note");
  assert.deepEqual(api.queries, [{ slug: "leather-bag", isActive: true, createdBy: "owner-1" }]);
  assert.deepEqual(api.selections, ["+notes"]);
});
test("missing customer detail returns 404 and queries only published approved products", async () => {
  const api = setup("customer", null);
  assert.equal((await api.GET({}, context)).status, 404);
  assert.deepEqual(api.queries[0], { slug: "leather-bag", isActive: true, isPublished: true, status: "approved" });
  assert.deepEqual(api.selections, []);
});
test("editing preserves ownership and moderation controls and updates stock", async () => {
  const api = setup();
  const res = await api.PUT({ json: async () => ({ quantity: 4, createdBy: "someone-else", status: "approved", isPublished: true }) }, context);
  assert.equal(res.status, 200);
  assert.equal(api.updates[0].filter.createdBy, "owner-1");
  const fields = api.updates[0].update.$set;
  assert.equal(fields.inStock, true);
  assert.equal(fields.notes, "Private note");
  for (const key of ["createdBy", "status", "isPublished"]) assert.equal(key in fields, false);
});
test("invalid quantity is rejected without writing", async () => {
  const api = setup();
  assert.equal((await api.PUT({ json: async () => ({ quantity: -1 }) }, context)).status, 400);
  assert.equal(api.updates.length, 0);
});
test("deleting is restricted to an active product owned by the vendor", async () => {
  const api = setup();
  assert.equal((await api.DELETE({}, context)).status, 200);
  assert.deepEqual(api.updates[0], { filter: { slug: "leather-bag", isActive: true, createdBy: "owner-1" }, update: { isActive: false } });
});
test("missing or unowned products cannot be edited or deleted", async () => {
  const api = setup("vendor", null);
  assert.equal((await api.PUT({ json: async () => ({ quantity: 1 }) }, context)).status, 404);
  assert.equal((await api.DELETE({}, context)).status, 404);
});
