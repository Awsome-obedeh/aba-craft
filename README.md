# AbaCraft

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
| Customer | `ada@example.test` | `CustomerPass1!` | customer |
| Customer | `tunde@example.test` | `CustomerPass1!` | customer |

…plus a **Leather Goods** category and 3 products owned by the vendor, all pre-approved and published so the storefront has content immediately.

The seed is **idempotent** (re-running upserts on email, slug, and category name) and **dev-only** — it refuses to run when `NODE_ENV` is explicitly set to anything other than `development`.

### 5. Run

```bash
npm run dev
```

Visit `http://localhost:3000`.

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
| `/api/payments/mock/init` | Initialize payment (auth required) |
| `/api/payments/mock/verify` | Verify payment (auth required) |
| `/api/auth/sign-up`, `/sign-in`, `/verify`, `/resend`, `/logout`, `/refresh` | Auth endpoints |

## Architectural notes

- **Auth.** Access tokens live in Zustand (in-memory). Refresh tokens are stored in an `httpOnly` `Secure` `SameSite=Strict` cookie. The axios client (`src/app/lib/axios.js`) injects the access token on every request and silently refreshes on 401.
- **Visibility rules.** Products have a `status` (`under_review` / `approved` / `rejected`) and an `isPublished` flag. The catalog and single-product endpoints filter to `status === "approved" && isPublished` for customers and vendors browsing the storefront. Admins see everything. The vendor's "My Products" view uses `?scope=mine` to see their own catalog including under-review items.
- **Pricing.** Cart prices are snapshotted at add time and re-validated against the DB at checkout. The Order schema stores `unitPrice`, `discountPrice`, and `finalUnitPrice` per line item, so the order survives later price changes.
- **Payments.** The mock payment flow is shaped like Paystack's (`init` returns an `authorizationUrl`, `verify` returns success/failure) so swapping in real Paystack later is a one-route change.
- **Roles.** A user can be `vendor`, `admin`, or `customer`. There is no public storefront; both vendors and customers must sign in to browse or sell. Vendors see only their own products in their "My Products" view; the storefront shows the union of all approved+published products.

