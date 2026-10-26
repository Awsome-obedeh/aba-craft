import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { marketplaceFilter, marketplacePrice, marketplaceProduct } from "../src/app/lib/marketplace.js";
import { matchesMarketplace, recentSearches, trendingSearches } from "../src/app/lib/marketplace-search.js";

const source = readFileSync(new URL("../src/app/api/marketplace/route.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replace('export const runtime = "nodejs";', "").replace("export async function GET", "async function GET");
const handler = new Function("connectDB", "Product", "Category", "Business", "User", "Review", "Order", "marketplaceFilter", "marketplaceProduct", "console", `${source}\nreturn GET;`);
function fixture(records = [], fail = false) {
  const calls = { populate: [] };
  const query = { select(value) { calls.select = value; return this; }, populate(value) { calls.populate.push(value); return this; }, sort() { return this; }, async lean() { return records; } };
  const GET = handler(async () => { if (fail) throw new Error("secret database URI"); }, { find(filter) { calls.filter = filter; return query; } }, {}, {}, {},
    { async aggregate(pipeline) { calls.reviews = pipeline; return [{ _id: "product", rating: 4.5, count: 2 }]; } },
    { async aggregate(pipeline) { calls.sales = pipeline; return [{ _id: "product", sold: 7 }]; } },
    marketplaceFilter, marketplaceProduct, { error() {} });
  return { GET, calls };
}
const product = { _id: "product", slug: "leather-bag", productName: "Leather Bag", price: 10000, quantity: 3,
  discountPrice: 2000, category: { categoryName: "Hand Bags" }, businessId: { businessName: "Aba Workshop", sellerRole: "wholesaler_producer", bvnEncrypted: "private" },
  createdBy: { role: "vendor", email: "private@example.com" }, productImages: ["https://example.com/bag.jpg"], notes: "private" };

test("marketplace queries only active, published, approved vendor listings", async () => {
  const { GET, calls } = fixture([product, { ...product, _id: "admin-product", createdBy: { role: "admin" } }, { ...product, _id: "deleted-vendor", createdBy: null }]);
  const response = await GET(); const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(calls.filter, { isActive: true, isPublished: true, status: "approved", slug: { $type: "string", $regex: /\S/ } });
  assert.deepEqual(calls.populate[2].match, { role: "vendor" });
  assert.equal(body.totalItems, 1);
  assert.equal(body.data[0].manufacturer, "Aba Workshop");
  assert.equal(body.data[0].wholesale, true);
  assert.equal(body.data[0].rating, 4.5);
  assert.equal(body.data[0].sold, 7);
  assert.equal(body.data[0].notes, undefined);
  assert.equal(body.data[0].createdBy, undefined);
  assert.equal(body.data[0].businessId, undefined);
  assert.deepEqual(calls.sales[0].$match, { paymentStatus: "paid", status: { $ne: "cancelled" }, "items.product": { $in: ["product"] } });
});
test("marketplace prices use the existing discount-amount convention and compare-at price", () => {
  assert.deepEqual(marketplacePrice({ price: 10000, discountPrice: 2000 }), { current: 8000, original: 10000, discount: 20 });
  assert.deepEqual(marketplacePrice({ price: 10000, discountPercentage: 25 }), { current: 7500, original: 10000, discount: 25 });
  assert.deepEqual(marketplacePrice({ price: 8000, compareAtPrice: 10000 }), { current: 8000, original: 10000, discount: 20 });
  assert.deepEqual(marketplacePrice({ price: 0 }), { current: 0, original: 0, discount: 0 });
});
test("missing product metrics are not replaced with fabricated ratings or sales", () => {
  const result = marketplaceProduct({ _id: "p", productName: "Wallet", price: 2000 });
  assert.equal(result.rating, 0); assert.equal(result.reviewCount, 0); assert.equal(result.sold, 0);
  assert.equal(result.wholesale, false); assert.equal(result.quantity, 0);
  assert.deepEqual(result.productImages, []);
});
test("search combines words, category and wholesale or retail without leaking the other seller type", () => {
  const wholesale = { productName: "Premium Leather Bag", brand: "Aba", category: "Hand bags", wholesale: true };
  assert.equal(matchesMarketplace(wholesale, { search: " bag PREMIUM ", category: "Hand bags", mode: "wholesale" }), true);
  assert.equal(matchesMarketplace(wholesale, { search: "aba", mode: "retail" }), false);
  assert.equal(matchesMarketplace({ ...wholesale, wholesale: false }, { search: "leather", mode: "retail" }), true);
  assert.equal(matchesMarketplace(wholesale, { category: "Shoes" }), false);
  assert.equal(matchesMarketplace(wholesale, { search: "wallet" }), false);
});
test("recent searches normalize whitespace, deduplicate case-insensitively and limit saved history", () => {
  assert.deepEqual(recentSearches(["Leather bags", "Wallets"], " leather   BAGS "), ["leather BAGS", "Wallets"]);
  assert.deepEqual(recentSearches([{}, null, 123, "", "Belts"], ""), ["Belts"]);
  assert.equal(recentSearches(Array.from({ length: 25 }, (_, index) => `Term ${index}`), "New search").length, 20);
  assert.equal(recentSearches([], "a".repeat(150))[0].length, 120);
});
test("trending categories are deduplicated and ranked using catalog sales for the selected seller type", () => {
  const products = [{ productName: "Bag", category: "Bags", wholesale: true, sold: 5 }, { productName: "Belt", category: "Belts", wholesale: false, sold: 20 }, { productName: "Other bag", category: "Bags", wholesale: true, sold: 2 }];
  assert.deepEqual(trendingSearches(products), ["Belts", "Bags"]);
  assert.deepEqual(trendingSearches(products, "wholesale"), ["Bags"]);
  assert.deepEqual(trendingSearches([], "retail"), []);
});
test("empty catalog stays empty and database errors do not leak secrets", async () => {
  const empty = await (await fixture().GET()).json();
  assert.deepEqual(empty, { success: true, data: [], totalItems: 0 });
  const response = await fixture([], true).GET();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { success: false, message: "Unable to load the marketplace. Please try again." });
});
