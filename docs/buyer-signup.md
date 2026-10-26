# Buyer signup

Entry point: `/auth/customer-signup`, linked from sign-in.

1. The first form collects email and password and posts `{ email, password, role: "customer" }` to `/api/auth/sign-up`. The service normalizes the email, rejects an existing account with HTTP 409 and `email already exist error`, hashes the password with bcrypt, and inserts an unverified customer into the existing `users` collection. Duplicate-key races return the same error. The response succeeds only after the database write and verification email delivery. If delivery fails, the newly created unverified user is removed so registration can be retried.
2. The UI clears the password from memory and shows the code screen. Resend calls `/api/auth/send-code` without creating another user. The server enforces cooldown, expiry and attempt limits.
3. `/api/auth/verify` checks the email code and marks the stored user as email verified. The UI redirects automatically to `/auth/sign-in` without another password submission.
4. Sign-in posts credentials to `/api/auth/sign-in`. The server checks the bcrypt hash and email verification, sets an HttpOnly refresh cookie and returns an access token. The client saves the session in Zustand and sends customers to `/dashboard/products`.

Duplicate-email errors appear in red under the email input. Passwords are never saved to browser storage. Email delivery and database persistence require the existing MongoDB, signup secret and SMTP configuration.