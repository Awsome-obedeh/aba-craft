import test from "node:test";
import assert from "node:assert/strict";
import { validateProductInput } from "../src/app/lib/product-input.js";
import Product from "../src/models/Products.js";

const input = () => ({ productName: "Leather Bag", description: "Handcrafted leather bag", category: "507f1f77bcf86cd799439011", price: "25000", quantity: "0", productImages: ["https://example.com/bag.jpg"] });

test("publishing an out-of-stock product preserves fields and requires review", async () => {
  const fields = validateProductInput({ ...input(), sku: "BAG-01", compareAtPrice: "30000", shortDescription: "Everyday bag", weight: "1.2", stockAlert: "5", status: "approved", isPublished: true });
  assert.equal(fields.quantity, 0);
  assert.equal(fields.status, "under_review");
  assert.equal(fields.isPublished, false);
  const product = new Product({ ...fields, createdBy: "507f1f77bcf86cd799439012" });
  await product.validate();
  assert.equal(product.sku, "BAG-01");
  assert.equal(product.compareAtPrice, 30000);
  assert.equal(product.weight, 1.2);
});

test("a name-only draft is valid in both input validation and the product schema", async () => {
  const fields = validateProductInput({ productName: "Unfinished bag", saveAsDraft: true });
  const product = new Product({ ...fields, createdBy: "507f1f77bcf86cd799439012" });
  await product.validate();
  assert.equal(product.status, "draft");
  assert.equal(product.isPublished, false);
});

test("invalid submissions and malformed pricing are rejected", () => {
  for (const changes of [{ productName: "" }, { description: "" }, { category: "invalid" }, { price: 0 }, { quantity: -1 }, { quantity: 1.2 }, { stockAlert: 1.5 }, { price: Infinity }, { productImages: [] }, { productImages: ["javascript:bad"] }, { compareAtPrice: 100 }, { discountPrice: 30000 }]) {
    assert.throws(() => validateProductInput({ ...input(), ...changes }));
  }
});
