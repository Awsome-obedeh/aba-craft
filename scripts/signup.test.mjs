import test from "node:test";
import assert from "node:assert/strict";
import { buildSignupFormData, signupError } from "../src/app/lib/signup.js";

const draft = () => ({
  account: { email: " Seller@example.com ", password: "Secret123!", confirmPassword: "Secret123!", acceptedTerms: true },
  role: "retailer",
  verificationToken: "email-proof",
  business: { state: "Abia", lga: "Aba North", city: "Aba", address: "12 Example Road, Aba", landmark: "", businessName: "Test business", businessType: "leather_retailer", businessDescription: "Leather goods", phoneNumber: "08012345678", countryCode: "+234", email: "business@example.com" },
  verification: { cacNumber: "RC1234567", abssin: "0123456789", nin: "01234567890", ninDocument: null, verificationConsent: true, bvn: "01234567890", cacDocument: new File(["certificate"], "cac.pdf", { type: "application/pdf" }) },
});

test("one multipart body contains every step and the file bytes", async () => {
  const data = draft();
  const form = buildSignupFormData(data);
  assert.deepEqual([...form.keys()], ["account", "role", "business", "verificationToken", "bvn", "cacDocument", "cacNumber", "abssin", "verificationConsent", "nin"]);
  assert.deepEqual(JSON.parse(form.get("account")), { email: "seller@example.com", password: "Secret123!", acceptedTerms: true });
  assert.deepEqual(JSON.parse(form.get("business")), data.business);
  assert.equal(form.get("role"), "retailer");
  assert.equal(form.get("verificationToken"), "email-proof");
  assert.equal(form.get("bvn"), "01234567890");
  assert.equal(form.get("cacDocument").name, "cac.pdf");
  assert.equal(await form.get("cacDocument").text(), "certificate");
});

test("incomplete or invalid drafts cannot be serialized", () => {
  for (const mutate of [
    d => { d.account.confirmPassword = "different"; },
    d => { d.account.acceptedTerms = false; },
    d => { d.verificationToken = ""; },
    d => { d.role = "admin"; },
    d => { d.business.email = "invalid"; },
    d => { d.verification.bvn = "1234567890"; },
    d => { d.verification.cacDocument = null; },
    d => { d.verification.cacDocument = new File(["bad"], "bad.exe"); },
  ]) {
    const data = draft();
    mutate(data);
    assert.throws(() => buildSignupFormData(data));
  }
});

test("backend validation messages are readable", () => {
  assert.equal(signupError({ response: { data: { message: ["Email taken.", "Try another."] } } }), "Email taken. Try another.");
});

test("signup preserves multiple business types and rejects empty or invalid selections", () => {
  const data = draft();
  data.business.businessType = ["leather_manufacturer", "leather_retailer"];
  assert.deepEqual(JSON.parse(buildSignupFormData(data).get("business")).businessType, data.business.businessType);
  for (const value of [[], ["unknown"], ["leather_retailer", "leather_retailer"], null]) {
    data.business.businessType = value;
    assert.throws(() => buildSignupFormData(data), /business details/);
  }
});
