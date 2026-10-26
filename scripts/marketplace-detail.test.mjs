import test from "node:test";
import assert from "node:assert/strict";
import { createMarketplaceDetailService, validateComment, publicComment } from "../src/app/lib/server/marketplace-detail-service.js";

function fixture({ vendor = true, purchase = false } = {}) {
  const comments = [];
  const calls = {};
  const product = { _id: "product", slug: "shoe", productName: "Leather Shoes", price: 25000, quantity: 4,
    category: { _id: "category", categoryName: "Shoes" }, businessId: { businessName: "Aba maker", verificationStatus: "verified", city: "Aba", state: "Abia" }, createdBy: vendor ? { role: "vendor" } : null };
  function chain(result) {
    return { select() { return this; }, populate() { return this; }, sort() { return this; }, skip(value) { calls.skip = value; return this; }, limit(value) { calls.limit = value; return this; }, async lean() { return result; } };
  }
  const service = createMarketplaceDetailService({ connect: async () => {},
    Product: { findOne(filter) { calls.productFilter = filter; return chain(product); }, find(filter) { calls.similarFilter = filter; return chain([{ ...product, _id: "other", slug: "other" }]); } },
    Category: {}, Business: {},
    User: { findById() { return { select: async () => ({ fullName: "Ada Obi", email: "private" }) }; } },
    Review: { find() { return chain([{ _id: "review", rating: 5, text: "Great shoes", createdAt: new Date() }]); }, async aggregate() { return [{ rating: 5, count: 1 }]; } },
    Order: { async exists(filter) { calls.purchaseFilter = filter; return purchase ? { _id: "order" } : null; } },
    Comment: {
      async findOne(filter) { return comments.find((comment) => Object.entries(filter).every(([key, value]) => comment[key] === value)) || null; },
      async create(input) { const record = { _id: `comment-${comments.length}`, ...input, createdAt: new Date() }; comments.push(record); return record; },
      find(filter) { calls.commentsFilter = filter; return chain(comments); },
    },
  });
  return { service, comments, calls };
}

test("product details and similar listings enforce public approval and vendor ownership", async () => {
  const f = fixture(); const result = await f.service.detail("shoe");
  assert.equal(result.product.productName, "Leather Shoes");
  assert.equal(result.product.seller.location, "Aba, Abia");
  assert.equal(result.product.seller.verified, true);
  assert.equal(result.product.rating, 5);
  assert.equal(result.reviews[0].verifiedPurchase, true);
  assert.equal(result.product.createdBy, undefined);
  assert.equal(f.calls.productFilter.status, "approved");
  assert.equal(f.calls.productFilter.isPublished, true);
  assert.equal(f.calls.productFilter.isActive, true);
  assert.equal(f.calls.similarFilter.category, "category");
  assert.deepEqual(f.calls.similarFilter._id, { $ne: "product" });
  await assert.rejects(fixture({ vendor: false }).service.detail("shoe"), (error) => error.status === 404);
});
test("comments validate text and request IDs and do not accept spoofed identities", async () => {
  assert.throws(() => validateComment({ text: "  ", clientId: "request-123" }));
  assert.throws(() => validateComment({ text: "a".repeat(2001), clientId: "request-123" }));
  assert.throws(() => validateComment({ text: "hello", clientId: "invalid!" }));
  const f = fixture();
  await assert.rejects(f.service.addComment("shoe", { id: "vendor", role: "vendor" }, { text: "hello", clientId: "request-123" }), (error) => error.status === 403);
  const result = await f.service.addComment("shoe", { id: "buyer", role: "customer" }, { text: "  Is size 42 available?  ", clientId: "request-123", authorName: "Admin", authorId: "admin", verifiedPurchase: true });
  assert.equal(result.comment.authorName, "Ada Obi");
  assert.equal(result.comment.text, "Is size 42 available?");
  assert.equal(result.comment.verifiedPurchase, false);
  assert.equal(result.comment.authorId, undefined);
  assert.equal(f.comments[0].authorId, "buyer");
});
test("purchase verification is derived from a paid order and retries cannot duplicate comments", async () => {
  const f = fixture({ purchase: true });
  const user = { id: "buyer", role: "customer" }; const body = { text: "Comfortable shoes", clientId: "request-123" };
  const first = await f.service.addComment("shoe", user, body);
  const second = await f.service.addComment("shoe", user, body);
  assert.equal(first.comment.verifiedPurchase, true);
  assert.equal(first.comment.id, second.comment.id);
  assert.equal(f.comments.length, 1);
  assert.deepEqual(f.calls.purchaseFilter, { customer: "buyer", paymentStatus: "paid", status: { $ne: "cancelled" }, "items.product": "product" });
});
test("comment pages are bounded and never expose private database fields", async () => {
  const f = fixture();
  for (let index = 0; index < 11; index++) f.comments.push({ _id: String(index), productId: "product", authorId: "private", authorName: "Buyer", clientId: "private", text: "hello", createdAt: new Date() });
  const result = await f.service.comments("shoe", "2");
  assert.equal(result.comments.length, 10); assert.equal(result.hasMore, true);
  assert.equal(f.calls.skip, 10); assert.equal(f.calls.limit, 11);
  assert.equal(result.comments[0].authorId, undefined);
  assert.equal(publicComment(f.comments[0]).clientId, undefined);
  for (const page of ["0", "-1", "1.5", "bad", "10001"]) await assert.rejects(f.service.comments("shoe", page));
});
