import test from "node:test";
import assert from "node:assert/strict";
import { productFormErrors } from "../src/app/lib/product-form-validation.js";

test("empty publishing returns every required field error together", () => {
  assert.deepEqual(Object.keys(productFormErrors({})).sort(), ["category", "description", "price", "productImages", "productName", "quantity"]);
});

test("drafts require a name but allow incomplete publishing fields", () => {
  assert.deepEqual(Object.keys(productFormErrors({}, { draft: true })), ["productName"]);
  assert.deepEqual(productFormErrors({ productName: "Leather bag" }, { draft: true }), {});
});

test("corrections clear errors and out-of-stock products allow zero quantity", () => {
  const form = { productName: "Leather bag", category: "507f1f77bcf86cd799439011", description: "Handmade bag", price: "500", quantity: "0" };
  assert.deepEqual(Object.keys(productFormErrors(form, { imageCount: 1 })), ["quantity"]);
  assert.deepEqual(productFormErrors(form, { imageCount: 1, availability: "out_of_stock" }), {});
  assert.deepEqual(productFormErrors({ ...form, quantity: "1" }, { imageCount: 1 }), {});
});

test("optional numeric errors are assigned to their inputs even when saving drafts", () => {
  const errors = productFormErrors({ productName: "Leather bag", price: "500", compareAtPrice: "400", weight: "-1", stockAlert: "1.5" }, { draft: true });
  assert.deepEqual(Object.keys(errors).sort(), ["compareAtPrice", "stockAlert", "weight"]);
});
