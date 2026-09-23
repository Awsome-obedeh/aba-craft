import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
const { scanDocument } = await import("../src/app/lib/server/document-scan.js");
// Deliberately fictitious text; no customer documents are used in this smoke test.
const text = "BT /F1 16 Tf 50 750 Td (CORPORATE AFFAIRS COMMISSION) Tj 0 -30 Td (CERTIFICATE OF REGISTRATION OF BUSINESS NAME) Tj 0 -30 Td (SYNTHETIC TEST CRAFTS) Tj 0 -30 Td (BN 1234567) Tj 0 -30 Td (Registered 14 September 2026) Tj 0 -30 Td (Business Name) Tj ET";
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
];
let pdf = "%PDF-1.4\n";
const offsets = [0];
objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
try {
  const result = await scanDocument(new File([pdf], "synthetic-cac.pdf", { type: "application/pdf" }), "cac");
  if (!result.registeredName.includes("SYNTHETIC") || !result.registrationNumber.includes("1234567")) throw new Error("Synthetic document fields did not match.");
  console.log("OpenRouter live PDF scan passed: synthetic registered name and BN extracted.");
} catch (error) {
  console.error(error.status ? error.message : "Live document scan failed.");
  process.exitCode = 1;
}
