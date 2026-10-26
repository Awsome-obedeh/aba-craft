import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateProductInput } from "../src/app/lib/product-input.js";
import * as productCreate from "../src/app/lib/product-create.js";

// Execute the real route with the database, auth and validation boundaries injected.
const source = readFileSync(new URL("../src/app/api/products/route.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
const createRoutes = new Function("connectDB", "verifyAuth", "validateProductInput", "Product", "Category", "Business", "console", "findDuplicateProduct", "createProduct", `${source}\nreturn { GET, POST };`);

const productInput = () => ({
  productName: "Leather Oxford Shoes",
  category: "507f1f77bcf86cd799439011",
  description: "Handmade leather oxford shoes.",
  brand: "Aba Leather",
  price: "35000",
  quantity: "20",
  stockAlert: "5",
  productImages: ["https://example.com/shoe.jpg"],
});

function setup(overrides = {}) {
  const created = [];
  const state = {
    auth: { isValid: true, user: { id: "owner-1", role: "vendor" } },
    business: { _id: "business-1" },
    duplicate: null,
    takenSlugs: new Set(),
    categoryExists: true,
    ...overrides,
  };
  const routes = createRoutes(
    async () => {},
    async () => state.auth,
    validateProductInput,
    {
      exists: async ({ slug }) => (state.takenSlugs.has(slug) ? { _id: "other-product" } : null),
      findOne: async () => state.duplicate,
      create: async (document) => {
        created.push(document);
        return { _id: "product-1", ...document };
      },
    },
    { exists: async () => state.categoryExists },
    { findOne: async () => state.business },
    { error() {} },
    productCreate.findDuplicateProduct,
    productCreate.createProduct,
  );
  return { ...routes, created, state };
}

function postRequest(body) {
  return new Request("https://shop.example.com/api/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("a vendor creates a product that waits for admin review", async () => {
  const api = setup();
  const response = await api.POST(postRequest(productInput()));
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.message, "Product submitted for admin review");
  assert.equal(api.created.length, 1);
  const created = api.created[0];
  assert.equal(created.productName, "Leather Oxford Shoes");
  assert.equal(created.price, 35000);
  assert.equal(created.quantity, 20);
  assert.equal(created.createdBy, "owner-1");
  assert.equal(String(created.businessId), "business-1");
  assert.equal(created.slug, "leather-oxford-shoes");
  assert.equal(created.status, "under_review");
  assert.equal(created.isPublished, false);
});

test("saving a draft keeps the product unpublished", async () => {
  const api = setup();
  const response = await api.POST(postRequest({ productName: "Unfinished bag", saveAsDraft: true }));
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.message, "Product saved as draft");
  assert.equal(api.created[0].status, "draft");
  assert.equal(api.created[0].isPublished, false);
});

test("unauthenticated and unauthorized requests are rejected", async () => {
  const api = setup({ auth: { isValid: false, status: 401, message: "Please sign in." } });
  const response = await api.POST(postRequest(productInput()));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { success: false, message: "Please sign in." });
  assert.equal(api.created.length, 0);
});

test("invalid product input is rejected before anything is written", async () => {
  const api = setup();
  const response = await api.POST(postRequest({ ...productInput(), price: "0" }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
  assert.equal(api.created.length, 0);
});

test("a malformed body is rejected with a readable message", async () => {
  const api = setup();
  const response = await api.POST(new Request("https://shop.example.com/api/products", { method: "POST", body: "not json" }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
  assert.equal(api.created.length, 0);
});

test("a vendor without an active business profile cannot publish", async () => {
  const api = setup({ business: null });
  const response = await api.POST(postRequest(productInput()));
  assert.equal(response.status, 403);
  assert.equal((await response.json()).success, false);
  assert.equal(api.created.length, 0);
});

test("an admin can create a product without owning a business", async () => {
  const api = setup({ auth: { isValid: true, user: { id: "admin-1", role: "admin" } }, business: null });
  const response = await api.POST(postRequest(productInput()));
  assert.equal(response.status, 201);
  assert.equal(api.created[0].createdBy, "admin-1");
  assert.equal(api.created[0].businessId, undefined);
});

test("a duplicate product name is rejected with 409", async () => {
  const api = setup({ duplicate: { _id: "product-1" } });
  const response = await api.POST(postRequest(productInput()));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).message, "Product with this name already exists");
  assert.equal(api.created.length, 0);
});

test("a taken slug is suffixed so the unique index never collides", async () => {
  const api = setup({ takenSlugs: new Set(["leather-oxford-shoes"]) });
  const response = await api.POST(postRequest(productInput()));
  assert.equal(response.status, 201);
  assert.equal(api.created[0].slug, "leather-oxford-shoes-2");
});

test("an unknown category is rejected before the product is stored", async () => {
  const api = setup({ categoryExists: false });
  const response = await api.POST(postRequest(productInput()));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).message, "Select a valid category.");
  assert.equal(api.created.length, 0);
});
