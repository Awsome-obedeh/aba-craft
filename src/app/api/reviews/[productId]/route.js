import Product from "@/models/Products";
import BuyerReview from "@/models/BuyerReview";
import { messagingRoute } from "@/app/lib/messaging/http";
import { MessagingError, objectId } from "@/app/lib/messaging/validation";

export async function GET(request, context) {
  const { productId } = await context.params;
  return messagingRoute(request, async () => {
    const id = objectId(productId);
    if (
      !(await Product.exists({
        _id: id,
        isActive: true,
        isPublished: true,
        status: "approved",
      }))
    )
      throw new MessagingError("Product not found.", 404);
    const page = Number(new URL(request.url).searchParams.get("page") || 1);
    if (!Number.isInteger(page) || page < 1 || page > 10000)
      throw new MessagingError("Invalid page.");
    const records = await BuyerReview.find({ productId: id })
      .select("rating text createdAt")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * 10)
      .limit(11)
      .lean();
    return { reviews: records.slice(0, 10), hasMore: records.length > 10 };
  });
}
