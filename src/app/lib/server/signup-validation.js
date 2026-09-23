import { createCipheriv, createHmac, randomBytes } from "node:crypto";
import { validateBusinessLocation } from "../business-location.js";
import { validateSellerIdentity } from "../seller-identity.js";

export class SignupError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

function string(value, label, max = 255) {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new SignupError(`${label} is missing or invalid.`);
  }
  return value.trim();
}

export function normalizeEmail(value) {
  const email = string(value, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new SignupError("Enter a valid email address.");
  return email;
}

export function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password) > 72) {
    throw new SignupError("Password must be at least 8 characters and at most 72 bytes.");
  }
  return password;
}

export function hashSecret(value) {
  const secret = process.env.SIGNUP_OTP_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new SignupError("Email verification is not configured.", 503);
  return createHmac("sha256", secret).update(`signup:${value}`).digest("hex");
}

export function encryptBvn(bvn) {
  const encoded = process.env.BVN_ENCRYPTION_KEY;
  if (!/^[a-f\d]{64}$/i.test(encoded || "")) {
    throw new SignupError("Identity storage is not configured.", 503);
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(encoded, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(bvn, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(":");
}

function jsonField(form, key) {
  try {
    const raw = form.get(key);
    if (typeof raw !== "string" || raw.length > 20000) throw new Error();
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new SignupError(`${key} must contain a JSON object.`);
  }
}

export const encryptIdentityNumber = encryptBvn;

export async function validateDocument(file, label = "CAC certificate") {
  if (!file || typeof file.arrayBuffer !== "function" || !file.size || file.size > MAX_DOCUMENT_SIZE) {
    throw new SignupError(`Upload a ${label} no larger than 10MB.`);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const signatures = {
    "application/pdf": bytes.subarray(0, 5).toString() === "%PDF-",
    "image/jpeg": bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    "image/png": bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/webp": bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP",
  };
  if (!signatures[file.type]) throw new SignupError(`The ${label} must be a valid JPG, PNG, WEBP or PDF file.`);
  return { bytes, mimeType: file.type, size: file.size };
}

export async function parseSellerSignup(form) {
  const account = jsonField(form, "account");
  const business = jsonField(form, "business");
  const identity = {
    cacNumber: form.get("cacNumber"), abssin: form.get("abssin"), nin: form.get("nin") || "",
    ninDocument: form.get("ninDocument"), verificationConsent: form.get("verificationConsent") === "true",
  };
  const identityErrors = validateSellerIdentity(identity);
  if (Object.keys(identityErrors).length) throw new SignupError(Object.values(identityErrors)[0]);
  const locationErrors = validateBusinessLocation(business);
  if (Object.keys(locationErrors).length) throw new SignupError(Object.values(locationErrors)[0]);
  const email = normalizeEmail(account.email);
  const password = validatePassword(account.password);
  if (account.acceptedTerms !== true) throw new SignupError("You must accept the terms and privacy policy.");
  const sellerRole = form.get("role");
  if (!["wholesaler_producer", "retailer"].includes(sellerRole)) throw new SignupError("Select a valid seller role.");
  const businessType = business.businessType;
  if (!["leather_manufacturer", "leather_supplier", "leather_artisan", "leather_retailer", "leather_wholesaler", "other"].includes(businessType)) {
    throw new SignupError("Select a valid business type.");
  }
  const description = business.businessDescription ?? "";
  if (typeof description !== "string" || description.length > 6000 || description.trim().split(/\s+/).length > 300) {
    throw new SignupError("Business description must not exceed 300 words.");
  }
  const phoneNumber = string(business.phoneNumber, "Phone number", 20).replace(/[\s-]/g, "");
  const countryCode = string(business.countryCode, "Country code", 5);
  if (!/^\d{7,15}$/.test(phoneNumber) || !/^\+\d{1,4}$/.test(countryCode)) throw new SignupError("Enter a valid phone number and country code.");
  const bvn = form.get("bvn");
  if (typeof bvn !== "string" || !/^\d{11}$/.test(bvn)) throw new SignupError("Enter a valid 11-digit BVN.");
  const verificationToken = string(form.get("verificationToken"), "Verification token", 128);
  if (!/^[a-f\d]{64}$/.test(verificationToken)) throw new SignupError("Please verify your email again.");
  return {
    email, password, sellerRole, verificationToken, bvn,
    cacNumber: identity.cacNumber.trim().toUpperCase(), abssin: identity.abssin,
    nin: identity.nin, verificationConsent: true,
    documentDetails: Object.fromEntries(["registeredName", "registrationDate", "registeredBusinessType", "individualName"].map(key => {
      const value = form.get(key);
      if (value !== null && (typeof value !== "string" || value.length > 255)) throw new SignupError("Document details are invalid.");
      return [key, value?.trim() || ""];
    })),
    ninDocument: identity.ninDocument ? await validateDocument(identity.ninDocument, "NIN slip") : null,
    business: {
      businessName: string(business.businessName, "Business name", 150),
      businessType, businessDescription: description.trim(), phoneNumber, countryCode,
      email: normalizeEmail(business.email),
      state: business.state,
      lga: business.lga.trim(),
      city: business.city.trim(),
      address: business.address.trim(),
      landmark: business.landmark?.trim() || "",
    },
    document: await validateDocument(form.get("cacDocument")),
  };
}

// Bound the actual stream, including requests without Content-Length.
export async function readBody(request, maxBytes, format = "json") {
  const contentType = request.headers.get("content-type") || "";
  if (!(format === "json" ? contentType.includes("application/json") : contentType.includes("multipart/form-data"))) {
    throw new SignupError(`Expected ${format === "json" ? "JSON" : "multipart form data"}.`, 415);
  }
  if (Number(request.headers.get("content-length")) > maxBytes) throw new SignupError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new SignupError("Request body is required.");
  const chunks = [];
  let size = 0;
  try {

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw new SignupError("Request is too large.", 413);
      }
      chunks.push(value);
    }
    
    const body = new Response(Buffer.concat(chunks), { headers: { "content-type": contentType } });
    return await (format === "json" ? body.json() : body.formData());
  } catch (error) {
    if (error instanceof SignupError) throw error;
    throw new SignupError("Malformed request body.");
  } finally {
    reader.releaseLock();
  }
}

export function errorResponse(error) {
  const transactionUnavailable = error?.code === 20 ||
    /transaction numbers are only allowed|does not support transactions|replica set/i.test(error?.message || "");
  if (!(error instanceof SignupError) && error?.code !== 11000) {
    console.error("Signup API unexpected error", {
      name: error?.name,
      code: error?.code,
      message: error?.message,
      cause: error?.cause?.message,
    });
  }
  const status = error instanceof SignupError ? error.status : error.code === 11000 ? 409 : transactionUnavailable ? 503 : 500;
  const message = error instanceof SignupError ? error.message : status === 409 ? "An account with this email already exists." :
    transactionUnavailable ? "Email verification requires MongoDB transactions. Use MongoDB Atlas or a replica set." :
      "Unable to complete the request. Please try again.";
  return Response.json({ success: false, message }, { status, headers: { "Cache-Control": "no-store" } });
}
