
import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Product from "@/models/Products";

import { NextResponse } from "next/server";
export const POST = async (req) => {

    const auth = await verifyAuth(req, ["vendor", "admin"]);

    // If authentication or authorization fails, i
    if (!auth.isValid) {
        return NextResponse.json({
            success: false,
            message: auth.message
        },

            { status: auth.status });
    }


    console.log(auth)


    const { productName, description, price, quantity, category, brand, isFeatured, productImages, discountPrice, discountPercentage, redirectWhatsapp } = await req.json();

    // Basic validation
    if (!productName || !description || !price || !quantity || !category || !brand || !productImages) {
        return new Response(JSON.stringify({ error: "All fields are required" }), { status: 400 });
    }

    try {

        await connectDB();
        // Create slug
        const slug = productName
            .toLowerCase()
            .trim()
            .replace(/[^a-zA-Z0-9 ]/g, "")
            .replace(/\s+/g, "-");

        // Check if product already exists
        const existingProduct =
            await Product.findOne({
                slug,
            });

        if (existingProduct) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Product with this name already exists",
                },
                {
                    status: 409,
                }
            );
        }



        // Create Product
        const product = await Product.create({
            createdBy: auth.user.id, // Associate product with the authenticated vendor/admin
            productName,
            description,
            price,
            quantity,
            category,
            brand,
            slug,
            productImages,
            discountPrice: discountPrice || 0,
            discountPercentage: discountPercentage || 0,
            featured: isFeatured || false,
            redirectWhatsapp: redirectWhatsapp || false,

            // Default workflow values
            status: "under_review",
            isPublished: false,
        });

        return NextResponse.json(
            {
                success: true,
                message:
                    "Product submitted for admin review",
                product,
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        console.log("PRODUCT CREATE ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    "Server Error",
                error: error.message,
            },
            {
                status: 500,
            }
        );
    }
}


export const GET = async (req) => {

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
        const products = await Product.find({ createdBy: auth.user.id })
            .populate("category", "categoryName slug ,").sort({ createdAt: -1 })
            .lean();
        return NextResponse.json({
            success: true,
            products
        });
    }
    catch (error) {
        console.error("Product fetch error:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Internal Server Error"
            },
            { status: 500 }
        );
    }
}