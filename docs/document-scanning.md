# Signup document scanning

Selecting a CAC certificate or NIN slip calls `POST /api/auth/documents/scan` automatically. The server reads `OPENROUTER_API_KEY ` (or `OPENROUTER_API_KEY`) from the environment and uses `OPENROUTER_DOCUMENT_MODEL`, defaulting to `google/gemini-2.5-flash`. No key is sent to the browser. Restart the development server after changing environment configuration.

Supported files: signature-validated JPEG, PNG, WEBP and PDF, up to 10 MB. Images use base64 image inputs; PDFs use base64 file inputs with native PDF processing. The selected model must support images, native PDFs and structured JSON outputs. Provider routing excludes providers that collect data.

The endpoint requires the signup email and its unexpired email verification token. Scan requests are capped at 12 per verification proof. Requests and responses are not cached. Extracted details and provider responses are never logged by the scanning service.

CAC fields: registered name, RC/BN/registration number, registration date as printed, legal business type as printed. NIN fields: 11-digit NIN and individual name. Unreadable fields stay empty. All values can be corrected before submission; the registered name can be applied to the business profile explicitly. Legal business type is separate from the marketplace business category.

Reviewed details are saved under the business's `documentDetails`, excluded from normal queries. NIN continues through the existing encrypted identity storage. Extraction does not change pending identity verification statuses.

Verification:
- `node --test scripts/document-scan.test.mjs scripts/signup.test.mjs`
- `node scripts/document-scan-smoke.mjs` makes one paid API request using a fictitious CAC PDF, never a customer document.

API references:
- https://openrouter.ai/docs/guides/overview/multimodal/image-understanding
- https://openrouter.ai/docs/guides/overview/multimodal/pdfs
- https://openrouter.ai/docs/guides/features/structured-outputs
