import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import { validateProductInput } from "@/app/lib/product-input";
import Product from "@/models/Products";
import Category from "@/models/Category";
import Business from "@/models/Business";
import { findDuplicateProduct, createProduct } from "@/app/lib/product-create";

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

export async function POST(request) {
  const auth = await verifyAuth(request, ["vendor", "admin"]);
  if (!auth.isValid) {
    return Response.json({ success: false, message: auth.message }, { status: auth.status });
  }

  let body;
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid product payload.");
  } catch (error) {
    return Response.json(
      { success: false, message: error.message || "Invalid product payload." },
      { status: 400 },
    );
  }

  let fields;
  try {
    fields = validateProductInput(body);
  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 400 });
  }

  try {
    await connectDB();

    if (fields.category && !(await Category.exists({ _id: fields.category }))) {
      return Response.json({ success: false, message: "Select a valid category." }, { status: 400 });
    }

    const business = await Business.findOne({
      ownerId: auth.user.id,
      isActive: true,
      bannedStatus: "none",
    });
    if (!business && auth.user.role === "vendor") {
      return Response.json(
        { success: false, message: "No business profile found. Please complete verification setup first." },
        { status: 403 },
      );
    }

    const duplicate = await findDuplicateProduct(fields.productName, Product);
    if (duplicate) {
      return Response.json(
        { success: false, message: "Product with this name already exists" },
        { status: 409 },
      );
    }

    const product = await createProduct({ fields, createdBy: auth.user.id, businessId: business?._id }, Product);

    return Response.json(
      {
        success: true,
        message:
          fields.status === "draft" ? "Product saved as draft" : "Product submitted for admin review",
        data: product,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Product creation error:", error);
    if (error?.code === 11000) {
      return Response.json(
        { success: false, message: "Product with this name already exists" },
        { status: 409 },
      );
    }
    return Response.json(
      { success: false, message: "Unable to save product. Please try again." },
      { status: 500 },
    );
  }
}
