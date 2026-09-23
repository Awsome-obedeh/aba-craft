import test from "node:test";
import assert from "node:assert/strict";
import { validateSellerIdentity } from "../src/app/lib/seller-identity.js";
import { buildSignupFormData } from "../src/app/lib/signup.js";
import { parseSellerSignup } from "../src/app/lib/server/signup-validation.js";
import { createSignupService } from "../src/app/lib/server/signup-service.js";
import Business from "../src/models/Business.js";

process.env.SIGNUP_OTP_SECRET = "identity-tests-only";
process.env.BVN_ENCRYPTION_KEY = "b".repeat(64);

const file = () => new File(["%PDF-1.7\n"], "identity.pdf", { type: "application/pdf" });
const draft = () => ({
  account: { email: "seller@example.com", password: "ExamplePass123!", confirmPassword: "ExamplePass123!", acceptedTerms: true },
  role: "retailer", verificationToken: "a".repeat(64),
  business: { businessName: "Example Shop", businessType: "leather_retailer", email: "shop@example.com", phoneNumber: "08012345678", countryCode: "+234", state: "Abia", lga: "Aba North", city: "Aba", address: "12 Example Road", landmark: "" },
  verification: { bvn: "01234567890", cacNumber: "RC1234567", cacDocument: file(), abssin: "0123456789", nin: "01234567890", ninDocument: null, verificationConsent: true },
});

test("all identity numbers survive multipart serialization without losing leading zeroes", async () => {
  const parsed = await parseSellerSignup(buildSignupFormData(draft()));
  assert.equal(parsed.cacNumber, "RC1234567");
  assert.equal(parsed.abssin, "0123456789");
  assert.equal(parsed.nin, "01234567890");
  assert.equal(parsed.verificationConsent, true);
  assert.equal(parsed.ninDocument, null);
});

test("NIN slip can replace the number but must pass file validation", async () => {
  const data = draft();
  data.verification.nin = "";
  data.verification.ninDocument = file();
  const form = buildSignupFormData(data);
  const parsed = await parseSellerSignup(form);
  assert.equal(parsed.nin, "");
  assert.equal(parsed.ninDocument.bytes.toString(), "%PDF-1.7\n");
  form.set("ninDocument", new File(["not a PDF"], "fake.pdf", { type: "application/pdf" }));
  await assert.rejects(parseSellerSignup(form), /NIN slip/);
});

test("missing/invalid identities and consent are rejected on the server", async () => {
  for (const [field, value] of [["cacNumber", ""], ["abssin", "123"], ["nin", ""], ["nin", "123"], ["verificationConsent", "false"]]) {
    const form = buildSignupFormData(draft());
    form.set(field, value);
    await assert.rejects(parseSellerSignup(form), (error) => error.status === 400);
  }
  assert.ok(validateSellerIdentity({ ...draft().verification, abssin: 1234567890 }).abssin);
});

function serviceFixture({ failNinUpload = false, failBusiness = false } = {}) {
  const state = { uploads: [], deleted: [], business: null, proofRestored: false, userDeleted: false };
  const service = createSignupService({
    connect: async () => {},
    Challenge: {
      exists: async () => true,
      findOneAndUpdate: async () => ({ _id: "proof" }),
      updateOne: async () => { state.proofRestored = true; },
    },
    User: {
      findOne: () => ({ select: async () => null }),
      create: async () => ({ _id: "507f1f77bcf86cd799439011" }),
      deleteOne: async () => { state.userDeleted = true; },
    },
    Business: {
      create: async (business) => { if (failBusiness) throw new Error("Database failed"); state.business = business; },
      findOne: async () => null,
    },
    uploadDocument: async (document) => {
      if (failNinUpload && document.purpose === "nin") throw new Error("NIN upload failed");
      const result = { publicId: `${document.purpose || "cac"}/test.pdf`, mimeType: document.mimeType };
      state.uploads.push(result);
      return result;
    },
    deleteDocument: async (document) => { state.deleted.push(document); },
    sendCodeEmail: async () => { throw new Error("Email must not be sent by this test"); },
  });
  return { service, state };
}

test("registration stores encrypted numbers and private NIN file while checks stay pending", async () => {
  const f = serviceFixture();
  const data = draft(); data.verification.ninDocument = file();
  await f.service.registerSeller(await parseSellerSignup(buildSignupFormData(data)));
  assert.equal(f.state.uploads.length, 2);
  assert.equal(f.state.business.ninDocument.publicId, "nin/test.pdf");
  assert.equal(f.state.business.cacNumber, "RC1234567");
  assert.match(f.state.business.ninEncrypted, /^v1:/);
  assert.match(f.state.business.abssinEncrypted, /^v1:/);
  assert.equal(f.state.business.nin, undefined);
  assert.equal(f.state.business.abssin, undefined);
  assert.deepEqual(f.state.business.identityChecks, { cac: "pending", abssin: "pending", nin: "pending" });
  for (const field of ["ninEncrypted", "abssinEncrypted", "ninDocument"]) assert.equal(Business.schema.path(field).options.select, false);
});

test("failed NIN upload removes CAC upload and leaves email proof unused", async () => {
  const f = serviceFixture({ failNinUpload: true });
  const data = draft(); data.verification.ninDocument = file();
  await assert.rejects(f.service.registerSeller(await parseSellerSignup(buildSignupFormData(data))), /NIN upload failed/);
  assert.deepEqual(f.state.deleted, f.state.uploads);
  assert.equal(f.state.proofRestored, false);
});

test("database failure cleans up both documents and restores proof", async () => {
  const f = serviceFixture({ failBusiness: true });
  const data = draft(); data.verification.ninDocument = file();
  await assert.rejects(f.service.registerSeller(await parseSellerSignup(buildSignupFormData(data))), /Database failed/);
  assert.equal(f.state.deleted.length, 2);
  assert.equal(f.state.proofRestored, true);
  assert.equal(f.state.userDeleted, true);
});
