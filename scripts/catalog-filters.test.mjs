import test from "node:test";
import assert from "node:assert/strict";
import { filterCatalog } from "../src/app/lib/catalog-filters.js";

const defaults = { min: "", max: "", brands: [], rating: "", discount: "", inStock: false, sort: "popular" };
const products = [
  { productName: "Bag", price: 10000, discountPrice: 3000, brand: "Aba", rating: 4.5, reviewCount: 3, quantity: 2, sold: 5 },
  { productName: "Wallet", price: 8000, brand: "Craft", rating: 3, reviewCount: 1, quantity: 0, sold: 10 },
  { productName: "Belt", price: 2000, brand: "Aba", rating: 0, reviewCount: 0, quantity: 3, sold: 0 },
];
test("catalog combines price, brand, ratings, discounts and availability using discounted prices", () => {
  const result = filterCatalog(products, { ...defaults, min: "6000", max: "7500", brands: ["Aba"], rating: "4", discount: "20", inStock: true });
  assert.deepEqual(result.map((p) => p.productName), ["Bag"]);
  assert.deepEqual(filterCatalog(products, { ...defaults, min: "8000", max: "1000" }), []);
});
test("catalog sorts by actual selling price and popularity without mutating input", () => {
  assert.deepEqual(filterCatalog(products, { ...defaults, sort: "price-asc" }).map((p) => p.productName), ["Belt", "Bag", "Wallet"]);
  assert.deepEqual(filterCatalog(products, defaults).map((p) => p.productName), ["Wallet", "Bag", "Belt"]);
  assert.deepEqual(filterCatalog(products, { ...defaults, sort: "rating" }).map((p) => p.productName), ["Bag", "Wallet", "Belt"]);
  assert.equal(products[0].productName, "Bag");
  assert.deepEqual(filterCatalog([], defaults), []);
});
