// Run against a local production build. Every POST intentionally fails validation
// before database/email/storage access; these checks create no accounts or messages.
import assert from "node:assert/strict";

const origin = "http://127.0.0.1:3107";
const cases = [
  ["/api/auth/send-code", "POST", { email: "invalid" }, 400],
  ["/api/auth/resend", "POST", { email: "invalid" }, 400],
  ["/api/auth/verify", "POST", { email: "invalid", otp: "000000" }, 400],
  ["/api/test/auth/verify", "POST", { email: "invalid", invitationCode: "000000" }, 400],
  ["/api/auth/sign-up", "POST", { role: "admin" }, 415],
  ["/api/test/auth/sign-up", "POST", { role: "admin" }, 415],
  ["/api/auth/sign-in", "POST", { email: "invalid", password: "invalid" }, 400],
  ["/api/auth/documents/000000000000000000000001", "GET", null, 401],
  ["/api/test/sign-cloudinary", "POST", {}, 410],
  ["/api/auth/sign-up", "GET", null, 405],
];

await Promise.all(cases.map(async ([path, method, body, expected]) => {
  const response = await fetch(origin + path, {
    method, headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, expected, `${method} ${path}`);
  if (expected !== 405) assert.equal((await response.json()).success, false);
  console.log(`PASS ${method} ${path}: ${expected}`);
}));
