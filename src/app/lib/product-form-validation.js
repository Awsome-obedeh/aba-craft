export function productFormErrors(form, { draft = false, availability = "in_stock", imageCount = 0 } = {}) {
  const errors = {};
  const fields = {
    productName: ["Product name", 200], description: ["Description", 5000],
    shortDescription: ["Short description", 150], brand: ["Brand", 200],
    productType: ["Product type", 100], sku: ["SKU / item code", 100],
    hsn: ["HSN", 30], dimensions: ["Dimensions", 100], notes: ["Notes", 1000],
  };
  for (const [key, [label, max]] of Object.entries(fields)) {
    if ((form[key] || "").length > max) errors[key] = `${label} must not exceed ${max} characters.`;
  }
  if (!form.productName?.trim()) errors.productName = "Enter a product name.";
  else if (form.productName.trim().length < 3) errors.productName = "Product name must contain at least 3 characters.";
  if (!draft && !form.category) errors.category = "Select a category.";
  else if (form.category && !/^[a-f\d]{24}$/i.test(form.category)) errors.category = "Select a valid category.";
  if (!draft && !form.description?.trim()) errors.description = "Enter a detailed description.";
  for (const [key, label] of [["price", "Price"], ["quantity", "Quantity"], ["compareAtPrice", "Compare-at price"], ["weight", "Weight"], ["stockAlert", "Stock alert"]]) {
    if (key === "quantity" && availability === "out_of_stock") continue;
    const value = Number(form[key] || 0);
    if (!Number.isFinite(value) || value < 0) errors[key] = `${label} must be a non-negative number.`;
    else if (["quantity", "stockAlert"].includes(key) && !Number.isInteger(value)) errors[key] = `${label} must be a whole number.`;
  }
  if (!draft && !errors.price && Number(form.price || 0) <= 0) errors.price = "Enter a price greater than zero.";
  if (!draft && availability === "in_stock" && !errors.quantity && Number(form.quantity || 0) < 1) errors.quantity = "Enter at least 1 unit for an in-stock product.";
  if (!errors.compareAtPrice && Number(form.compareAtPrice) > 0 && Number(form.compareAtPrice) <= Number(form.price)) errors.compareAtPrice = "Compare-at price must be greater than the selling price.";
  if (!draft && imageCount === 0) errors.productImages = "Upload at least one product image.";
  else if (imageCount > 7) errors.productImages = "You can add up to 7 images.";
  return errors;
}
