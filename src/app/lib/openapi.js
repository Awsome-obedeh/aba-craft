// Source of truth for the public API contract. Do not import server services here:
// reading documentation must not require database, mail, or storage credentials.
import { nigeriaStates } from "./business-location.js";
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema, example) => ({ "application/json": { schema, ...(example ? { example } : {}) } });
const response = (description, schema, example) => ({ description, content: json(schema, example) });
const body = (schema, example) => ({ required: true, content: json(schema, example) });
const errors = (...codes) => Object.fromEntries(codes.map((code) => [code, { $ref: `#/components/responses/Error${code}` }]));
const email = { type: "string", format: "email", maxLength: 254, example: "seller@example.com", description: "Trimmed and converted to lowercase." };
const password = { type: "string", format: "password", minLength: 8, maxLength: 72, writeOnly: true, description: "At least 8 characters; maximum 72 UTF-8 bytes (not 72 Unicode characters)." };
const sellerRole = { type: "string", enum: ["wholesaler_producer", "retailer"], example: "retailer" };
const accountExample = { email: "seller@example.com", password: "ExamplePass123!", acceptedTerms: true };
const businessExample = {
  businessName: "Example Leather Shop", businessType: "leather_retailer",
  businessDescription: "Handmade leather shoes and bags.", phoneNumber: "08012345678", countryCode: "+234", email: "shop@example.com",
  state: "Abia", lga: "Aba North", city: "Aba", address: "12 Example Road, Aba", landmark: "Near the community hall",
};

const sendCodeOperation = (operationId, summary) => ({
  tags: ["Email verification"], operationId, summary, security: [],
  description: "Sends a six-digit code without creating a seller account. Codes expire after 15 minutes. A 60-second resend cooldown and five sends per email per hour are enforced. Sending a new code invalidates the previous code and verification proof. Already-verified accounts return 409. Mail failure returns 503; wait before retrying.",
  requestBody: body(ref("EmailRequest"), { email: "seller@example.com" }),
  responses: {
    200: response("Code sent. Times are in seconds.", ref("CodeSent"), { success: true, message: "Verification code sent to your email.", retryAfter: 60, expiresIn: 900 }),
    ...errors(400, 409, 413, 415, 429, 500, 503),
  },
});

const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Abacrafts API",
    version: "1.0.0",
    description: [
      "API reference for the active routes under `/api`. Routes under `/api/test` are intentionally excluded.",
      "### Seller registration\n1. Send a code with `POST /auth/send-code`.\n2. Verify it using `POST /auth/verify` and retain the returned `verificationToken`.\n3. Submit all account, business and identity fields plus the CAC file together using multipart `POST /auth/sign-up`.\n4. Sign in using `POST /auth/sign-in`. Email is verified, but identity/business review remains pending.",
      "### Authentication\nSign-in returns an access token and sets the HttpOnly `refreshToken` cookie. Paste the access token into **Authorize → bearerAuth** (without the `Bearer` prefix) to access protected document URLs. Refresh uses the browser's existing cookie; you cannot type an HttpOnly cookie into Swagger UI. Use this same-origin documentation page for cookie-based requests. Authorization is not persisted across page reloads.",
      "### Trying requests\nSelect **Try it out**, edit the example, then **Execute**. Requests use this site's real API and can send email or create accounts; use your own test email and test documents. Examples are illustrative. JSON requests are limited to 4 KB. Seller multipart requests allow two files of up to 10 MB each plus 64 KB of metadata. File type checks do not verify document authenticity or perform malware scanning.",
    ].join("\n\n"),
  },
  servers: [{ url: "/api", description: "Current application's API (same origin)" }],
  tags: [
    { name: "Email verification", description: "Send and verify email codes before completing registration." },
    { name: "Registration", description: "Complete seller registration and the existing customer registration flow." },
    { name: "Authentication", description: "Sign in, refresh access tokens and sign out." },
    { name: "Documents", description: "Access privately stored CAC documents as their owner or an admin." },
    { name: "Documentation", description: "Download this OpenAPI specification." },
  ],
  paths: {
    "/auth/send-code": { post: sendCodeOperation("sendEmailCode", "Send an email verification code") },
    "/auth/resend": { post: sendCodeOperation("resendEmailCode", "Resend an email verification code") },
    "/auth/verify": {
      post: {
        tags: ["Email verification"], operationId: "verifyEmailCode", summary: "Verify an email code", security: [],
        description: "Checks the code before marking an existing account email as verified. Returns an opaque proof bound to the email, valid for one hour, for the final seller signup. At most five attempts are allowed per code, including concurrent requests. Invalid, expired or exhausted codes return 400. For compatibility the `invitationCode` field is accepted instead of `otp`; if both are sent, `otp` takes precedence. This operation does not create a new seller or verify a BVN/CAC document.",
        requestBody: body(ref("VerifyCodeRequest"), { email: "seller@example.com", otp: "123456" }),
        responses: {
          200: response("Email verified; save verificationToken for seller signup.", ref("VerificationResult")),
          ...errors(400, 413, 415, 500, 503),
        },
      },
    },
    "/auth/sign-up": {
      post: {
        tags: ["Registration"], operationId: "registerAccount", summary: "Register a seller or customer", security: [],
        description: [
          "**Seller:** choose `multipart/form-data`. Supply the actual CAC file and all five steps in one request. `account` and `business` are JSON-encoded **strings**, not file parts or nested form fields. Expand the SellerAccount and BusinessInput schemas for their field definitions. The browser sets the multipart boundary.",
          "The seller permission role is forced to `vendor`; the submitted role becomes the business's `sellerRole`. User creation, business creation and verification-proof consumption share a MongoDB transaction. Passwords are hashed, BVNs encrypted, and documents stored privately. Identity/business status remains `pending`. The endpoint does not sign the user in.",
          "Submitting again with the same proof after a successful registration returns 201 without another account or upload. A different proof for an existing email returns 409. Proof that is missing/invalid at input validation returns 400; expired or unavailable proof returns 403. After a submission error the client may retain the draft. Upload cleanup after database failure is best effort.",
          "**Customer:** choose `application/json` with `role: customer`. This creates an unverified customer and sends an email code. Verify through `/auth/verify` before signing in. If mail delivery fails after customer creation, call `/auth/resend`; submitting signup again returns 409. JSON cannot create a vendor or admin.",
        ].join("\n\n"),
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: ref("SellerSignupForm"),
              encoding: {
                account: { contentType: "text/plain" }, business: { contentType: "text/plain" },
                cacDocument: { contentType: "application/pdf, image/jpeg, image/png, image/webp" },
                ninDocument: { contentType: "application/pdf, image/jpeg, image/png, image/webp" },
              },
            },
            "application/json": {
              schema: ref("CustomerSignupRequest"),
              example: { email: "buyer@example.com", password: "ExamplePass123!", role: "customer" },
            },
          },
        },
        responses: {
          201: {
            description: "Seller registration accepted (including a completed retry), or unverified customer created and code sent.",
            content: { "application/json": {
              schema: ref("RegistrationResult"),
              examples: {
                seller: { value: { success: true, message: "Registration submitted. Your identity and business are pending review." } },
                retry: { value: { success: true, message: "Registration already submitted." } },
                customer: { value: { success: true, message: "Verification code sent to your email.", retryAfter: 60, expiresIn: 900 } },
              },
            } },
          },
          ...errors(400, 403, 409, 413, 415, 429, 500, 502, 503),
        },
      },
    },
    "/auth/sign-in": {
      post: {
        tags: ["Authentication"], operationId: "signIn", summary: "Sign in with email and password", security: [],
        description: "Returns an access token and sets the refreshToken HttpOnly cookie for seven days (SameSite=Strict; Secure in production). Unverified accounts return 403 with code EMAIL_NOT_VERIFIED. This response does not include the password, BVN or document storage identifier.",
        requestBody: body(ref("SignInRequest"), { email: "seller@example.com", password: "ExamplePass123!" }),
        responses: {
          200: {
            ...response("Signed in. Use accessToken as a Bearer token for protected requests.", ref("SignInResult")),
            headers: { "Set-Cookie": { description: "Sets the HttpOnly refreshToken cookie. The browser stores it automatically.", schema: { type: "string", example: "refreshToken=<token>; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800" } } },
          },
          403: response("Email has not been verified.", ref("UnverifiedEmailError"), { success: false, code: "EMAIL_NOT_VERIFIED", message: "Please verify your email before signing in." }),
          ...errors(400, 401, 413, 415, 500),
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Authentication"], operationId: "refreshAccessToken", summary: "Refresh the access token",
        description: "Uses the refreshToken cookie set by sign-in. No request body or Bearer token is needed. Swagger UI sends the same-origin browser cookie; its Authorize dialog cannot set this HttpOnly cookie. The refresh cookie is not rotated by this endpoint. Unlike sign-in, the response contains no success field and includes only id, role and email in user.",
        security: [{ refreshCookie: [] }],
        responses: {
          200: response("New access token.", ref("RefreshResult")),
          401: response("Refresh cookie is missing, expired or invalid.", ref("MessageError"), { message: "Unauthorized" }),
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication"], operationId: "signOut", summary: "Sign out", security: [],
        description: "Clears the current browser's refreshToken cookie. No body is required. Idempotent: returns success even if there is no cookie. Already-issued access tokens remain valid until expiry; clear the frontend's in-memory token and Swagger's authorization separately.",
        responses: {
          200: { ...response("Refresh cookie cleared.", ref("Success"), { success: true }), headers: {
            "Set-Cookie": { description: "Expires the refreshToken cookie.", schema: { type: "string" } },
          } },
          500: response("Could not clear the cookie.", ref("Error"), { success: false, message: "Server error" }),
        },
      },
    },
    "/auth/documents/{businessId}": {
      get: {
        tags: ["Documents"], operationId: "getCacDocument", summary: "Get a private identity document download URL",
        description: "Requires a vendor token belonging to this business's owner, or an admin token. A vendor cannot access another owner's document. Use type=cac (default) or type=nin to choose the file. Returns JSON containing a signed URL (not file bytes and not a redirect). Open the returned URL within 60 seconds. Unknown businesses, missing documents and businesses owned by someone else return 404.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "type", in: "query", description: "Document to download.", schema: { type: "string", enum: ["cac", "nin"], default: "cac" } }, { name: "businessId", in: "path", required: true, description: "Business MongoDB ObjectId, not the user ID.", schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439011" } }],
        responses: {
          200: response("Temporary private download URL. Response is not cached.", ref("DocumentDownloadResult")),
          ...errors(400, 401, 403, 404, 500, 503),
        },
      },
    },
    "/openapi": {
      get: {
        tags: ["Documentation"], operationId: "getOpenApi", summary: "Download the OpenAPI specification", security: [],
        description: "Returns this OpenAPI 3.0.3 document as JSON. Import it into Postman, Swagger Editor or an API client generator. No backend credentials are needed to read documentation.",
        responses: { 200: response("OpenAPI specification.", { type: "object", required: ["openapi", "info", "paths"], properties: {
          openapi: { type: "string", example: "3.0.3" }, info: { type: "object" }, paths: { type: "object" },
        } }) },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Access token from sign-in or refresh. Paste only the token; Swagger adds Bearer." },
      refreshCookie: { type: "apiKey", in: "cookie", name: "refreshToken", description: "HttpOnly cookie issued by sign-in. Use same-origin sign-in first; browser JavaScript cannot set it manually." },
    },
    schemas: {
      EmailRequest: { type: "object", required: ["email"], properties: { email } },
      VerifyCodeRequest: {
        type: "object", required: ["email"], anyOf: [{ required: ["otp"] }, { required: ["invitationCode"] }],
        properties: {
          email,
          otp: { type: "string", pattern: "^\\d{6}$", example: "123456", description: "Keep leading zeroes; send a string." },
          invitationCode: { type: "string", pattern: "^\\d{6}$", deprecated: true, description: "Legacy alias for otp. Omit this when sending otp." },
        },
      },
      SellerAccount: {
        type: "object", required: ["email", "password", "acceptedTerms"],
        properties: { email, password, acceptedTerms: { type: "boolean", enum: [true], description: "Acceptance of the terms and privacy policy." } },
        example: accountExample,
      },
      BusinessInput: {
        type: "object", required: ["businessName", "businessType", "phoneNumber", "countryCode", "email", "state", "lga", "city", "address"],
        properties: {
          businessName: { type: "string", minLength: 1, maxLength: 150 },
          state: { type: "string", enum: nigeriaStates, description: "Nigerian state or Federal Capital Territory." },
          lga: { type: "string", minLength: 1, maxLength: 100, description: "Local government area. Entered as text; geographic membership is not validated." },
          city: { type: "string", minLength: 1, maxLength: 100, description: "City or town." },
          address: { type: "string", minLength: 1, maxLength: 6000, description: "Full business/workshop address. Required, at most 300 words." },
          landmark: { type: "string", maxLength: 255, description: "Optional nearest landmark." },
          businessType: { type: "string", enum: ["leather_manufacturer", "leather_supplier", "leather_artisan", "leather_retailer", "leather_wholesaler", "other"] },
          businessDescription: { type: "string", maxLength: 6000, description: "Optional, at most 300 words. Trimmed before storage." },
          phoneNumber: { type: "string", maxLength: 20, description: "7–15 digits after removing spaces and hyphens. Keep the country code in the separate field.", example: "08012345678" },
          countryCode: { type: "string", pattern: "^\\+\\d{1,4}$", example: "+234" },
          email: { ...email, description: "Business contact email; may differ from the account email." },
        }, example: businessExample,
      },
      SellerSignupForm: {
        type: "object", required: ["account", "role", "business", "verificationToken", "bvn", "cacDocument", "cacNumber", "abssin", "verificationConsent"], anyOf: [{ required: ["nin"] }, { required: ["ninDocument"] }],
        properties: {
          account: { type: "string", maxLength: 20000, description: "JSON.stringify(SellerAccount). Must be a text form field, not a JSON file.", example: JSON.stringify(accountExample) },
          role: sellerRole,
          business: { type: "string", maxLength: 20000, description: "JSON.stringify(BusinessInput). Must be a text form field, not a JSON file.", example: JSON.stringify(businessExample) },
          verificationToken: { type: "string", pattern: "^[a-f0-9]{64}$", writeOnly: true, description: "Use the real opaque token returned by /auth/verify. Expires in one hour and is bound to the account email." },
          bvn: { type: "string", pattern: "^\\d{11}$", writeOnly: true, example: "01234567890", description: "11-digit BVN. Example is illustrative; preserve leading zeroes." },
          cacNumber: { type: "string", minLength: 2, maxLength: 30, example: "RC1234567", description: "CAC number from the certificate. Collected for pending provider verification; format validation is not registry confirmation." },
          abssin: { type: "string", pattern: "^\\d{10}$", writeOnly: true, example: "0123456789", description: "10-digit ABSSIN, stored encrypted. Live verification awaits authorized provider integration." },
          nin: { type: "string", pattern: "^\\d{11}$", writeOnly: true, example: "01234567890", description: "11-digit NIN. Required unless ninDocument is supplied. Not automatically verified." },
          ninDocument: { type: "string", format: "binary", description: "NIN slip, JPG/PNG/WEBP/PDF up to 10 MB. Required unless nin is supplied. Stored privately." },
          verificationConsent: { type: "string", enum: ["true"], description: "Consent to authorized identity and registration verification." },
          cacDocument: { type: "string", format: "binary", description: "CAC certificate: JPG, PNG, WEBP or PDF, up to 10 MB. MIME and file signature must match." },
        },
      },
      CustomerSignupRequest: { type: "object", required: ["email", "password", "role"], properties: { email, password, role: { type: "string", enum: ["customer"] } } },
      SignInRequest: { type: "object", required: ["email", "password"], properties: { email, password: { type: "string", format: "password", writeOnly: true, description: "Existing password. Maximum 72 UTF-8 bytes." } } },
      Success: { type: "object", required: ["success"], properties: { success: { type: "boolean", enum: [true] } } },
      RegistrationResult: { type: "object", required: ["success", "message"], properties: {
        success: { type: "boolean", enum: [true] }, message: { type: "string" },
        retryAfter: { type: "integer", example: 60, description: "Customer signup only: resend cooldown in seconds." },
        expiresIn: { type: "integer", example: 900, description: "Customer signup only: code lifetime in seconds." },
      } },
      CodeSent: { type: "object", required: ["success", "message", "retryAfter", "expiresIn"], properties: {
        success: { type: "boolean", enum: [true] }, message: { type: "string" }, retryAfter: { type: "integer", example: 60 }, expiresIn: { type: "integer", example: 900 },
      } },
      VerificationResult: { type: "object", required: ["success", "verificationToken", "expiresIn", "message"], properties: {
        success: { type: "boolean", enum: [true] }, verificationToken: { type: "string", pattern: "^[a-f0-9]{64}$", description: "Opaque proof, not an access JWT." }, expiresIn: { type: "integer", example: 3600 }, message: { type: "string", example: "Email verified." },
      } },
      SessionUser: { type: "object", required: ["id", "email", "role"], properties: {
        id: { type: "string", example: "507f1f77bcf86cd799439011" }, email,
        role: { type: "string", enum: ["vendor", "customer", "admin"], example: "vendor" },
      } },
      SignInUser: { allOf: [ref("SessionUser"), { type: "object", required: ["onBoardingStatus", "verificationStatus"], properties: {
        onBoardingStatus: { type: "string", enum: ["in_progress", "completed"], example: "completed" },
        verificationStatus: { type: "string", enum: ["pending", "verified", "rejected"], example: "pending" },
      } }] },
      SignInResult: { type: "object", required: ["success", "accessToken", "user"], properties: { success: { type: "boolean", enum: [true] }, accessToken: { type: "string", description: "JWT access token." }, user: ref("SignInUser") } },
      RefreshResult: { type: "object", required: ["accessToken", "user"], properties: { accessToken: { type: "string", description: "JWT access token." }, user: ref("SessionUser") } },
      DocumentDownloadResult: { type: "object", required: ["success", "url", "expiresIn"], properties: {
        success: { type: "boolean", enum: [true] }, url: { type: "string", format: "uri", description: "Signed private download URL. Do not store as a permanent document link." }, expiresIn: { type: "integer", example: 60 },
      } },
      Error: { type: "object", required: ["success", "message"], properties: { success: { type: "boolean", enum: [false] }, message: { type: "string" } } },
      MessageError: { type: "object", required: ["message"], properties: { message: { type: "string" } } },
      UnverifiedEmailError: { allOf: [ref("Error"), { type: "object", required: ["code"], properties: { code: { type: "string", enum: ["EMAIL_NOT_VERIFIED"] } } }] },
    },
    responses: Object.fromEntries(Object.entries({
      400: ["Invalid input, malformed body, or invalid/expired verification code.", "Enter a valid email address."],
      401: ["Missing/invalid access token or incorrect credentials.", "Invalid email or password."],
      403: ["Permission denied or seller email verification proof is unavailable/expired.", "Email verification has expired. Verify your email again."],
      404: ["Business/document not found or not accessible to this owner.", "Document not found."],
      409: ["Account already exists or verification proof has already been consumed.", "An account with this email already exists."],
      413: ["Request exceeds the permitted body size.", "Request is too large."],
      415: ["Unsupported Content-Type or non-customer JSON signup.", "Expected JSON."],
      429: ["Email resend cooldown or hourly send limit exceeded. No Retry-After header is currently returned.", "Please wait before requesting another code. Up to 5 codes are allowed per hour."],
      500: ["Unexpected server error.", "Unable to complete the request. Please try again."],
      502: ["Document storage upload failed.", "The document could not be uploaded. Please try again."],
      503: ["Email/document/identity service is unavailable or not configured.", "The verification email could not be sent. Please try again in a minute."],
    }).map(([status, [description, message]]) => [`Error${status}`, response(description, ref("Error"), { success: false, message })])),
  },
};

export default openapi;
