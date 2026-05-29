// src/app/api/products/[slug]/route.js
import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Product from "@/models/Products";
import { NextResponse } from "next/server";


export async function GET(req, { params }) {

    const auth = await verifyAuth(req, ["vendor", "admin"]);

    // If authentication or authorization fails, i
    if (!auth.isValid) {
        return NextResponse.json({
            success: false,
            message: auth.message
        },

            { status: auth.status });
    }
    try {
        await connectDB();

        // Await the dynamic routing params wrapper cleanly
        const { slug } = await params;

        // Query product details and swap reference IDs for text category fields
        const product = await Product.findOne({ slug, isActive: true })
            .populate({
                path: "category",
                select: "categoryName slug"
            })
            .lean();

        if (!product) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Requested object resource could not be found."
                },
                { status: 404 }
            );
        }

        // Production Safety Check: Ensure the images field is always returning an array matrix structure
        const safeImagesArray = Array.isArray(product.productImages) && product.productImages.length > 0
            ? product.productImages
            : ["/placeholders/frame-default.svg"]; // Dynamic fallback item structural string array data

        const formattedProduct = {
            ...product,
            productImages: safeImagesArray,
            category: product.category?.categoryName || "Unassigned"
        };

        return NextResponse.json({ success: true, data: formattedProduct }, { status: 200 });

    } catch (error) {
        console.error("Individual specification indexing failure:", error);
        return NextResponse.json(
            { success: false, message: "Internal application mapping failure encounter." },
            { status: 500 }
        );
    }
}