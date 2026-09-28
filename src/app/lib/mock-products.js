// Temporary catalog for AI Automation integration. Prices are in Nigerian naira.
const catalog = [
  ["Leather Oxford Shoes", "Handcrafted brown leather lace-up shoes.", "Footwear", "Aba Leather", 35000, 20],
  ["Leather Palm Slippers", "Comfortable leather slippers for everyday wear.", "Footwear", "Aba Leather", 12000, 35],
  ["Canvas Sneakers", "Lightweight canvas sneakers with rubber soles.", "Footwear", "Enyimba Style", 18000, 15],
  ["Leather Tote Bag", "Spacious leather tote with an inner pocket.", "Bags", "Ariaria Craft", 28000, 12],
  ["School Backpack", "Durable backpack with padded straps and two compartments.", "Bags", "Ariaria Craft", 15000, 40],
  ["Leather Wallet", "Compact bifold wallet with six card slots.", "Accessories", "Aba Leather", 6500, 50],
  ["Leather Belt", "Adjustable black leather belt with a metal buckle.", "Accessories", "Aba Leather", 8000, 25],
  ["Ankara Shirt", "Short-sleeved cotton shirt with an Ankara print.", "Clothing", "Enyimba Style", 16000, 18],
  ["Cotton Polo Shirt", "Breathable cotton polo shirt for casual wear.", "Clothing", "Enyimba Style", 9500, 30],
  ["Travel Duffel Bag", "Roomy travel bag with handles and a detachable shoulder strap.", "Bags", "Ariaria Craft", 32000, 0],
];

export const mockProducts = catalog.map(
  ([productName, description, category, brand, price, quantity], index) => ({
    id: `product-${String(index + 1).padStart(3, "0")}`,
    productName,
    slug: productName.toLowerCase().replaceAll(" ", "-"),
    description,
    category,
    brand,
    price,
    currency: "NGN",
    quantity,
    inStock: quantity > 0,
    productImages: [],
  }),
);
