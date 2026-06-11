# TODO - Vendor Verification Flow

## Step 1: Understand current code paths
- [x] Inspect existing admin vendors endpoint and admin dashboard UI
- [x] Inspect auth helper (`verifyAuth`)
- [x] Inspect existing DB models (`User`, `Business`)
- [x] Identify missing vendor profile pages/routes and existing sidebar links

## Step 2: Implement data model
- [x] Add `src/models/VendorVerification.js`


## Step 3: Implement vendor verification API
- [x] Add `src/app/api/vendor/verification/route.js` (GET/POST)

- [ ] Add file upload handling (CAC image/PDF) (via existing cloudinary utilities if available)

## Step 4: Implement admin verification APIs
- [x] Add `src/app/api/admin/vendors/verification/route.js` (GET pending)
- [x] Add approve endpoint `.../approve/route.js`
- [x] Add reject endpoint `.../reject/route.js`


## Step 5: Update admin UI
- [ ] Update `src/app/dashboard/admin/page.jsx` to show pending verifications and approve/reject actions

## Step 6: Update vendor UI
- [ ] Create `src/app/dashboard/vendor/profile/page.jsx` (verification form + status)

## Step 7: Enforce verification for product actions
- [ ] Add server-side checks to vendor product upload/create and any publish/pending endpoints

## Step 8: Testing
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Manual flow test: submit -> pending -> approve -> can upload/publish

