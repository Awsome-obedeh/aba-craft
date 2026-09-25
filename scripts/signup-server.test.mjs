import test from "node:test";
import assert from "node:assert/strict";
import { createDecipheriv } from "node:crypto";
import Business from "../src/models/Business.js";
import { createSignupService } from "../src/app/lib/server/signup-service.js";
import { parseSellerSignup, readBody, encryptBvn, hashSecret, errorResponse } from "../src/app/lib/server/signup-validation.js";

process.env.SIGNUP_OTP_SECRET = "test-only-otp-secret-not-for-production";
process.env.BVN_ENCRYPTION_KEY = "a".repeat(64);

function fixture() {
  let state = { challenges: [], users: [], businesses: [] };
  let sequence = 0;
  const events = { emails: [], uploads: [], deletions: [] };
  const failures = { mail: false, business: false, upload: false };
  function valueAt(row, key) { return key.split(".").reduce((value, field) => value?.[field], row); }
  function matches(row, filter) {
    return Object.entries(filter).every(([key, condition]) => {
      if (key === "$or") return condition.some((item) => matches(row, item));
      const value = valueAt(row, key);
      if (condition && typeof condition === "object" && !(condition instanceof Date)) {
        return Object.entries(condition).every(([operator, expected]) => ({
          $exists: () => (value !== undefined) === expected,
          $lt: () => value < expected, $lte: () => value <= expected, $gt: () => value > expected,
        })[operator]());
      }
      return value === condition;
    });
  }
  function update(row, changes) {
    Object.assign(row, changes.$set || {});
    for (const [key, increment] of Object.entries(changes.$inc || {})) row[key] = (row[key] || 0) + increment;
    for (const key of Object.keys(changes.$unset || {})) delete row[key];
  }
  function model(collection) {
    return {
      findOne(filter) {
        const result = structuredClone(state[collection].find((row) => matches(row, filter)) || null);
        return { then: (resolve, reject) => Promise.resolve(result).then(resolve, reject), select: () => Promise.resolve(result) };
      },
      async updateOne(filter, changes, options = {}) {
        let row = state[collection].find((item) => matches(item, filter));
        if (!row && options.upsert) {
          row = { _id: String(++sequence), ...changes.$setOnInsert };
          state[collection].push(row);
        }
        if (row) update(row, changes);
      },
      async findOneAndUpdate(filter, changes) {
        const row = state[collection].find((item) => matches(item, filter));
        if (!row) return null;
        update(row, changes);
        return structuredClone(row);
      },
      async create(input) {
        if (collection === "businesses" && failures.business) throw new Error("Database unavailable");
        const values = (Array.isArray(input) ? input : [input]).map((row) => ({ _id: String(++sequence), ...structuredClone(row) }));
        state[collection].push(...values);
        return Array.isArray(input) ? values : values[0];
      },
    };
  }
  const service = createSignupService({
    connect: async () => {}, Challenge: model("challenges"), User: model("users"), Business: model("businesses"),
   
    sendCodeEmail: async (email, code) => {
      if (failures.mail) throw new Error("SMTP unavailable");
      events.emails.push({ email, code });
    },
    uploadDocument: async () => {
      if (failures.upload) throw new Error("Upload failed");
      const document = { publicId: `private/${++sequence}.pdf` };
      events.uploads.push(document);
      return document;
    },
    deleteDocument: async (document) => { events.deletions.push(document); },
  });
  return { service, events, failures, state: () => state };
}

const registration = (verificationToken) => ({
  cacNumber: "RC1234567", abssin: "0123456789", nin: "01234567890", verificationConsent: true,
  email: "seller@example.com", password: "Secret123!", verificationToken, bvn: "01234567890", sellerRole: "retailer",
  business: { state: "Abia", lga: "Aba North", city: "Aba", address: "12 Example Road, Aba", landmark: "", businessName: "Leather shop", businessType: "leather_retailer", email: "shop@example.com", countryCode: "+234", phoneNumber: "08012345678" },
  document: { bytes: Buffer.from("%PDF-1.7\n"), mimeType: "application/pdf", size: 9 },
});

async function verified(f) {
  await f.service.sendCode("seller@example.com");
  return (await f.service.verifyCode("seller@example.com", f.events.emails[0].code)).verificationToken;
}

test("sending normalizes email, hashes codes and enforces resend cooldown", async () => {
  const f = fixture();
  await f.service.sendCode(" Seller@Example.com ");
  assert.match(f.events.emails[0].code, /^\d{6}$/);
  assert.equal(f.events.emails[0].email, "seller@example.com");
  assert.notEqual(f.state().challenges[0].codeHash, f.events.emails[0].code);
  await assert.rejects(f.service.sendCode("seller@example.com"), (error) => error.status === 429);
  assert.equal(f.events.emails.length, 1);
});

test("five concurrent invalid attempts cannot verify an existing user", async () => {
  const f = fixture();
  f.state().users.push({ email: "seller@example.com", emailVerified: false });
  await f.service.sendCode("seller@example.com");
  const wrong = f.events.emails[0].code === "000000" ? "111111" : "000000";
  const outcomes = await Promise.allSettled(Array.from({ length: 8 }, () => f.service.verifyCode("seller@example.com", wrong)));
  assert.equal(outcomes.filter((item) => item.status === "rejected").length, 8);
  assert.equal(f.state().challenges[0].attempts, 5);
  assert.equal(f.state().users[0].emailVerified, false);
  await assert.rejects(f.service.verifyCode("seller@example.com", f.events.emails[0].code));
});

test("expired OTP and failed email delivery do not produce proof", async () => {
  const f = fixture();
  await f.service.sendCode("seller@example.com");
  f.state().challenges[0].codeExpiresAt = new Date(0);
  await assert.rejects(f.service.verifyCode("seller@example.com", f.events.emails[0].code));
  assert.equal(f.state().challenges[0].proofHash, undefined);
  const failed = fixture(); failed.failures.mail = true;
  await assert.rejects(failed.service.sendCode("seller@example.com"), (error) => error.status === 503);
  assert.equal(failed.state().challenges[0].codeHash, undefined);
});

test("valid OTP returns opaque proof without creating a seller", async () => {
  const f = fixture();
  const token = await verified(f);
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(f.state().challenges[0].proofHash, hashSecret(token));
  assert.equal(f.state().users.length, 0);
});

test("final signup writes both records, hides raw BVN, and safely accepts a retry", async () => {
  const f = fixture();
  const token = await verified(f);
  await f.service.registerSeller(registration(token));
  assert.equal(f.state().users[0].role, "vendor");
  assert.equal(f.state().users[0].emailVerified, true);
  assert.notEqual(f.state().users[0].password, "Secret123!");
  assert.equal(f.state().businesses[0].sellerRole, "retailer");
  assert.equal(f.state().businesses[0].verificationStatus, "pending");
  assert.equal(f.state().businesses[0].bvnLastFour, "7890");
  assert.ok(!JSON.stringify(f.state().businesses).includes("01234567890"));
  await f.service.registerSeller(registration(token));
  assert.equal(f.state().users.length, 1);
  assert.equal(f.events.uploads.length, 1);
});

test("transaction failure rolls back records and proof consumption and removes upload", async () => {
  const f = fixture();
  const token = await verified(f);
  f.failures.business = true;
  await assert.rejects(f.service.registerSeller(registration(token)));
  assert.equal(f.state().users.length, 0);
  assert.equal(f.state().challenges[0].usedAt, undefined);
  assert.deepEqual(f.events.deletions, f.events.uploads);
  f.failures.business = false;
  await f.service.registerSeller(registration(token));
  assert.equal(f.state().businesses.length, 1);
});

test("unverified or expired proof cannot trigger document uploads", async () => {
  const f = fixture();
  await assert.rejects(f.service.registerSeller(registration("a".repeat(64))), (error) => error.status === 403);
  const token = await verified(f);
  f.state().challenges[0].proofExpiresAt = new Date(0);
  await assert.rejects(f.service.registerSeller(registration(token)), (error) => error.status === 403);
  assert.equal(f.events.uploads.length, 0);
});

test("customer JSON cannot choose privileged roles", async () => {
  const f = fixture();
  await assert.rejects(f.service.registerCustomer({ email: "a@b.com", password: "Secret123!", role: "admin" }));
  assert.equal(f.state().users.length, 0);
});

function form() {
  const data = registration("a".repeat(64));
  const body = new FormData();
  body.set("account", JSON.stringify({ email: data.email, password: data.password, acceptedTerms: true }));
  body.set("business", JSON.stringify(data.business));
  body.set("role", data.sellerRole);
  body.set("bvn", data.bvn);
  body.set("cacNumber", data.cacNumber);
  body.set("abssin", data.abssin);
  body.set("nin", data.nin);
  body.set("verificationConsent", "true");
  body.set("verificationToken", data.verificationToken);
  body.set("cacDocument", new File(["%PDF-1.7\n"], "cac.pdf", { type: "application/pdf" }));
  return body;
}

test("multipart parsing checks actual file signature and rejects privileged roles", async () => {
  const valid = await parseSellerSignup(form());
  assert.equal(valid.document.bytes.toString(), "%PDF-1.7\n");
  assert.equal(valid.email, "seller@example.com");
  const invalid = form();
  invalid.set("cacDocument", new File(["executable"], "fake.pdf", { type: "application/pdf" }));
  await assert.rejects(parseSellerSignup(invalid));
  const privileged = form(); privileged.set("role", "admin");
  await assert.rejects(parseSellerSignup(privileged));
  const malformed = form(); malformed.set("account", "null");
  await assert.rejects(parseSellerSignup(malformed));
});

test("signup parses multiple services and normalizes legacy single types", async () => {
  assert.deepEqual((await parseSellerSignup(form())).business.businessType, ["leather_retailer"]);
  const body = form();
  const business = JSON.parse(body.get("business"));
  business.businessType = ["leather_manufacturer", "leather_retailer"];
  body.set("business", JSON.stringify(business));
  const parsed = await parseSellerSignup(body);
  assert.deepEqual(parsed.business.businessType, business.businessType);
  const document = new Business({ ...parsed.business, ownerId: "507f1f77bcf86cd799439011" });
  await document.validate();
  assert.deepEqual(document.toObject().businessType, business.businessType);
  for (const value of [[], ["unknown"], ["leather_retailer", "leather_retailer"], null, [123]]) {
    body.set("business", JSON.stringify({ ...business, businessType: value }));
    await assert.rejects(parseSellerSignup(body), /business type/);
  }
});

test("body limits apply without Content-Length; malformed JSON returns 400", async () => {
  const request = new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "seller@example.com" }) });
  await assert.rejects(readBody(request, 5), (error) => error.status === 413);
  const malformed = new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  await assert.rejects(readBody(malformed, 4096), (error) => error.status === 400);
});

test("BVN encryption authenticates ciphertext and uses fresh nonces", () => {
  const encrypted = encryptBvn("01234567890");
  assert.notEqual(encrypted, encryptBvn("01234567890"));
  const [, iv, tag, ciphertext] = encrypted.split(":");
  const cipher = createDecipheriv("aes-256-gcm", Buffer.from(process.env.BVN_ENCRYPTION_KEY, "hex"), Buffer.from(iv, "base64"));
  cipher.setAuthTag(Buffer.from(tag, "base64"));
  assert.equal(Buffer.concat([cipher.update(Buffer.from(ciphertext, "base64")), cipher.final()]).toString(), "01234567890");
});

test("unexpected errors do not leak infrastructure details", async () => {
  const response = errorResponse(new Error("secret database connection string"));
  assert.equal(response.status, 500);
  assert.ok(!(await response.text()).includes("secret database"));
});

test("transaction infrastructure errors explain the MongoDB requirement", async () => {
  const response = errorResponse(Object.assign(new Error("Transaction numbers are only allowed on a replica set member or mongos"), { code: 20 }));
  assert.equal(response.status, 503);
  assert.match(await response.text(), /MongoDB transactions/);
});
