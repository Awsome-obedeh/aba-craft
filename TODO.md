# TODO

## Step 0: Understand current code paths
- [x] Inspect README, routing overview, and stack notes
- [x] Review key auth pieces (Zustand store, axios interceptor, verifyAuth)
- [x] Review main user journeys (landing, sign-in/sign-up/verify, dashboard redirect, products, product details, cart, checkout, success)
- [x] Review vendor UI pages (upload product with Cloudinary, inventory, vendor orders)

## Step 1: Create/Update Vendor Verification UI
- [x] Create `src/app/dashboard/vendor/profile/page.jsx` (verification form + status)


## Step 2: Lint issues cleanup (optional / follow-up)
- [ ] Fix react-hooks/set-state-in-effect errors (auth verify, dashboard admin pages, products pages, vendor inventory/products, EditProductModal)
- [ ] Fix react/no-unescaped-entities in modals
- [ ] Address remaining warnings (next/no-img-element, jsx-a11y/alt-text, react-hooks/incompatible-library)

