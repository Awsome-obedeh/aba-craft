import { marketplaceFilter, marketplaceProduct } from "../marketplace.js";
import { SignupError } from "./signup-validation.js";

export function validateComment(body) {
  if (typeof body?.text !== "string" || !body.text.trim() || body.text.trim().length > 2000) throw new SignupError("Enter a comment between 1 and 2,000 characters.");
  if (typeof body?.clientId !== "string" || !/^[a-zA-Z0-9-]{8,80}$/.test(body.clientId)) throw new SignupError("Invalid comment request. Please try again.");
  return { text: body.text.trim(), clientId: body.clientId };
}
export function publicComment(comment) {
  return { id: String(comment._id), authorName: comment.authorName, text: comment.text,
    verifiedPurchase: !!comment.verifiedPurchase, createdAt: comment.createdAt };
}

export function createMarketplaceDetailService({ connect, Product, User, Business, Category, Review, Comment, Order }) {
  async function productBySlug(slug) {
    if (typeof slug !== "string" || !slug.trim() || slug.length > 250) throw new SignupError("Product not found.", 404);
    await connect();
    const product = await Product.findOne({ ...marketplaceFilter(), slug })
      .select("productName slug description shortDescription price discountPrice discountPercentage compareAtPrice quantity productImages category brand featured businessId createdBy productType weight dimensions createdAt")
      .populate({ path: "category", select: "categoryName", model: Category })
      .populate({ path: "businessId", select: "businessName sellerRole verificationStatus state city", model: Business })
      .populate({ path: "createdBy", select: "role", match: { role: "vendor" }, model: User }).lean();
    if (!product || product.createdBy?.role !== "vendor") throw new SignupError("Product not found.", 404);
    return product;
  }
  async function detail(slug) {
    const product = await productBySlug(slug);
    const relatedFilter = { ...marketplaceFilter(), _id: { $ne: product._id },
      ...(product.category?._id ? { category: product.category._id } : { productType: product.productType || "" }),
    };
    const [related, reviews, summary] = await Promise.all([
      Product.find(relatedFilter).select("productName slug description shortDescription price discountPrice discountPercentage compareAtPrice quantity productImages brand category businessId createdBy")
        .populate({ path: "category", select: "categoryName", model: Category })
        .populate({ path: "businessId", select: "businessName sellerRole", model: Business })
        .populate({ path: "createdBy", select: "role", match: { role: "vendor" }, model: User })
        .sort({ featured: -1, createdAt: -1 }).limit(12).lean(),
      Review.find({ productId: product._id }).select("rating text createdAt").sort({ createdAt: -1, _id: -1 }).limit(10).lean(),
      Review.aggregate([{ $match: { productId: product._id } }, { $group: { _id: "$productId", rating: { $avg: "$rating" }, count: { $sum: 1 } } }]),
    ]);
    const stats = summary[0] || { rating: 0, count: 0 };
    return { success: true, product: { ...marketplaceProduct(product, { [String(product._id)]: stats }),
      description: product.description || "", productType: product.productType || "", dimensions: product.dimensions || "", weight: product.weight || 0,
      seller: { name: product.businessId?.businessName || product.brand || "Aba artisan", verified: product.businessId?.verificationStatus === "verified", location: [product.businessId?.city, product.businessId?.state].filter(Boolean).join(", ") },
    }, reviews: reviews.map((review) => ({ id: String(review._id), rating: review.rating, text: review.text, createdAt: review.createdAt, verifiedPurchase: true })),
      similar: related.filter((item) => item.createdBy?.role === "vendor").map((item) => marketplaceProduct(item)) };
  }
  async function comments(slug, pageInput = "1") {
    const page = Number(pageInput);
    if (!Number.isInteger(page) || page < 1 || page > 10000) throw new SignupError("Invalid page.");
    const product = await productBySlug(slug);
    const records = await Comment.find({ productId: product._id }).select("authorName text verifiedPurchase createdAt")
      .sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 10).limit(11).lean();
    return { success: true, comments: records.slice(0, 10).map(publicComment), hasMore: records.length > 10, page };
  }
  async function addComment(slug, user, body) {
    if (user?.role !== "customer") throw new SignupError("Sign in with a buyer account to comment.", 403);
    const { text, clientId } = validateComment(body);
    const product = await productBySlug(slug);
    const existing = await Comment.findOne({ authorId: user.id, clientId });
    if (existing) {
      if (String(existing.productId) !== String(product._id)) throw new SignupError("This comment request was already used for another product.", 409);
      return { success: true, comment: publicComment(existing) };
    }
    const [author, purchase] = await Promise.all([
      User.findById(user.id).select("fullName"),
      Order.exists({ customer: user.id, paymentStatus: "paid", status: { $ne: "cancelled" }, "items.product": product._id }),
    ]);
    if (!author) throw new SignupError("Please sign in again.", 401);
    try {
      const comment = await Comment.create({ productId: product._id, authorId: user.id,
        authorName: author.fullName?.trim().slice(0, 120) || "AbaCraft buyer", text, clientId, verifiedPurchase: !!purchase });
      return { success: true, comment: publicComment(comment) };
    } catch (error) {
      if (error.code !== 11000) throw error;
      const retry = await Comment.findOne({ authorId: user.id, clientId, productId: product._id });
      if (!retry) throw new SignupError("This comment request was already used.", 409);
      return { success: true, comment: publicComment(retry) };
    }
  }
  return { detail, comments, addComment };
}
