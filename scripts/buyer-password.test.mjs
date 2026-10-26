import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { createBuyerPasswordService } from "../src/app/lib/server/buyer-password-service.js";

process.env.SIGNUP_OTP_SECRET = "buyer-reset-tests-only";

async function fixture() {
  const users = [{ _id: "buyer", email: "buyer@example.com", role: "customer", sessionVersion: 0, password: await bcrypt.hash("OldPassword123!", 4) }];
  const challenges = [];
  const emails = [];
  const failures = { mail: false };
  function matches(row, filter) {
    return Object.entries(filter).every(([key, expected]) => {
      if (key === "$or") return expected.some((option) => matches(row, option));
      const actual = row[key];
      if (expected && typeof expected === "object" && !(expected instanceof Date)) {
        return Object.entries(expected).every(([operator, value]) => ({
          $exists: () => (actual !== undefined) === value,
          $lt: () => actual < value, $lte: () => actual <= value, $gt: () => actual > value,
        })[operator]());
      }
      return actual === expected;
    });
  }
  function change(row, update) {
    Object.assign(row, update.$set || {});
    for (const [key, increment] of Object.entries(update.$inc || {})) row[key] = (row[key] || 0) + increment;
    for (const key of Object.keys(update.$unset || {})) delete row[key];
  }
  function model(rows) {
    return {
      async findOne(filter) { return structuredClone(rows.find((row) => matches(row, filter)) || null); },
      async updateOne(filter, update, options = {}) {
        let row = rows.find((row) => matches(row, filter));
        if (!row && options.upsert) { row = { _id: "challenge", ...update.$setOnInsert }; rows.push(row); }
        if (!row) return { modifiedCount: 0 };
        change(row, update); return { modifiedCount: 1 };
      },
      async findOneAndUpdate(filter, update) {
        const row = rows.find((row) => matches(row, filter));
        if (!row) return null;
        change(row, update); return structuredClone(row);
      },
    };
  }
  const service = createBuyerPasswordService({ connect: async () => {}, User: model(users), Challenge: model(challenges),
    sendEmail: async (email, code) => { if (failures.mail) throw new Error("SMTP failed"); emails.push({ email, code }); },
  });
  return { service, users, challenges, emails, failures };
}
async function proof(f) {
  await f.service.sendCode(" Buyer@Example.com ");
  return (await f.service.verifyCode("buyer@example.com", f.emails[0].code)).token;
}
const reset = (token) => ({ email: "buyer@example.com", token, password: "NewPassword456!", confirmPassword: "NewPassword456!" });

test("buyer reset hashes codes, normalizes email, and enforces send cooldown", async () => {
  const f = await fixture();
  await f.service.sendCode(" Buyer@Example.com ");
  assert.equal(f.emails[0].email, "buyer@example.com");
  assert.match(f.emails[0].code, /^\d{6}$/);
  assert.notEqual(f.challenges[0].codeHash, f.emails[0].code);
  await assert.rejects(f.service.sendCode("buyer@example.com"), (error) => error.status === 429);
});
test("unknown and non-buyer accounts cannot request buyer reset codes", async () => {
  const f = await fixture();
  await assert.rejects(f.service.sendCode("unknown@example.com"), (error) => error.status === 404);
  f.users[0].role = "vendor";
  await assert.rejects(f.service.sendCode("buyer@example.com"), (error) => error.status === 404);
  assert.equal(f.emails.length, 0);
});
test("invalid code attempts are limited and expired codes cannot verify", async () => {
  const f = await fixture();
  await f.service.sendCode("buyer@example.com");
  const wrong = f.emails[0].code === "000000" ? "111111" : "000000";
  await Promise.all(Array.from({ length: 5 }, () => assert.rejects(f.service.verifyCode("buyer@example.com", wrong))));
  await assert.rejects(f.service.verifyCode("buyer@example.com", f.emails[0].code));
  assert.equal(f.challenges[0].attempts, 5);
  f.challenges[0].attempts = 0; f.challenges[0].codeExpiresAt = new Date(0);
  await assert.rejects(f.service.verifyCode("buyer@example.com", f.emails[0].code));
});
test("verified reset saves a bcrypt password, invalidates sessions and cannot be replayed", async () => {
  const f = await fixture();
  const token = await proof(f);
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal((await f.service.resetPassword(reset(token))).message, "password schanged succesffuly");
  assert.equal(await bcrypt.compare("NewPassword456!", f.users[0].password), true);
  assert.equal(await bcrypt.compare("OldPassword123!", f.users[0].password), false);
  assert.equal(f.users[0].sessionVersion, 1);
  assert.equal(f.users[0].emailVerified, true);
  await assert.rejects(f.service.resetPassword(reset(token)));
});
test("reset rejects mismatched passwords, reuse, wrong email, missing or expired proof", async () => {
  const f = await fixture(); const token = await proof(f);
  await assert.rejects(f.service.resetPassword({ ...reset(token), confirmPassword: "different" }));
  await assert.rejects(f.service.resetPassword({ ...reset(token), password: "OldPassword123!", confirmPassword: "OldPassword123!" }));
  await assert.rejects(f.service.resetPassword({ ...reset(token), email: "other@example.com" }));
  await assert.rejects(f.service.resetPassword(reset("a".repeat(64))));
  f.challenges[0].proofExpiresAt = new Date(0);
  await assert.rejects(f.service.resetPassword(reset(token)));
  assert.equal(f.users[0].sessionVersion, 0);
});
test("resending invalidates previous proof; email delivery failures invalidate codes", async () => {
  const f = await fixture(); const token = await proof(f);
  f.challenges[0].nextSendAt = new Date(0);
  await f.service.sendCode("buyer@example.com");
  await assert.rejects(f.service.resetPassword(reset(token)));
  f.challenges[0].nextSendAt = new Date(0); f.failures.mail = true;
  await assert.rejects(f.service.sendCode("buyer@example.com"), (error) => error.status === 503);
  assert.equal(f.challenges[0].codeHash, undefined);
});
test("changed account sessions invalidate outstanding password reset proof", async () => {
  const f = await fixture(); const token = await proof(f);
  f.users[0].sessionVersion = 1;
  await assert.rejects(f.service.resetPassword(reset(token)));
});
