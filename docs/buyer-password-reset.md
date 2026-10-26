# Buyer password reset

The sign-in page's Forgot password link opens `/auth/forgot-password`.

1. `POST /api/auth/buyer-password/send-code` accepts `{ email }`. Only existing customer accounts qualify. It sends a six-digit reset code using the existing SMTP configuration. Unknown buyers return an inline error. Codes expire in 15 minutes; resends require a 60-second wait, with five sends per hour per email.
2. `POST /api/auth/buyer-password/verify` accepts `{ email, otp }`. Five incorrect attempts exhaust a code. Successful verification invalidates the code and returns an opaque, single-use `token` valid for 15 minutes. The UI keeps the token only in memory.
3. `POST /api/auth/buyer-password/reset` accepts `{ email, token, password, confirmPassword }`. It checks password confirmation, the existing 8-character/72-byte password limits, and password reuse. It consumes the proof, stores the bcrypt password on the existing User, confirms email ownership and increments `sessionVersion` to invalidate older sessions. Existing reset links are cleared. A changed session version invalidates outstanding reset proof.
4. The UI clears passwords and authentication state, displays `password schanged succesffuly`, and redirects to `/auth/sign-in` after 3.5 seconds. The Login button redirects immediately.

Reset codes and proofs are stored only as hashes in `PasswordResetChallenge`, independently of signup verification. Resending invalidates previous proof; failed delivery invalidates the unsent code. Expired challenge records are removed by a MongoDB TTL index. Existing link-based reset endpoints remain available for previously issued reset links.

Validation: `node --test scripts/buyer-password.test.mjs` and `npm run build`. Automated service tests use in-memory models; live SMTP delivery and live database writes require the configured environment and were not exercised by these tests.
