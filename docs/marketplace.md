# Marketplace

Buyers default to `/market-place` after sign-in. An explicit return URL from a protected action is still respected. Vendor and administrator sign-in destinations remain role-specific.

`GET /api/marketplace` fetches all active, published products with `status: approved` and a usable slug. The endpoint requires each product owner to exist and have the vendor role. It exposes only safe catalog fields, category name, manufacturer name, wholesale classification, and actual product metrics. Reviews are aggregated from BuyerReview; sold counts come from paid, non-cancelled orders. The existing `/api/products` contract is preserved.

The responsive storefront follows the reference order:

1. Search and category header, leather promotion and six collection tiles.
2. Flash Sales: products with a real discount or compare-at saving.
3. Abacraft Storefront / Marketplace: all matching approved products, initially showing ten with See All.
4. Popular: customer-rated or featured products, ordered by rating and review count. Refresh cycles available results.
5. Featured Wholesale Deals: products belonging to businesses with `sellerRole: wholesaler_producer`, with featured listings first. Request Quote opens an existing vendor conversation for the buyer to discuss requirements.
6. Top Seller Deals: actual paid sales, ordered by units sold. Save buttons use the buyer wishlist API; the progress bar shows sold units as a share of sold plus remaining stock.
7. Last Viewed: buyer history and browser viewing history, filtered against the currently approved catalog.
8. Dark footer with account and support links.

Product cards open the existing product details page. Cart uses the existing cart store and checkout route. The marketplace restores an existing session without blocking public catalog browsing. Category/search filters and See All operate on the fetched catalog.

Focusing the header search input or pressing Search opens the search dialog. It provides wholesale/retail toggles (press the active toggle again for all seller types), three live product suggestions, recent-search chips with Clear All, and trending categories weighted by catalog sales. Submitting or choosing a chip applies the query and seller type to the marketplace and scrolls to the storefront. Recent searches are kept locally under a user-specific key, normalized, deduplicated and limited to 20. Clear filters resets the query, category and seller type. The dialog traps keyboard focus, closes with Escape or an outside click, restores focus to Search, and prevents background interaction and scrolling.

Unpublished, pending, rejected and inactive products are excluded. Product sections show honest empty states when there are no matching records. Sale countdowns, review counts, sales, production estimates and capacity are not fabricated; production details are confirmed with the manufacturer because the existing models do not store them.

Validation: `node --test scripts/marketplace.test.mjs scripts/ai-products.test.mjs` and `npm run build`. Catalog tests inject the database boundary and check visibility, serialization, pricing, empty results and failure responses.
