import axios from "axios";
import { validateBusinessLocation } from "./business-location.js";
import { validateSellerIdentity } from "./seller-identity.js";
import { validBusinessTypes } from "./business-types.js";

// Signup must not use the authenticated client's refresh/replay interceptor.
const client = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 120000,
});

export function signupError(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  return typeof message === "string" ? message :
    error.message || "Unable to complete the request. Please try again.";
}

async function post(path, data) {
  const response = await client.post(path, data);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "The request was unsuccessful.");
  }
  return response.data;
}

export const sendSignupCode = (email) =>
  post("/auth/send-code", { email });

export const verifySignupCode = (email, otp) =>
  post("/auth/verify", { email, otp });

export function scanSignupDocument(data, file, purpose) {
  const body = new FormData();
  body.append("document", file);
  body.append("purpose", purpose);
  body.append("email", data.account.email);
  body.append("verificationToken", data.verificationToken);
  return post("/auth/documents/scan", body);
}

export function buildSignupFormData(data) {
  const identityErrors = validateSellerIdentity(data.verification);
  if (Object.keys(identityErrors).length) throw new Error(Object.values(identityErrors)[0]);
  const locationErrors = validateBusinessLocation(data.business);
  if (Object.keys(locationErrors).length) throw new Error(Object.values(locationErrors)[0]);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(data.account.email.trim()) ||
      data.account.password.length < 8 ||
      new TextEncoder().encode(data.account.password).length > 72 ||
      data.account.password !== data.account.confirmPassword ||
      !data.account.acceptedTerms) {
    throw new Error("Please complete your account details.");
  }
  if (!data.verificationToken) throw new Error("Please verify your email first.");
  if (!["wholesaler_producer", "retailer"].includes(data.role)) {
    throw new Error("Please select your business role.");
  }
  if (!data.business.businessName.trim() || !validBusinessTypes(data.business.businessType) ||
      !/^[\d\s-]{7,20}$/.test(data.business.phoneNumber.trim()) ||
      !emailPattern.test(data.business.email.trim())) {
    throw new Error("Please complete your business details.");
  }
  if (!/^\d{11}$/.test(data.verification.bvn)) {
    throw new Error("Please enter a valid 11-digit BVN.");
  }
  const file = data.verification.cacDocument;
  if (!(file instanceof Blob) || !file.size || file.size > 10 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
    throw new Error("Please select a JPG, PNG, WEBP or PDF certificate up to 10MB.");
  }
  const body = new FormData();
  const ninFile = data.verification.ninDocument;
  if (ninFile && (!(ninFile instanceof Blob) || !ninFile.size || ninFile.size > 10 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(ninFile.type))) {
    throw new Error("Please select a JPG, PNG, WEBP or PDF NIN slip up to 10MB.");
  }
  body.append("account", JSON.stringify({
    email: data.account.email.trim().toLowerCase(),
    password: data.account.password,
    acceptedTerms: data.account.acceptedTerms,
  }));
  body.append("role", data.role);
  body.append("business", JSON.stringify(data.business));
  body.append("verificationToken", data.verificationToken);
  body.append("bvn", data.verification.bvn);
  body.append("cacDocument", data.verification.cacDocument);
  body.append("cacNumber", data.verification.cacNumber.trim().toUpperCase());
  for (const key of ["registeredName", "registrationDate", "registeredBusinessType", "individualName"]) {
    if (data.verification[key]) body.append(key, data.verification[key]);
  }
  body.append("abssin", data.verification.abssin);
  body.append("verificationConsent", "true");
  if (data.verification.nin) body.append("nin", data.verification.nin);
  if (ninFile) body.append("ninDocument", ninFile);
  return body;
}

export const submitSignup = (data) => post(
  "/auth/sign-up",
  buildSignupFormData(data),
);
