export const nigeriaStates = [
  "Abia"
];

// Shared by the business step, final payload builder, and server validation.
export function validateBusinessLocation(business = {}) {
  const errors = {};
  if (!nigeriaStates.includes(business.state)) errors.state = "Please select a state.";
  for (const [field, label, max] of [["lga", "LGA", 100], ["city", "City/town", 100], ["address", "Business/workshop address", 6000]]) {
    if (typeof business[field] !== "string" || !business[field].trim() || business[field].length > max) {
      errors[field] = `${label} is required and must not exceed ${max} characters.`;
    }
  }
  if (typeof business.address === "string" && business.address.trim().split(/\s+/).length > 300) {
    errors.address = "Business/workshop address must not exceed 300 words.";
  }
  if (business.landmark != null && (typeof business.landmark !== "string" || business.landmark.length > 255)) {
    errors.landmark = "Nearest landmark must not exceed 255 characters.";
  }
  return errors;
}
