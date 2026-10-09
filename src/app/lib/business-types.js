export const businessTypeOptions = [
  { value: "leather_bags_luggage", label: "Leather Bags & Luggage" },
  { value: "shoes_footwear", label: "Shoes & Footwear" },
  { value: "wallets_card_holders", label: "Wallets & Card Holders" },
  { value: "leather_accessories", label: "Leather Accessories" },
  { value: "leather_clothing_fashion", label: "Leather Clothing & Fashion" },
  { value: "custom_leather_products", label: "Custom Leather Products" },
  { value: "leather_manufacturing", label: "Leather Manufacturing" },
];

export const businessTypeValues = businessTypeOptions.map(({ value }) => value);
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
