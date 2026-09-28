import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import openapi from "../src/app/lib/openapi.js";

// Execute the real route with the database boundary injected.
const source = readFileSync(new URL("../src/app/api/products/route.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replace("export async function GET", "async function GET");
const createHandler = new Function("connectDB", "Product", "Category", "console", `${source}\nreturn GET;`);
const request = new Request("https://shop.example.com/api/products");
function setup(records, fail = false) {
  const calls = {};
  const Category = {};
  const query = {
    select(value) { calls.select = value; return this; },
    populate(value) { calls.populate = value; return this; },
    sort(value) { calls.sort = value; return this; },
    async lean() { return records; },
  };
  const GET = createHandler(async () => { calls.connected = true; if (fail) throw new Error("private DB error"); }, { find(filter) { calls.filter = filter; return query; } }, Category, { error() {} });
  return { GET, calls, Category };
}

test("AI catalog uses the database, public visibility rules and the existing contract", async () => {
  const record = { _id: "507f1f77bcf86cd799439011", productName: "Leather bag", slug: "leather-bag", description: "Handcrafted bag", category: { categoryName: "Bags" }, brand: "Aba", price: 25000, quantity: 2, productImages: ["https://example.com/bag.jpg"], notes: "Private", createdBy: "owner-id" };
  const { GET, calls, Category } = setup([record]);
  const response = await GET(request);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(calls.connected, true);
  assert.deepEqual(calls.filter, { isActive: true, isPublished: true, status: "approved", slug: { $type: "string", $regex: /\S/ } });
  assert.deepEqual(calls.populate, { path: "category", select: "categoryName", model: Category });
  assert.ok(!calls.select.includes("notes"));
  assert.deepEqual(body, { success: true, totalItems: 1, data: [{ id: record._id, productName: "Leather bag", slug: "leather-bag", description: "Handcrafted bag", category: "Bags", brand: "Aba", price: 25000, currency: "NGN", quantity: 2, inStock: true, productImages: record.productImages, productLink: "https://shop.example.com/dashboard/products/leather-bag" }] });
});
test("missing optional details and sold-out products keep a consistent shape", async () => {
  const { GET } = setup([{ _id: "id", productName: "Bag", slug: "bag & shoes", price: 10, quantity: 0, inStock: true }]);
  const { data } = await (await GET(request)).json();
  assert.equal(data[0].inStock, false);
  assert.equal(data[0].category, "Unassigned");
  assert.equal(data[0].description, "");
  assert.deepEqual(data[0].productImages, []);
  assert.equal(data[0].productLink, "https://shop.example.com/dashboard/products/bag%20%26%20shoes");
});
test("empty database result returns an empty catalog rather than dummy products", async () => {
  const { GET } = setup([]);
  assert.deepEqual(await (await GET(request)).json(), { success: true, data: [], totalItems: 0 });
});
test("database failures return 500 without leaking connection details or dummy data", async () => {
  const { GET } = setup([], true);
  const response = await GET(request);
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { success: false, message: "Unable to load product catalog. Please try again." });
});
test("AI catalog documentation requires an absolute product link", () => {
  const operation = openapi.paths["/products"].get;
  const schema = operation.responses[200].content["application/json"].schema.properties.data.items;
  assert.ok(schema.required.includes("productLink"));
  assert.equal(schema.properties.productLink.format, "uri");
  assert.deepEqual(operation.security, []);
  assert.ok(!operation.description.includes("mock"));
});
