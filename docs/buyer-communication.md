# Buyer communication and account flow

Feature branch: `feat/buyer-vendor-messaging`, based on `origin/main` (`4c66b7b`).

## Design research

Source: [THRIVEABIA CAPSTONE PROJECT](https://www.figma.com/design/YuK6pJcT8rV87Gm7oOPv7a/THRIVEABIA-CAPSTONE-PROJECT?node-id=6187-30952).
The originally supplied node `4166:11322` is the PROFILE FLOW heading. The actual buyer section is `6187:30952`, **Buyer Communication flow**, on page `0:1`. Its frames have no wired prototype reactions, so navigation follows their labels and the order-to-supplier relationships.

| Figma frame                                | Implemented route                      |
| ------------------------------------------ | -------------------------------------- |
| `6187:30953` Inbox / supplier conversation | `/dashboard/messages?conversation=...` |
| `6304:31198` Orders                        | `/dashboard/buyer/orders`              |
| `6369:31305` Pending Reviews               | `/dashboard/buyer/reviews`             |
| `6330:33910` Request Updated Quote         | `/dashboard/buyer/quote`               |
| `6328:33071` Wishlist                      | `/dashboard/buyer/wishlist`            |
| `6332:36277` Followed Sellers              | `/dashboard/buyer/followed`            |
| `6314:31845` Recently Viewed               | `/dashboard/buyer/recently-viewed`     |
| `6330:34200` Track Shipment                | `/dashboard/buyer/tracking`            |
| `6330:34511` Report an Issue               | `/dashboard/buyer/issue`               |
| `6322:32474` Newsletter Preferences        | `/dashboard/buyer/newsletter`          |
| `6328:32787` Cookies Preferences           | `/dashboard/buyer/cookies`             |

All eleven frames were inspected with design context and screenshots. The implementation follows the 1440px storefront shell, 1280px content width, 421px account navigation, 52px gap, Nunito Sans, #B4902A gold, #F5F5F5 background, white panels and #3D42DF sent-message bubbles. Original Figma static assets are checked into `public/images/buyer`; product photos, names, prices, orders and verification use live data. Mobile layouts adapt the desktop design with a collapsible account menu, single-column forms and horizontally scrollable categories/recommendations.

## Architecture

- `components/buyer/BuyerShell.jsx` owns the common storefront/navigation/footer; `buyer.css` scopes the visual system. `BuyerPage.jsx` selects account sections; `BuyerRequestForm.jsx` handles quote/issue forms. Product account actions and purchase reviews integrate with the existing product page and cart store.
- `components/messaging` owns the inbox list, thread, composer, attachment controls and polling hook. Buyers use the Figma shell; vendors retain the existing dashboard shell. Zustand keeps unsent message drafts in memory, scoped by user and conversation.
- Route handlers under `api/conversations`, `api/attachments`, `api/buyer` and `api/reviews` are thin authenticated adapters. Domain rules are in `app/lib/messaging`. The OpenAPI reference includes every new route.
- MongoDB models: `Conversation`, `Message`, `MessageAttachment`, `BuyerAccount`, `BuyerRequest`, `BuyerReview`. Existing `User`, `Business`, `Product` and `Order` remain authoritative.

## Behaviour and data protection

Buyers initiate conversations from a published product or an owned order line. The server derives the vendor; client-supplied sender, recipient, buyer, role and read state cannot override it. Order conversations still work if a listing is withdrawn. Product and order conversations have deterministic IDs, and message/request retry IDs prevent duplicate sends. Vendors can respond to conversations addressed to them. Other users and admins cannot read these private conversations.

Inbox polling runs every 8 seconds; active threads every 5 seconds. Both pause when the document is hidden. Reconnection backfills gaps using stable timestamp/ObjectId cursors. Only visible received messages are marked read. Text is rendered as plain text; Enter sends, Shift+Enter adds a line. Failed sends keep drafts and retry references.

Uploads accept JPEG, PNG and PDF, at most 10 MB each and 5 per message/request. MIME/signature checks run on the server against bounded streams. Files stay private in MongoDB and are downloaded through an authenticated endpoint; they are never assigned a public URL. Unsent uploads expire after 24 hours via a TTL index. Sent uploads remain with their message. Best-effort quotas cap new messages at 30/minute and uploads at 50 files / 100 MB per account per day; strict distributed quotas and malware scanning are future hardening work. Deployment infrastructure must allow request bodies of 10 MB; lower host limits will need direct private-storage uploads instead.

Quote requests and issue reports validate the owned order line, save their structured details and send a message into the same order conversation. Retries repair delivery without creating another request. They never alter the original order, approve a refund, or change a payment. Reviews require a delivered order and have a unique buyer/order/product index. Product pages display their rating, text and date without identifying the buyer.

Saved collections are capped (100 wishlist/followed, 40 recent products), deduplicated and persisted per buyer. Newsletter consent is opt-in and can be withdrawn. Optional cookies default to off. Saving preferences does not add advertising or analytics scripts.

## Honest differences from illustrative Figma data

- The repository has no courier integration, delivery estimate, tracking number or scan timeline. Tracking displays the actual order status, last-updated date, supplier note and delivery address, with an explicit unavailable notice for courier details. No sample GIG Logistics scans are shown as real.
- The current payment model has pending/paid/failed/refunded statuses; it does not implement escrow. No HELD badge, refund guarantee, response-time promise or 48-hour support escalation is fabricated.
- Business verification uses the existing pending/verified/rejected status. Figma’s sample verification tier and seller score are not claimed without records.
- The composer supports emoji and validated document/image uploads. Video capture, video upload and third-party media services are not implemented. Repeated decorative upload icons are consolidated into one accessible attachment control.
- Newsletter choices are persisted; a newsletter delivery integration is not present. Footer privacy information explains implemented data use instead of inventing legal terms or policy pages.
- The Figma wishlist reuses sample order/delivery labels; the working wishlist shows actual price and availability because a saved product is not necessarily an order.

## Development verification

Use an isolated local MongoDB database named `abacraft_messaging_test`, a local app on port 3100, and development-only JWT secrets. Never run fixture creation against production. No fixture credentials are required or stored in the repository.

```powershell
$env:MONGODB_URI = 'mongodb://127.0.0.1:27018/abacraft_messaging_test'
$env:JWT_ACCESS_SECRET = '<your local development access secret>'
$env:JWT_REFRESH_SECRET = '<your local development refresh secret>'
npm run dev -- --port 3100
# In another shell with the same development variables:
node --test --test-isolation=none tests/messaging.test.mjs
node tests/messaging.integration.mjs
```

The integration runner refuses remote applications or any differently named database, creates its own accounts/products/order/evidence, and cleans up its fixtures by default. `KEEP_MESSAGING_FIXTURES=1` explicitly retains disposable records for manual browser checks.

Validation: 81 HTTP/database checks passed, covering buyer/vendor/admin access, cross-account reads/writes, authentication refresh, expired tokens, concurrent retries, pagination ties, actual read acknowledgements, unavailable listings/businesses, collection persistence, consent, private attachments, quote/issue delivery and purchase reviews. Five messaging unit tests passed. The production webpack build passed using worker-thread settings temporarily needed by the restricted Windows environment; those environment-only settings are not part of the feature.

Repository baseline: lint reports 12 errors and 32 warnings on both `main` and this feature; new messaging/buyer code is clean. OpenAPI schema validation passes, but the existing route-coverage test still reports nine undocumented pre-existing account/auth methods. The new endpoints are all documented.
