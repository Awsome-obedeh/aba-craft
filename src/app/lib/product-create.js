export const slugifyProductName = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/\s+/g, "-");

export async function findDuplicateProduct(productName, Product) {
  const name = String(productName || "").trim();
  if (!name || !Product) return null;
  const baseSlug = slugifyProductName(name) || "product";

  try {
    if (Product.findOne) {
      const duplicateByName = await Product.findOne({
        $expr: { $eq: [{ $toLower: "$productName" }, name.toLowerCase()] },
        isActive: true,
      });
      if (duplicateByName) return duplicateByName;
    }
  } catch (e) {
    // ignore
  }

  try {
    if (Product.findOne) {
      const duplicateBySlug = await Product.findOne({ slug: baseSlug, isActive: true });
      if (duplicateBySlug) return duplicateBySlug;
    }
  } catch (e) {
    // ignore
  }

  try {
    if (typeof Product.find === "function") {
      const candidates = await Product.find({ isActive: true }).select ? await Product.find({ isActive: true }).select("productName slug").lean() : await Product.find({ isActive: true });
      if (Array.isArray(candidates)) {
        for (const candidate of candidates) {
          if (slugifyProductName(candidate.productName) === baseSlug) {
            return candidate;
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export async function buildUniqueProductSlug(productName, Product) {
  const base = slugifyProductName(productName) || "product";
  if (!Product) return base;
  let slug = base;
  try {
    if (typeof Product.exists === "function") {
      if (!(await Product.exists({ slug }))) {
        return slug;
      }
      let suffix = 2;
      while (await Product.exists({ slug: `${base}-${suffix}` })) {
        suffix += 1;
      }
      return `${base}-${suffix}`;
    }
  } catch (e) {
    // fall through
  }
  return slug;
}

export async function createProduct({ fields, createdBy, businessId }, Product) {
  try {
    const product = await Product.create({
      ...fields,
      createdBy,
      businessId,
      slug: await buildUniqueProductSlug(fields.productName, Product),
    });
    return product;
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateError = new Error("Product with this name already exists");
      duplicateError.code = 11000;
      throw duplicateError;
    }
    throw error;
  }
}
