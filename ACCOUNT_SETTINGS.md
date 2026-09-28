# Profile and settings contribution

Branch: `feat/profile-settings`, based on `main` at `e55d149`.

## What changed

- `/dashboard/profile`: personal account overview for customers, vendors, and admins; vendors also see their business and real verification statuses.
- `/dashboard/settings`: editable personal details, photo, password, and sign-out; business and bank sections appear only for vendors.
- Existing `/dashboard/vendor/profile`, `/dashboard/vendor/profile/edit`, and `/dashboard/vendor/edit` URLs redirect to the working pages.
- The dashboard sidebar and avatar now link to the new pages. The mobile menu has keyboard focus handling and Escape support.
- Vendor saves update the existing business rather than creating duplicates. Ambiguous historical duplicates return a conflict without modifying either record.
- Account and vendor updates allowlist editable fields. Roles, passwords, email, verification, ownership, and session versions cannot be overwritten through a profile save.
- Password changes require the current password, use bcrypt, invalidate access and refresh tokens on all devices, and sign the user out. Missing session versions on legacy users/tokens mean zero.
- Vendor verification remains an administrator action; the existing verification endpoint now enforces that role.

## Run locally

Use Node 24 or newer, then `npm ci` and `npm run dev`. Configure `.env.local` using the existing README. Account features need:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/abacraft
JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-another-long-random-secret
# Optional; defaults are 15m and 7d.
ACCESS_EXPIRES=15m
REFRESH_EXPIRES=7d
```

The Axios client defaults to same-origin `/api`; `NEXT_PUBLIC_API_URL` remains supported.

Photo uploads require server-side `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`. Files must be JPEG/PNG and no larger than 2 MB. The server checks the file signature and Cloudinary decodes the image before the saved profile changes. Missing configuration returns 503 without replacing the existing photo. Removal clears the profile reference; old Cloudinary assets are not destructively deleted.

No data migration is required for `sessionVersion`: old documents are treated as zero. Do not delete historical duplicate businesses automatically; reconcile them with the team first. This contribution does not add a uniqueness migration that could fail on those records.

## API notes

| Endpoint | Behavior |
| --- | --- |
| `GET /api/account/profile` | Current user and safe vendor business overview; no bank or authentication secrets |
| `PATCH /api/account/profile` | Name, phone, sex; `profilePicture: null` removes a photo; use the upload endpoint for replacements |
| `POST /api/account/avatar` | Authenticated multipart upload using field `photo` |
| `DELETE /api/account/avatar` | Remove the current profile photo reference |
| `POST /api/account/password` | `currentPassword`, `newPassword`, `confirmPassword`; revoke sessions on success |
| `GET /api/vendor/profile` | Retains `formattedResponse.vendorInfo/businessInfo`; personal details work without a business |
| `GET /api/vendor/profile?includeBank=true` | Explicit owner-only bank settings read; never accepts another owner's ID |
| `PATCH /api/vendor/profile` | Vendor-only allowlisted `vendorInfo` and `businessInfo`; bank values are nested under `businessInfo.bankDetails` |

Profile errors use `message` and optional `fields` for inline feedback. Account responses disable caching. Existing vendor response keys are retained, including the legacy misspelling `veificationStatus`, with a correctly spelled property alongside it. Bank details are intentionally omitted unless requested through the owner settings read. BVN and verification documents are not editable in this contribution.

## Validation results

Verified with Next.js **16.2.6**, the unchanged dependency lockfile, Node **26.7.0**, and an isolated local MongoDB **7.0.14** instance. No production database was used.

- **5 unit tests passed**: protected-field filtering, nested bank validation, password validation, legacy session compatibility, and safe response projection.
- **31 integration checks passed** against the running app and MongoDB: all three roles, anonymous access, saves/reloads, repeated business saves, duplicate detection, owner-only bank data, verification authorization, invalid/oversized images, photo removal, password errors, old access/refresh token revocation, and sign-in with the new password.
- Separately verified missing Cloudinary configuration returns a clear 503 for a valid image.
- Browser verified: vendor profile and settings, save success, persisted name after navigation, customer-only sections, cancel/reset, sign-out, mobile menu focus and Escape, and layouts at desktop, 820 px, and 390 px. No horizontal overflow at the tested responsive widths.
- Production compilation passed with both Turbopack and Webpack during validation. A later Turbopack run hit an internal Google Fonts resolution error; the final validation uses `npm run build -- --webpack`. The local Windows environment required **temporary** `experimental.workerThreads: true`, `cpus: 2`, and `webpackBuildWorker: false` settings because process spawning was blocked, and clearing the local proxy environment to fetch the existing Google Fonts. Those temporary configuration changes are not included in the branch.
- Changed files have no lint errors. Full-repository lint still reports **14 pre-existing errors** in unrelated authentication, dashboard, and product/modal components; the baseline had 16. These are predominantly synchronous state updates in effects and unescaped quotation marks. The existing navbar flag image warning remains.

Successful upload/replacement against a configured Cloudinary account remains to be checked with the team's development credentials. No upload success is simulated. The signed-in admin account APIs were integration-tested; the admin dashboard itself was not redesigned.

### Repeat the tests

```sh
npm run test:account
```

For integration tests, start MongoDB locally with a disposable database named **abacraft_account_test**, and start the app with matching database/JWT configuration. In the test terminal, set:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27028/abacraft_account_test
ACCOUNT_TEST_URL=http://localhost:3100
JWT_ACCESS_SECRET=the-same-development-access-secret-as-the-app
```

Then run `npm run test:account:integration`. The runner refuses non-local URLs and other database names, creates its own fixtures, and deletes those fixtures afterwards. `KEEP_ACCOUNT_FIXTURES=1` is available only for manual local browser review; use a fresh test database before repeating a kept-fixture run.

## Review scope

There are no new production dependencies. Email changes, account deletion, notification preferences, themes, verification document submission, and team permissions remain outside this contribution. Existing verification decisions are preserved. No merge or deployment has been performed.
