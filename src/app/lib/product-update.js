import { validateProductInput } from "./product-input.js";

export function validateProductUpdate(existing, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid product update.");
  const { availability } = input;
  if (availability !== undefined && !["in_stock", "out_of_stock", "draft"].includes(availability)) throw new Error("Select a valid product status.");
  const draft = availability === "draft" || (availability === undefined && existing.status === "draft");
  const merged = { ...existing, ...input, category: String(input.category ?? existing.category ?? ""), saveAsDraft: draft };
  if (availability === "out_of_stock") merged.quantity = 0;
  const fields = validateProductInput(merged);
  if (availability === "in_stock" && fields.quantity < 1) throw new Error("Enter at least 1 unit for an active product.");
  delete fields.featured;
  delete fields.redirectToWhatsapp;
  delete fields.status;
  delete fields.isPublished;
  if (availability === "draft") {
    fields.status = "draft";
    fields.isPublished = false;
  } else if (availability !== undefined && existing.status === "draft") {
    fields.status = "under_review";
    fields.isPublished = false;
    fields.rejectionReason = "";
  }
  fields.inStock = fields.quantity > 0;
  return fields;
}
