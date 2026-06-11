# TODO

## Step 0: Understand current code paths
- [x] Inspect README, routing overview, and stack notes
- [x] Review key auth pieces (Zustand store, axios interceptor, verifyAuth)
- [x] Review main user journeys (landing, sign-in/sign-up/verify, dashboard redirect, products, product details, cart, checkout, success)
- [x] Review vendor UI pages (upload product with Cloudinary, inventory, vendor orders)

## Step 1: Create/Update Vendor Verification UI
- [x] Create `src/app/dashboard/vendor/profile/page.jsx` (verification form + status)


## Step 2: Admin UI/UX Improvements (completed)
- [x] Fix admin dashboard - removed hardcoded mock data, added user data from store, fixed badge styling
- [x] Fix publish-products page - corrected loading state logic, added search functionality
- [x] Created RejectProductModal component for admin product rejection
- [x] Added active link highlighting to Sidebar
- [x] Updated dashboard redirect to route admin to /dashboard/admin

## Step 3: Lint issues cleanup (optional / follow-up)
- [ ] Fix react-hooks/set-state-in-effect errors (auth verify, products pages, vendor inventory/products, EditProductModal)
- [ ] Address warnings (next/no-img-element, jsx-a11y/alt-text, react-hooks/incompatible-library)