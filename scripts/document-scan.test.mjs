import test from "node:test";
import assert from "node:assert/strict";
import { scanDocument, normalizeScan } from "../src/app/lib/server/document-scan.js";
const image = () => new File([Buffer.from([137,80,78,71,13,10,26,10])], "sample.png", { type: "image/png" });
const options = (value, inspect = () => {}) => ({ apiKey: "test-key", fetcher: async (url, request) => {
  inspect(url, request, JSON.parse(request.body));
  return Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] });
} });
test("CAC image uses server authentication and extracts only requested fields", async () => {
  const result = await scanDocument(image(), "cac", options({ registeredName: " Sample Ltd ", registrationNumber: "rc 123456", registrationDate: null, businessType: "Limited company" }, (url, request, body) => {
    assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(request.headers.Authorization, "Bearer test-key");
    assert.match(body.messages[1].content[1].image_url.url, /^data:image\/png;base64,/);
    assert.equal(body.response_format.json_schema.strict, true);
  }));
  assert.deepEqual(result, { registeredName: "Sample Ltd", registrationNumber: "RC 123456", registrationDate: "", businessType: "Limited company" });
});
test("PDF is sent as a private base64 file", async () => {
  const pdf = new File(["%PDF-1.4\nsynthetic test"], "sample.pdf", { type: "application/pdf" });
  await scanDocument(pdf, "nin", options({ nin: "012 3456 7890", individualName: "Sample Person" }, (url, request, body) => {
    assert.match(body.messages[1].content[1].file.file_data, /^data:application\/pdf;base64,/);
    assert.equal(body.plugins[0].pdf.engine, "native");
  }));
});
test("NIN preserves leading zeros and rejects incorrect lengths", () => {
  assert.equal(normalizeScan({ nin: "01234567890", individualName: "Sample" }, "nin").nin, "01234567890");
  assert.equal(normalizeScan({ nin: "123456789", individualName: "Sample" }, "nin").nin, "");
});
test("rejects unreadable, malformed, and unrelated outputs", () => {
  for (const value of [null, [], { nin: 123, individualName: null }, { nin: null, individualName: null }]) {
    assert.throws(() => normalizeScan(value, "nin"));
  }
});
test("rejects unsupported purposes and spoofed uploads before API requests", async () => {
  await assert.rejects(scanDocument(image(), "other", options({})), /CAC or NIN/);
  await assert.rejects(scanDocument(new File(["bad"], "bad.png", { type: "image/png" }), "cac", options({})), /valid JPG/);
});
test("handles missing configuration, provider failures and invalid JSON without exposing secrets", async () => {
  await assert.rejects(scanDocument(image(), "cac", { apiKey: "" }), /not configured/);
  await assert.rejects(scanDocument(image(), "cac", { apiKey: "secret", fetcher: async () => new Response("secret", { status: 402 }) }), /insufficient API credits/);
  await assert.rejects(scanDocument(image(), "nin", { apiKey: "secret", fetcher: async () => Response.json({ choices: [{ message: { content: "bad JSON" } }] }) }), /unreadable/);
});
