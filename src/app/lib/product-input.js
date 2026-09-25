export function validateProductInput(input) {
  const draft = input.saveAsDraft === true;
  const text = (key, max, required = false) => {
    const value = input[key] ?? "";
    if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new Error(`${key} is missing or invalid.`);
    return value.trim();
  };
  const number = (key, fallback = 0) => {
    const raw = input[key] ?? fallback;
    if (!["string", "number"].includes(typeof raw)) throw new Error(`${key} must be a non-negative number.`);
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) throw new Error(`${key} must be a non-negative number.`);
    return value;
  };
  const productName = text("productName", 200, true);
  if (productName.length < 3) throw new Error("Product name must contain at least 3 characters.");
  const category = text("category", 24, !draft);
  if (category && !/^[a-f\d]{24}$/i.test(category)) throw new Error("Select a valid category.");
  const price = number("price");
  const quantity = number("quantity");
  const stockAlert = number("stockAlert");
  if (!Number.isInteger(quantity) || !Number.isInteger(stockAlert)) throw new Error("Quantity and stock alert must be whole numbers.");
  if (!draft && price <= 0) throw new Error("Enter a price greater than zero.");
  const productImages = input.productImages ?? [];
  if (!Array.isArray(productImages) || productImages.length > 7 || productImages.some(url => typeof url !== "string" || !/^https:\/\//i.test(url))) throw new Error("Upload up to 7 valid images.");
  if (!draft && !productImages.length) throw new Error("Upload at least one product image.");
  const compareAtPrice = number("compareAtPrice");
  if (compareAtPrice && compareAtPrice <= price) throw new Error("Compare-at price must be greater than the selling price.");
  const discountPrice = number("discountPrice");
  const discountPercentage = number("discountPercentage");
  if ((discountPrice && discountPrice >= price) || discountPercentage > 100) throw new Error("Enter a valid discount.");
  return {
    productName, category: category || undefined, description: text("description", 5000, !draft),
    brand: text("brand", 200), shortDescription: text("shortDescription", 150),
    productType: text("productType", 100), sku: text("sku", 100), hsn: text("hsn", 30),
    dimensions: text("dimensions", 100), notes: text("notes", 1000), weight: number("weight"),
    price, quantity, stockAlert, compareAtPrice, productImages, discountPrice, discountPercentage,
    featured: input.isFeatured === true, redirectToWhatsapp: input.redirectWhatsapp === true,
    status: draft ? "draft" : "under_review", isPublished: false,
  };
}
