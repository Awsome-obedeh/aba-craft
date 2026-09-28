# Signup and verification API

Interactive Swagger documentation is available at `/api-docs`, with the OpenAPI JSON at `/api/openapi`. See [api-documentation.md](api-documentation.md) for usage and maintenance.

The five-step seller form uses same-origin Next.js routes under `/api/auth`. It no longer depends on `NEXT_PUBLIC_API_URL` or optional signup path variables. Other product/dashboard API configuration is unchanged.

## Endpoints

| Method and path | Purpose |
| --- | --- |
| `POST /api/auth/send-code` | Send a six-digit email code before seller registration. JSON `{ "email": "seller@example.com" }`. |
| `POST /api/auth/resend` | Alias of send-code for the existing buyer verification page. |
| `POST /api/auth/verify` | Verify JSON `{ "email": "seller@example.com", "otp": "123456" }`. The old `invitationCode` field is also accepted. Returns `{ "success": true, "verificationToken": "...", "expiresIn": 3600 }`. |
| `POST /api/auth/sign-up` | Accept the complete seller registration as multipart data, including the CAC file. |
| `GET /api/auth/documents/:businessId` | Return a private CAC download URL valid for 60 seconds. Requires a bearer token belonging to the business owner or an admin. |
| `POST /api/auth/sign-in` | Sign in with email/password after registration. Returns an access token and sets the HttpOnly refresh cookie. |
| `POST /api/auth/refresh` | Renew the access token using the refresh cookie. |
| `POST /api/auth/logout` | Clear the refresh cookie. |

`/api/test/auth/sign-up`, `/verify`, `/resend` and `/sign-in` now delegate to the corresponding canonical handlers. The old unauthenticated `/api/test/sign-cloudinary` signing handler is retired with HTTP 410. It must not be used to upload CAC documents. The signup upload is handled entirely on the server inside the final request; no separate browser upload or public upload preset is needed.

## Final seller request

`POST /api/auth/sign-up` uses `multipart/form-data`. Allow the browser to set the Content-Type boundary.

| Field | Value |
| --- | --- |
| `account` | JSON string containing `email`, `password`, `acceptedTerms: true` |
| `role` | `wholesaler_producer` or `retailer`; stored as business `sellerRole`, while the account permission role is always `vendor` |
| `business` | JSON string containing `businessName`, `businessType`, `businessDescription`, `phoneNumber`, `countryCode`, `email`, `state`, `lga`, `city`, `address`, optional `landmark` |
| `verificationToken` | Opaque proof returned by email verification, bound to that email |
| `bvn` | 11-digit string, preserving leading zeroes |
| `cacDocument` | Actual JPG, PNG, WEBP or PDF file, at most 10 MB |

Business email and account email are distinct. Password confirmation is checked locally and omitted. Passwords must have at least 8 characters and fit within bcrypt's 72-byte limit. Business descriptions allow up to 300 words. MIME type and file signature must match; this is a file-type check, not malware scanning or a check that the certificate is authentic.

The request body is capped at 20 MB plus 64 KB of form metadata, including when Content-Length is absent. The server forces permission and verification statuses rather than accepting them from the caller.

After upload, user creation, business creation and verification-proof consumption share one MongoDB transaction. Passwords are hashed with bcrypt. BVNs are AES-256-GCM encrypted in a field excluded from normal queries; the raw BVN is not stored in `bankDetails` or `verificationNumber`. CAC files use random server-generated names and Cloudinary authenticated raw storage. The document endpoint verifies ownership before issuing a time-limited URL. See [Cloudinary's private download API](https://cloudinary.com/documentation/image_upload_api_reference#private_download_url) for the storage mechanism.

Email verification does **not** mark the seller's BVN/CAC as verified. `verificationStatus` stays `pending` until a separate review or verification provider approves it.

Successful registration returns HTTP 201 with `{ "success": true, "message": "..." }`. Repeating a completed request with the same proof returns success without creating another account or uploading another file. Different proof for an existing email returns 409. Invalid/expired proof returns 403. Failures retain the frontend draft. A failed database transaction attempts to delete the private upload. Storage and MongoDB are separate systems: cleanup is best effort, so a process crash or storage outage can leave an orphaned private asset to reconcile.

## Email codes

- Codes are cryptographically random and stored as keyed hashes.
- Codes expire after 15 minutes and permit at most five attempts, enforced atomically.
- Resend cooldown is 60 seconds, with at most five sends per email per hour.
- Resending replaces the old code and invalidates its verification proof.
- The verification proof expires after one hour and is consumed on registration.
- SMTP failure returns 503 and invalidates the undelivered code.
- Existing unverified buyer accounts are marked email-verified only after a correct code is checked.
- Old plaintext Invitation codes are no longer accepted by these routes. Request a fresh code after this change.

The existing buyer page remains supported through JSON `{ "email": "...", "password": "...", "role": "customer" }` sent to `/api/auth/sign-up`. This creates an unverified customer and sends a code; it cannot create a vendor or admin. If email delivery fails after customer creation, use resend rather than submitting a new password. Seller registration still creates no user until the final multipart request.

## Configuration

Restart Next.js after changing environment values.

- `MONGODB_URI`: use MongoDB Atlas or a replica set supporting transactions. A standalone MongoDB server will not support this flow. The server initializes the User, Business and SignupChallenge collections and indexes before transactional writes; allow those operations when provisioning the database.
- `EMAIL_ADDRESS`, `EMAIL_APP_PASSWORD`, `EMAIL_HOST`: existing Nodemailer service configuration, such as `EMAIL_HOST=gmail`. Alternatively set `SMTP_HOST` and optionally `SMTP_PORT` (465 by default, or 587 for STARTTLS).
- `VERIFICATION_EMAIL_SUBJECT`: optional email subject.
- `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `CLOUDINARY_CLOUD_NAME` or the existing `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
- `BVN_ENCRYPTION_KEY`: exactly 64 hexadecimal characters. A key was generated in the ignored local `.env.local`. Provision and securely back up a separate key for deployment. Never change it without migrating existing encrypted BVNs.
- `SIGNUP_OTP_SECRET`: optional dedicated secret; otherwise `JWT_ACCESS_SECRET` is used with a signup-specific prefix. Changing it invalidates outstanding codes/proofs.
- Existing JWT access/refresh secrets and expiry variables are required for sign-in.

Passwords, files and the signup draft remain only in React context until submission. Refreshing or leaving the signup layout discards them.

## Checks

Run `node --test scripts/signup.test.mjs scripts/signup-server.test.mjs` for frontend serialization and backend validation/workflow tests. Backend tests inject in-memory database behavior and fake mail/storage; they do not send email or access your live MongoDB/Cloudinary accounts. Live delivery and cloud/database configuration must be verified in a development or staging environment.

## Business location

Seller signup requires `business.state`, `business.lga`, `business.city`, and `business.address`. `state` must match a Nigerian state or Federal Capital Territory in the Swagger enum. LGA and city are free-text values, up to 100 characters; geographic membership is not checked. The workshop address permits up to 300 words and 6,000 characters. `landmark` is optional, up to 255 characters. Location strings are trimmed before storage. All fields remain inside the existing JSON-encoded `business` multipart field; no additional API request is needed.

## Additional seller identity fields

The final multipart signup now also requires `cacNumber`, `abssin` (a 10-digit string), and `verificationConsent` (the string `true`). Provide either `nin` (an 11-digit string) or `ninDocument` (JPG, PNG, WEBP or PDF, up to 10 MB). Both may be provided; an entered NIN must always have a valid format. The existing BVN and CAC certificate remain required. Combined uploads may contain two files up to 10 MB each.

NIN and ABSSIN numbers are encrypted using the same AES-256-GCM storage mechanism as BVN and excluded from default database queries. NIN slips use private authenticated Cloudinary storage under `signup/nin/`. The existing document download endpoint accepts `?type=nin`; omitted type defaults to CAC. Owner/admin authorization is required for either document. Consent time is recorded.

**External verification is pending integration.** CAC, ABSSIN and NIN are collected with `identityChecks` set to `pending`. No fabricated registry check, number-format check or upload is treated as verification. Provider API documentation and server-side credentials are still needed for CAC/ABSSIN verification; the user is obtaining them. No external identity lookups are made by the current implementation.

A documented CAC API option is [Kora CAC lookup](https://developers.korapay.com/docs/nigeria-certificate-incorporation), but no provider has been selected or activated. Abia's [vendor registration guidance](https://abiastate.gov.ng/wp-content/uploads/2025/03/Vendors-and-Contractors-Application-Guideline.pdf) describes the 10-digit personal ABSSIN. An authorized ABSSIN lookup contract and holder-matching requirements must be supplied before real verification is implemented.
