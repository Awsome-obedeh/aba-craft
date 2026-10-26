# Marketplace product details and comments

`/market-place/[slug]` is the public product detail page. Marketplace cards and search suggestions link to it.

`GET /api/marketplace/[slug]` loads an active, published, admin-approved product owned by an existing vendor. It returns safe catalog fields, product images, stock, dimensions, weight, public seller information, purchase-review summary and ten recent purchase reviews. Similar products use the same visibility rules, exclude the current product, and match the category (or product type when no category is assigned). Seller and account secrets are never serialized.

The page includes an image gallery, real pricing and stock, specifications, delivery information, product reviews, comments, seller information, similar items, same-brand suggestions and a fixed Add To Cart bar. It uses the existing cart store, wishlist API, buyer history and seller-conversation API. Search uses the existing popup and carries filters back to the marketplace. Featured listings replace the reference's sponsored row because no sponsorship data exists. Delivery dates, pickup fees, size options and seller-performance scores are not fabricated.

## Product comments

`ProductComment` stores `productId`, `authorId`, `authorName`, `text`, `clientId`, `verifiedPurchase` and timestamps. A unique `(authorId, clientId)` index makes retries idempotent; a product/date index supports paging.

- `GET /api/marketplace/[slug]/comments?page=1` is public and returns ten comments, `hasMore` and the page number. Pages must be integers from 1 to 10,000.
- `POST /api/marketplace/[slug]/comments` requires an authenticated customer and accepts `{ text, clientId }`. Text must contain 1–2,000 characters. The server derives product and author identity; names and verified-purchase flags supplied by the client are ignored. Only a paid, non-cancelled order containing this product grants the Verified Purchase badge.
- Public comments expose only their ID, display name, text, purchase badge and creation date. Email, account ID and request ID are not exposed. Comment text is rendered as text, never HTML.

Existing BuyerReview records remain the source of product star ratings. Comments allow buyer questions and discussion without claiming a purchase or altering review scores.

Validation: `node --test scripts/marketplace-detail.test.mjs scripts/marketplace.test.mjs` and `npm run build`. Service tests inject database models and cover visibility, similar-product filtering, comment validation, author spoofing, purchase badges, retry idempotency, safe serialization and paging. Live database and browser testing are separate from these checks.
