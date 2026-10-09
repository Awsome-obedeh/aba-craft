# AbaCraft

## Escrow settlement

Paystack has no true escrow, so vendor money is held in our own Paystack balance
and tracked with an internal double-entry ledger. A vendor is paid only when
**both** the vendor confirms delivery **and** the customer confirms receipt — or
the customer's confirmation window elapses with no open dispute.

### State machines

Payment and fulfilment stay on `Order`; escrow and per-vendor fulfilment live on
`VendorOrder`, because one customer order can involve several vendors and each
has its own money and delivery state.

```
payment      pending -> paid -> refunded | failed
fulfilment   pending -> processing -> shipped -> delivered -> cancelled
escrow       none -> held -> release_pending -> released
             held -> disputed -> released | refunded
```

`received` and `completed` are deliberately absent: receipt is a timestamp
(`customerConfirmedReceiptAt`) and completed is just `escrowStatus === released`.

### Release condition

```js
escrowStatus === 'held'
&& disputeStatus !== 'open'
&& vendorConfirmedDeliveryAt != null
&& (customerConfirmedReceiptAt != null || autoReleaseAt <= now)
```

This check lives in a single `findOneAndUpdate` filter in `src/app/lib/escrow.js`,
so the database decides the winner when the customer clicks "confirm" at the
same moment the auto-release job fires. A read-then-write would let both proceed
and pay a vendor twice.

### Environment

```env
# Platform commission in basis points (1200 = 12%)
PLATFORM_FEE_BPS=1200

# Days after vendor confirms delivery before funds auto-release
# Clamped to a 7 day minimum in code regardless of this value.
AUTO_RELEASE_DAYS=7

# Shared secret for the /api/jobs/* cron routes. Jobs refuse to run without it.
CRON_SECRET=some-long-random-string
```

### Money is integer kobo

Every amount in the escrow system is an integer number of kobo. Floats are used
only in the legacy `Order` display fields, converted at the boundary by
`nairaToKobo()`. The split rule is fixed and applied everywhere:

```
platformFee = floor(grossKobo * feeBps / 10000)
net         = grossKobo - platformFee     // so fee + net === gross, exactly
```

### Models

| Model | Purpose |
|---|---|
| `Account` | Chart of accounts, with a materialised balance per account |
| `LedgerEntry` | Append-only double-entry journal. `lines[]` allows compound entries |
| `VendorOrder` | Per-vendor slice: money, fulfilment, escrow, confirmations, audit log |
| `Settlement` | A batch of released vendor orders paid out as one Paystack transfer |
| `VendorRecipient` | Vendor's verified bank account. Required before a vendor can be verified |
| `WebhookEvent` | Idempotency. Dedupes on the business fact, not a provider event id |

Ledger entries are never updated or deleted. Corrections are posted as
`reversal` entries that mirror the original.

### Accounts

`PAYSTACK_CLEARING` (asset) · `ESCROW_LIABILITY` · `VENDOR_PAYABLE` ·
`PLATFORM_REVENUE` · `PAYSTACK_FEES_EXPENSE` · `REFUNDS_PAYABLE` ·
`TRANSFERS_CLEARING`

Balances are stored in each account's own normal direction, so an asset
debit increases it rather than making it negative.

Shipping is collected once per order and booked straight to `PLATFORM_REVENUE` —
it never enters escrow, so a multi-vendor cart cannot double-count it.

### Routes

| Path | What it does |
|---|---|
| `POST /api/orders` | Creates the order **and** one `VendorOrder` per vendor |
| `POST /api/payments/webhook` | `charge.success` opens escrow holds. Also `transfer.*`, `refund.processed` |
| `POST /api/orders/[id]/escrow` | `confirm-delivery` / `confirm-receipt` / `dispute` / `advance-fulfillment` |
| `GET/POST /api/vendor/recipient` | Vendor's bank details, verified against Paystack |
| `GET /api/vendor/settlements` | Vendor's held / payable / paid totals and history |
| `GET /api/admin/settlements` | Platform escrow totals, open disputes, stuck transfers, ledger balances, live Paystack balance |
| `POST /api/admin/settlements` | Re-queue a failed payout (`{ action: "retry", id }`) |
| `POST /api/admin/settlements/disputes/[id]/resolve` | Admin resolves a dispute: full release, full refund, or partial split |
| `GET /api/vendor/orders` | The vendor's own slice of every order, with escrow and fulfilment state |
| `GET /api/orders/[id]/escrow` | Per-vendor escrow read model the customer and vendor UIs render |
| `POST /api/orders/[id]/escrow` | `confirm-delivery`, `confirm-receipt`, `dispute`, `advance-fulfillment`; scope with `vendorOrderId` |
| `GET /api/jobs/auto-release` | Releases escrow whose confirmation window elapsed |
| `GET /api/jobs/process-settlements` | Batches released orders into Paystack transfers, retries failures |
| `GET /api/jobs/process-notifications` | Sends auto-release warnings, drains the notification outbox |
| `GET /api/jobs/reconcile` | Verifies ledger integrity, compares our books to Paystack and the live balance |

All four `/api/jobs/*` routes require `Authorization: Bearer $CRON_SECRET`.
`vercel.json` schedules them (every 15 min, every 30 min, every 10 min, daily).

### Webhook safety

The previous webhook handler had three problems that are now fixed:

- It returned `200` even when the database write failed, so Paystack never
  retried and payments were silently lost. It now returns `5xx` on error.
- It did check-then-act on `paymentStatus`, so two concurrent deliveries could
  both pass the guard. It now dedupes on an idempotency key first.
- It never created escrow holds or ledger entries at all.

Idempotency is keyed on the business fact (`charge_success:REF_123`) because
Paystack does not send a stable event id across retries.

### Testing

```bash
npm run test:escrow    # DB-backed: splits, ledger balance, idempotency, release gate
node scripts/verify-money.mjs   # pure money invariants, no database needed
```

`test:escrow` runs against a throwaway `abacraft_escrow_smoke` database and
checks the things that would silently corrupt money: no kobo lost in a split,
every entry balances, the global debit/credit invariant holds, account balances
match a fresh aggregation, replays do not double-post, and the release gate only
fires when both confirmations exist and no dispute is open.

`verify-money.mjs` needs no database and asserts the properties the whole system
rests on — most importantly that `platformFee + net === gross` for every amount
from 0 to 100,000 kobo, and that the fee always rounds down so the platform
never takes a fraction of a kobo it was not entitled to.

### UI

| Page | Route | What it does |
| --- | --- | --- |
| Customer orders | `/account/orders` | Per-vendor payment protection: confirm receipt, open a dispute, and a live countdown to auto-release |
| Vendor orders | `/dashboard/vendor/orders` | Per-slice fulfilment (`pending → processing → shipped → delivered`) and the "confirm delivery" step that starts the payout clock |
| Vendor payouts | `/dashboard/vendor/settlements` | Held / ready / disputed / paid, and payout history |
| Payout account | `/dashboard/vendor/payout-account` | Bank details, verified with Paystack before saving |
| Admin escrow | `/dashboard/admin/settlements` | Platform totals, dispute resolution incl. partial splits, stuck payout retry, ledger balances, live-balance coverage |

The countdown is a real clock, not a static date, because the auto-release
deadline is the customer's last chance to dispute.

### Notification emails

Four emails, matching the events that matter:

1. **Vendor** — order paid, please deliver
2. **Customer** — vendor marked it delivered, please confirm receipt
3. **Customer** — funds will release automatically in N days unless disputed
4. **Vendor** — your payout has been sent

They are written to a transactional outbox (`NotificationOutbox`) and sent by
`/api/jobs/process-notifications`, never inline from a webhook. A flaky SMTP
server must not be able to roll back or block a successful payment. Sends are
claimed atomically so two concurrent cron runs cannot send the same email, and
each carries a `dedupeKey` on the business fact, so a retried webhook does not
re-send. Failures retry with backoff up to three times.

### Reconciliation

`/api/jobs/reconcile` runs daily and checks three independent things:

- **Ledger integrity** — every entry balances, and each materialised account
  balance matches a fresh aggregation of the entries.
- **Paystack transaction match** — no successful transaction we have no record
  of, and no order we believe is paid that Paystack disagrees is paid.
- **Live balance coverage** — `liveBalance >= VENDOR_PAYABLE`. This is an
  inequality on purpose: the live balance is a *superset* of what we owe
  (it also holds platform fees and in-flight refunds), so an equality check
  would report a healthy system as broken. What must always hold is that we are
  covered. A shortfall means we have promised vendors money the account does not
  contain, and the admin dashboard shows it as a red banner.

The job reports and exits non-2xx on drift. It does not self-heal.

### Not yet built

Nothing outstanding from the original list. Two known limitations worth stating:

- Payouts run on a fixed cron rather than a real-time transfer trigger, so
  there is up to a 30-minute delay between a release and the money moving.
- Disputes are resolved per vendor slice, but a customer disputing a multi-vendor
  order has to open one dispute per vendor rather than one for the whole order.
## Youverify (BVN verification)

This app includes a **server-side** admin BVN verification flow using Youverify.

### Required environment variables

Add these to `.env.local`:

```env
# Youverify BVN verification (server-side only)
YOUVERIFY_API_KEY=your-youverify-api-key
YOUVERIFY_BASE_URL=https://api.sandbox.youverify.co
# Optional override if the Youverify BVN endpoint path changes
YOUVERIFY_BVN_VERIFY_PATH=/v2/api/identity/ng/bvn
```

> **Note:** Youverify authenticates with a single `token` header (not `Authorization: Bearer`). The request body must be `{ "id": "<BVN>", "isSubjectConsent": true }`. The sandbox environment (`api.sandbox.youverify.co`) only accepts test IDs (`11111111111` valid, `00000000000` not found); real BVNs require the production base URL `https://api.youverify.co`.

### Where it's used

- **Admin vendor verification details page:** `src/app/dashboard/admin/vendors/[ownerId]/page.jsx`
- **Server endpoint (never expose API keys to the browser):** `src/app/api/admin/vendors/verification/verify-bvn/route.js`

### Response handling

The route validates Youverify's response envelope (`success === true` and `data.status === "found"`) before marking the vendor's `VendorVerification` record as verified. On failure it returns the Youverify `message` (e.g. `Forbidden: Only Test IDs are allowed`) so the UI can surface the real reason.

### Local testing with ngrok

Youverify calls are **server-to-server** — they don't need a public URL. The ngrok tunnel is only needed for Paystack's callback and webhook. No extra Youverify configuration is required for local dev.


A two-sided marketplace for handcrafted leather goods from Aba artisans. Customers browse the storefront, add items to a cart, and check out through a (currently mocked) payment gateway. Vendors manage their own catalog and incoming orders.

The project name in `package.json` is `thriveabia-project`; the user-facing brand is **AbaCraft**.

## Stack

- **Next.js 16.2.6** (App Router, Turbopack) + **React 19.2.4**
- **MongoDB** via **Mongoose 9**
- **JWT** auth (access + refresh tokens; `jose` for verify, `jsonwebtoken` for sign)
- **Zustand** for client state (auth + persisted cart)
- **Cloudinary** for product image hosting (unsigned upload preset)
- **Nodemailer** for OTP emails (Gmail SMTP)
- **Tailwind v4** (PostCSS plugin) for styling
- **react-hook-form** for forms
- **bcryptjs** for password hashing

## Quick start

### 1. Prerequisites

- Node.js 20+ (project is tested on Node 24)
- A MongoDB instance — local, Atlas, or Docker
- A Gmail app password (for OTP emails) — optional for dev, but sign-up will fail without it
- A Cloudinary unsigned upload preset + cloud name — optional for dev, the seed bypasses this

### 2. Install

```bash
npm install
```

### 3. Configure environment

Create `.env.local` at the project root with the following keys:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/abacraft

# Auth
JWT_ACCESS_SECRET=replace-me-with-a-long-random-string
JWT_REFRESH_SECRET=another-long-random-string

# Email (Gmail SMTP — required for OTP sign-up)
EMAIL_USER=your.address@gmail.com
EMAIL_PASS=your-16-char-app-password

# Cloudinary (optional for dev — the seed uses picsum.photos placeholders)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_PRESET_NAME=your-unsigned-preset

# Frontend base URL (used by the axios client)
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Paystack (test keys)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxx
PAYSTACK_SECRET_KEY=sk_test_xxx
# Callback URL — the page Paystack redirects to after payment.
# For local testing with ngrok, use your ngrok URL + /checkout/success
# Example: https://your-subdomain.ngrok-free.dev/checkout/success
PAYSTACK_CALLBACK_URL=https://your-ngrok-subdomain.ngrok-free.dev/checkout/success
# Webhook URL — where Paystack posts events (charge.success, transfer.success, etc).
# Configure once in Paystack Dashboard → Settings → Webhooks.
# Example: https://your-ngrok-subdomain.ngrok-free.dev/api/payments/webhook

# Youverify BVN verification (server-side only)
YOUVERIFY_API_KEY=your-youverify-api-key
YOUVERIFY_BASE_URL=https://api.sandbox.youverify.co
# Optional override if the Youverify BVN endpoint path changes
YOUVERIFY_BVN_VERIFY_PATH=/v2/api/identity/ng/bvn

# Cron secret for /api/jobs/* endpoints (openssl rand -hex 32)
CRON_SECRET=replace-me-with-a-long-random-string
```

### 4. Seed the database (dev only)

```bash
npm run seed
```

This creates:

| Account | Email | Password | Role |
|---|---|---|---|
| Admin | `admin@abacraft.test` | `AdminPass1!` | admin |
| Vendor | `vendor@abacraft.test` | `VendorPass1!` | vendor |
| Customer | `ada@example.com` | `CustomerPass1!` | customer |
| Customer | `tunde@example.test` | `CustomerPass1!` | customer |

…plus a **Leather Goods** category and 3 products owned by the vendor, all pre-approved and published so the storefront has content immediately.

The seed is **idempotent** (re-running upserts on email, slug, and category name) and **dev-only** — it refuses to run when `NODE_ENV` is explicitly set to anything other than `development`.

### 5. Run

```bash
npm run dev
```

Visit `http://localhost:3000`.

### Local development with ngrok (real Paystack + Youverify)

To test real Paystack payments and Youverify BVN verification locally, you need a public HTTPS tunnel:

```bash
# 1. Start the app
npm run dev

# 2. In another terminal, expose port 3000
ngrok http 3000
```

Ngrok will give you a URL like `https://abc123.ngrok-free.dev`. Update `.env.local`:

```env
PAYSTACK_CALLBACK_URL=https://abc123.ngrok-free.dev/checkout/success
# Webhook is configured in Paystack Dashboard → Settings → Webhooks
# Add: https://abc123.ngrok-free.dev/api/payments/webhook
```

**Important:** The callback URL must point to `/checkout/success` (the route), **not** `/checkout/success/page.jsx` (the file).

For Youverify, the sandbox (`api.sandbox.youverify.co`) only accepts test BVNs:
- `11111111111` → returns `found` (with mock data)
- `00000000000` → returns `not_found`
- Any real BVN → `403 Forbidden: Only Test IDs are allowed`

Use the production base URL `https://api.youverify.co` for real BVNs.

### Webhook verification

Paystack signs webhook payloads with HMAC-SHA512. The route at `/api/payments/webhook` verifies the signature using `PAYSTACK_SECRET_KEY`. If you rotate the secret, update `.env.local` and redeploy.

## Routes overview

| Path | What it is |
|---|---|
| `/` | Landing — "I want to buy" / "I want to sell" |
| `/auth/sign-up` | Vendor sign-up (OTP verified) |
| `/auth/customer-signup` | Customer sign-up (OTP verified) |
| `/auth/sign-in` | Sign in (blocks unverified accounts) |
| `/auth/verify` | OTP entry, then redirects by role |
| `/dashboard` | Role-based redirect |
| `/dashboard/products` | Storefront catalog (customer & vendor) |
| `/dashboard/products/[slug]` | Single product; add-to-cart for customers, edit for vendors |
| `/dashboard/vendor/upload-product` | Vendor: upload a product |
| `/dashboard/vendor/inventory` | Vendor: stock view |
| `/dashboard/vendor/products` | Vendor: their own catalog (incl. under-review items) |
| `/dashboard/vendor/orders` | Vendor: incoming orders, advance / cancel status |
| `/cart` | Persistent cart (localStorage) |
| `/checkout` | Address + mock payment |
| `/account/orders` | Customer: order history |
| `/api/products` | Catalog list (visibility scoped by role) |
| `/api/products/[slug]` | Single product |
| `/api/orders` | Create + list orders (auth required) |
| `/api/payments/init` | Paystack initialize (auth required) |
| `/api/payments/verify` | Paystack verify (auth required) |
| `/api/payments/webhook` | Paystack webhook (signature-verified) |
| `/api/payments/mock/init` | Mock payment init (auth required) |
| `/api/payments/mock/verify` | Mock payment verify (auth required) |
| `/api/auth/sign-up`, `/sign-in`, `/verify`, `/resend`, `/logout`, `/refresh` | Auth endpoints |

## Architectural notes

- **Auth.** Access tokens live in Zustand (in-memory). Refresh tokens are stored in an `httpOnly` `Secure` `SameSite=Strict` cookie. The axios client (`src/app/lib/axios.js`) injects the access token on every request and silently refreshes on 401.
- **Visibility rules.** Products have a `status` (`under_review` / `approved` / `rejected`) and an `isPublished` flag. The catalog and single-product endpoints filter to `status === "approved" && isPublished` for customers and vendors browsing the storefront. Admins see everything. The vendor's "My Products" view uses `?scope=mine` to see their own catalog including under-review items.
- **Pricing.** Cart prices are snapshotted at add time and re-validated against the DB at checkout. The Order schema stores `unitPrice`, `discountPrice`, and `finalUnitPrice` per line item, so the order survives later price changes.
- **Payments.** The mock payment flow is shaped like Paystack's (`init` returns an `authorizationUrl`, `verify` returns success/failure) so swapping in real Paystack later is a one-route change. Real Paystack is now wired via `src/app/lib/paystack.js` (`POST /transaction/initialize`, `GET /transaction/verify/{reference}`, HMAC-SHA512 webhook verification). The checkout page (`src/app/checkout/page.jsx`) uses the Paystack inline popup with a redirect fallback; `src/app/checkout/success/page.jsx` verifies the transaction on return.

  **Callback URL:** `PAYSTACK_CALLBACK_URL` in `.env.local` (e.g. `https://your-ngrok-subdomain.ngrok-free.dev/checkout/success`). Paystack redirects the customer here after payment.

  **Webhook:** Configure once in **Paystack Dashboard → Settings → Webhooks** (e.g. `https://your-ngrok-subdomain.ngrok-free.dev/api/payments/webhook`). The route verifies the HMAC-SHA512 signature using `PAYSTACK_SECRET_KEY`.
- **Roles.** A user can be `vendor`, `admin`, or `customer`. There is no public storefront; both vendors and customers must sign in to browse or sell. Vendors see only their own products in their "My Products" view; the storefront shows the union of all approved+published products.

## Admin Dashboard Enhancements

The admin dashboard has been significantly improved with better UI/UX:

### MetricCard Component
- Enhanced visual design with gradient hover indicators
- Improved spacing and typography for better readability
- Added icon support for visual communication of metric types

### Admin Dashboard Page
- **Enhanced Header**: Gradient background, icons, and descriptive section titles
- **Improved Metrics Dashboard**: Three metric cards with relevant icons showing total vendors, pending verifications, and verified vendors count (replacing mock growth rate with real data)
- **Advanced Filtering & Sorting**:
  - Multi-column sorting (name, status, total products, joined date)
  - Visual sort indicators (↑/↓) in table headers
  - Persistent search functionality
  - Tab-based filtering (All Vendors, Pending Verification, Verified, Suspended)
- **Improved Vendor Table**:
  - Better avatar display with borders
  - Email visibility under vendor names
  - Enhanced action buttons (View Details ✏️, Edit)
  - Improved row hover effects and selection styling
- **Enhanced Bulk Operations**:
  - Gradient-styled action buttons with hover effects
  - Success feedback toasts for bulk operations
  - Improved visual design with shadows and transformations

### User Management Page
- **Complete User Administration**: Dedicated interface for managing all platform users
- **Role-Based Filtering**: Filter users by role (All Users, Admins, Vendors, Customers)
- **Search Functionality**: Real-time search across names, emails, and business names
- **Bulk Operations**: Select multiple users for batch actions
- **User Statistics**: Quick overview of total users and role distribution
- **Enhanced User Table**: 
  - Avatar display with role-based color coding
  - Status indicators (Active/Inactive)
  - Join dates and contact information
  - Action buttons for viewing details and deleting users
- **Responsive Design**: Works across different screen sizes

These improvements make the admin interface more intuitive, visually appealing, and functional while maintaining all existing vendor management capabilities.

