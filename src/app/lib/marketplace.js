export const marketplaceFilter = () => ({
  isActive: true, isPublished: true, status: "approved",
  slug: { $type: "string", $regex: /\S/ },
});

export function marketplacePrice(product) {
  const price = Math.max(0, Number(product.price) || 0);
  const discount = Math.max(0, Number(product.discountPrice) || 0);
  const percentage = Math.min(100, Math.max(0, Number(product.discountPercentage) || 0));
  const current = discount > 0 && discount < price ? price - discount : price * (1 - percentage / 100);
  const original = Math.max(price, Number(product.compareAtPrice) || 0);
  return { current, original, discount: original > current ? Math.round((original - current) / original * 100) : 0 };
}

export function marketplaceProduct(product, reviews = {}, sales = {}) {
  const id = String(product._id);
  return {
    _id: id, slug: product.slug, productName: product.productName,
    description: product.shortDescription || product.description || "",
    price: product.price, discountPrice: product.discountPrice || 0,
    discountPercentage: product.discountPercentage || 0, compareAtPrice: product.compareAtPrice || 0,
    quantity: product.quantity || 0, productImages: product.productImages || [],
    category: product.category?.categoryName || "Other", brand: product.brand || "",
    featured: !!product.featured, wholesale: product.businessId?.sellerRole === "wholesaler_producer",
    manufacturer: product.businessId?.businessName || product.brand || "Aba artisan",
    rating: reviews[id]?.rating || 0, reviewCount: reviews[id]?.count || 0,
    sold: sales[id] || 0,
  };
}
