import test from "node:test";
import assert from "node:assert/strict";
import { validateBusinessLocation } from "../src/app/lib/business-location.js";
import { parseSellerSignup } from "../src/app/lib/server/signup-validation.js";
import { buildSignupFormData } from "../src/app/lib/signup.js";
import Business from "../src/models/Business.js";

const draft = () => ({
  account: { email: "seller@example.com", password: "ExamplePass123!", confirmPassword: "ExamplePass123!", acceptedTerms: true },
  role: "retailer", verificationToken: "a".repeat(64),
  business: {
    businessName: "Example Shop", businessType: "leather_retailer", businessDescription: "",
    email: "shop@example.com", phoneNumber: "08012345678", countryCode: "+234",
    state: "Abia", lga: " Aba North ", city: " Aba ", address: " 12 Example Road, Aba ", landmark: " Near the market ",
  },
  verification: { cacNumber: "RC1234567", abssin: "0123456789", nin: "01234567890", ninDocument: null, verificationConsent: true, bvn: "01234567890", cacDocument: new File(["%PDF-1.7\n"], "cac.pdf", { type: "application/pdf" }) },
});

test("location survives client serialization, server parsing, and the business schema", async () => {
  const parsed = await parseSellerSignup(buildSignupFormData(draft()));
  const business = new Business({ ...parsed.business, ownerId: "507f1f77bcf86cd799439011" });
  await business.validate();
  assert.equal(business.state, "Abia");
  assert.equal(business.lga, "Aba North");
  assert.equal(business.city, "Aba");
  assert.equal(business.address, "12 Example Road, Aba");
  assert.equal(business.landmark, "Near the market");
});

test("missing required location fields are rejected by the UI validator and the API", async () => {
  for (const field of ["state", "lga", "city", "address"]) {
    const data = draft();
    const form = buildSignupFormData(data);
    data.business[field] = " ";
    assert.ok(validateBusinessLocation(data.business)[field]);
    form.set("business", JSON.stringify(data.business));
    await assert.rejects(parseSellerSignup(form), (error) => error.status === 400);
  }
});

test("address word limit and optional landmark limits are enforced", async () => {
  const data = draft();
  data.business.address = Array(300).fill("word").join(" ");
  delete data.business.landmark;
  assert.deepEqual(validateBusinessLocation(data.business), {});
  const parsed = await parseSellerSignup(buildSignupFormData(data));
  assert.equal(parsed.business.landmark, "");
  data.business.address += " extra";
  assert.ok(validateBusinessLocation(data.business).address);
  data.business.landmark = "x".repeat(256);
  assert.ok(validateBusinessLocation(data.business).landmark);
  data.business.city = {};
  assert.ok(validateBusinessLocation(data.business).city);
});
