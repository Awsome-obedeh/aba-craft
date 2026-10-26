import connectDB from "@/app/lib/connect";
import Product from "@/models/Products";
import Category from "@/models/Category";
import Business from "@/models/Business";
import User from "@/models/User";
import Review from "@/models/BuyerReview";
import Order from "@/models/Order";
import { marketplaceFilter, marketplaceProduct } from "@/app/lib/marketplace";

export const runtime = "nodejs";
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await connectDB();
    const records = await Product.find(marketplaceFilter())
      .select("productName slug description shortDescription price discountPrice discountPercentage compareAtPrice quantity productImages category brand featured businessId createdBy")
      .populate({ path: "category", select: "categoryName", model: Category })
      .populate({ path: "businessId", select: "businessName sellerRole", model: Business })
      .populate({ path: "createdBy", select: "role", match: { role: "vendor" }, model: User })
      .sort({ createdAt: -1, _id: -1 }).lean();
    const products = records.filter((product) => product.createdBy?.role === "vendor");
    const ids = products.map((product) => product._id);
    const [reviewRows, salesRows] = ids.length ? await Promise.all([
      Review.aggregate([{ $match: { productId: { $in: ids } } }, { $group: { _id: "$productId", rating: { $avg: "$rating" }, count: { $sum: 1 } } }]),
      Order.aggregate([{ $match: { paymentStatus: "paid", status: { $ne: "cancelled" }, "items.product": { $in: ids } } },
        { $unwind: "$items" }, { $match: { "items.product": { $in: ids } } },
        { $group: { _id: "$items.product", sold: { $sum: "$items.quantity" } } }]),
    ]) : [[], []];
    const reviews = Object.fromEntries(reviewRows.map((row) => [String(row._id), row]));
    const sales = Object.fromEntries(salesRows.map((row) => [String(row._id), row.sold]));
    const data = products.map((product) => marketplaceProduct(product, reviews, sales));
    return Response.json({ success: true, data, totalItems: data.length }, { headers });
  } catch (error) {
    console.error("Marketplace fetch failed:", error.name);
    return Response.json({ success: false, message: "Unable to load the marketplace. Please try again." }, { status: 500, headers });
  }
}
