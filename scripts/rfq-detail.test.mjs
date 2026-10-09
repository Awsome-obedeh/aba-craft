import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/app/api/rfqs/vendor/[id]/route.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
const createRoute = new Function("connectDB", "verifyAuth", "Rfq", `${source}\nreturn { GET, PATCH };`);
const id = "507f1f77bcf86cd799439011";
const context = { params: Promise.resolve({ id }) };
function setup({ auth = { isValid: true, user: { id: "vendor-1" } }, found = { _id: id, notes: "Buyer requirements" } } = {}) {
  const queries = [], roles = [], updates = [];
  const routes = createRoute(async () => {}, async (_, allowed) => { roles.push(allowed); return auth; }, {
    findOneAndUpdate(query, update, options) { updates.push({ query, update, options }); return { lean: async () => found }; },
    findOne(query) { queries.push(query); return { lean: async () => found }; },
  });
  return { ...routes, queries, roles, updates };
}

test("RFQ detail requires vendor authentication and only returns an owned request", async () => {
  const route = setup();
  const response = await route.GET({}, context);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal((await response.json()).request.notes, "Buyer requirements");
  assert.deepEqual(route.roles, [["vendor"]]);
  assert.deepEqual(route.queries, [{ _id: id, vendor: "vendor-1" }]);
});

test("missing and unowned RFQs return 404", async () => {
  const route = setup({ found: null });
  assert.equal((await route.GET({}, context)).status, 404);
  assert.equal((await route.GET({}, { params: Promise.resolve({ id: "invalid" }) })).status, 404);
  assert.equal(route.queries.length, 1);
});

test("unauthorized requests never query RFQ data", async () => {
  const route = setup({ auth: { isValid: false, status: 403, message: "Forbidden" } });
  assert.equal((await route.GET({}, context)).status, 403);
  assert.deepEqual(route.queries, []);
});

test("declining updates only an owned open RFQ to rejected", async () => {
  const route = setup({ found: { _id: id, status: "rejected" } });
  const response = await route.PATCH({ json: async () => ({ action: "decline", status: "accepted", vendor: "another-vendor" }) }, context);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).request.status, "rejected");
  assert.deepEqual(route.updates, [{
    query: { _id: id, vendor: "vendor-1", status: { $in: ["new", "awaiting_response", "responded"] } },
    update: { $set: { status: "rejected" } }, options: { new: true, runValidators: true },
  }]);
});

test("invalid or unauthorized decline actions cannot write", async () => {
  const route = setup();
  assert.equal((await route.PATCH({ json: async () => ({ action: "accept" }) }, context)).status, 400);
  assert.equal((await route.PATCH({ json: async () => { throw new Error("Invalid JSON"); } }, context)).status, 400);
  assert.equal((await route.PATCH({ json: async () => ({ action: "decline" }) }, { params: Promise.resolve({ id: "invalid" }) })).status, 404);
  assert.deepEqual(route.updates, []);
  const denied = setup({ auth: { isValid: false, status: 403, message: "Forbidden" } });
  assert.equal((await denied.PATCH({}, context)).status, 403);
  assert.deepEqual(denied.updates, []);
});

test("unowned or deleted RFQs cannot be declined", async () => {
  const route = setup({ found: null });
  assert.equal((await route.PATCH({ json: async () => ({ action: "decline" }) }, context)).status, 404);
});

test("closed RFQs return a conflict without changing their status", async () => {
  const closed = { _id: id, status: "accepted" };
  const PATCH = createRoute(async () => {}, async () => ({ isValid: true, user: { id: "vendor-1" } }), {
    findOneAndUpdate: () => ({ lean: async () => null }),
    findOne: () => ({ lean: async () => closed }),
  }).PATCH;
  assert.equal((await PATCH({ json: async () => ({ action: "decline" }) }, context)).status, 409);
  assert.equal(closed.status, "accepted");
});
