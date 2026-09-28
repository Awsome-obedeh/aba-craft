import test from "node:test";
import assert from "node:assert/strict";
import { validateProductUpdate } from "../src/app/lib/product-update.js";

const product = { productName: "Leather bag", description: "Handcrafted leather bag", category: "507f1f77bcf86cd799439011", price: 15000, quantity: 4, productImages: ["https://example.com/front.jpg", "https://example.com/back.jpg"], status: "approved", isPublished: true, sku: "BAG-01", notes: "Internal instructions", discountPrice: 0 };

test("editing an active listing preserves moderation and omitted details", () => {
  const fields = validateProductUpdate(product, { availability: "in_stock", price: 16000, status: "approved", isPublished: false, createdBy: "other-user" });
  assert.equal(fields.price, 16000);
  assert.equal(fields.sku, "BAG-01");
  assert.equal(fields.notes, "Internal instructions");
  assert.deepEqual(fields.productImages, product.productImages);
  for (const key of ["status", "isPublished", "createdBy"]) assert.equal(key in fields, false);
});
test("out-of-stock always sets inventory to zero", () => {
  const fields = validateProductUpdate(product, { availability: "out_of_stock", quantity: 25 });
  assert.equal(fields.quantity, 0);
  assert.equal(fields.inStock, false);
});
test("saving a draft unpublishes the listing and permits an empty category and gallery", () => {
  const fields = validateProductUpdate(product, { availability: "draft", category: "", description: "", productImages: [] });
  assert.equal(fields.status, "draft");
  assert.equal(fields.isPublished, false);
  assert.equal(fields.category, undefined);
  assert.deepEqual(fields.productImages, []);
});
test("reactivating a draft requires review and cannot bypass approval", () => {
  const fields = validateProductUpdate({ ...product, status: "draft" }, { availability: "in_stock", status: "approved", isPublished: true });
  assert.equal(fields.status, "under_review");
  assert.equal(fields.isPublished, false);
});
test("invalid stock, categories, pricing and images cannot be saved as active", () => {
  for (const changes of [{ quantity: 0 }, { category: "" }, { price: 0 }, { productImages: [] }, { discountPrice: 20000 }, { productImages: ["javascript:bad"] }, { availability: "approved" }]) {
    assert.throws(() => validateProductUpdate(product, { availability: "in_stock", ...changes }));
  }
});
test("image removal, replacement and cover order are saved exactly", () => {
  const images = ["https://example.com/new-cover.jpg", product.productImages[1]];
  assert.deepEqual(validateProductUpdate(product, { productImages: images }).productImages, images);
});
