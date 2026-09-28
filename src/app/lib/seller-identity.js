export function validateSellerIdentity(identity = {}) {
  const errors = {};
  const cac = typeof identity.cacNumber === "string" ? identity.cacNumber.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9 /-]{1,29}$/.test(cac) || !/\d/.test(cac)) {
    errors.cacNumber = "Enter the CAC registration number shown on your certificate.";
  }
  if (typeof identity.abssin !== "string" || !/^\d{10}$/.test(identity.abssin)) errors.abssin = "Enter your 10-digit ABSSIN.";
  if (identity.nin && (typeof identity.nin !== "string" || !/^\d{11}$/.test(identity.nin))) errors.nin = "Enter a valid 11-digit NIN.";
  if (!identity.nin && !identity.ninDocument) errors.nin = "Enter your 11-digit NIN or upload your NIN slip.";
  if (identity.verificationConsent !== true) errors.verificationConsent = "Please consent to the verification checks.";
  return errors;
}
