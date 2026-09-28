export const businessTypeValues = [
  "leather_manufacturer", "leather_supplier", "leather_artisan",
  "leather_retailer", "leather_wholesaler", "other",
];

// Accept older clients that still submit a single type.
export function normalizeBusinessTypes(value) {
  return typeof value === "string" ? [value] : value;
}

export function validBusinessTypes(value) {
  const types = normalizeBusinessTypes(value);
  return Array.isArray(types) && types.length > 0 &&
    types.length <= businessTypeValues.length &&
    new Set(types).size === types.length &&
    types.every((type) => businessTypeValues.includes(type));
}
