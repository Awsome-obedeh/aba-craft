import connectDB from "@/app/lib/connect";
import Product from "@/models/Products";
import Category from "@/models/Category";

export async function GET(request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    await connectDB();
    const products = await Product.find({
      isActive: true,
      isPublished: true,
      status: "approved",
      slug: { $type: "string", $regex: /\S/ },
    })
      .select("productName slug description category brand price quantity productImages")
      .populate({ path: "category", select: "categoryName", model: Category })
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    // Keep the AI integration contract stable and expose only catalog fields.
    const data = products.map(product => ({
      id: String(product._id),
      productName: product.productName,
      slug: product.slug,
      description: product.description || "",
      category: product.category?.categoryName || "Unassigned",
      brand: product.brand || "",
      price: product.price,
      currency: "NGN",
      quantity: product.quantity,
      inStock: product.quantity > 0,
      productImages: product.productImages || [],
      productLink: new URL(`/dashboard/products/${encodeURIComponent(product.slug)}`, request.url).href,
    }));

    return Response.json({ success: true, data, totalItems: data.length }, { headers });
  } catch (error) {
    console.error("AI product catalog fetch failed:", error);
    return Response.json(
      { success: false, message: "Unable to load product catalog. Please try again." },
      { status: 500, headers },
    );
  }
}
