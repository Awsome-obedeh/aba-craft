// src/app/api/products/[slug]/route.js
import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Product from "@/models/Products";
import Category from "@/models/Category";
import { NextResponse } from "next/server";


export async function GET(req, { params }) {

    const auth = await verifyAuth(req, ["vendor", "admin", "customer"]);

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
        let product;

        // Await the dynamic routing params wrapper cleanly
        const { slug } = await params;

        // Visibility filter for non-admins: a customer (or a vendor browsing
        // the storefront) should only see products that are published AND
        // approved. Admins can pull anything.
        const visibility =
            auth.user.role === "admin"
                ? {}
                : { isPublished: true, status: "approved" };

        // admin can see all products, vendors can only see their own products, so we need to check the role andfilter accordingly
        if (auth.user.role === "admin") {
            product = await Product.findOne({ slug, isActive: true, ...visibility })
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

        }

        else if (auth.user.role === "vendor") {



            product = await Product.findOne({ slug, isActive: true, createdBy: auth.user.id })
                .populate({
                    path: "category",
                    select: "categoryName slug "
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
        }


        product = await Product.findOne({ slug, isActive: true, ...visibility })
            .populate({
                path: "category",
                select: "categoryName slug"
            })
            .lean();
        console.log("product", product)
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

export const PUT = async (req, { params }) => {
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

        const { slug } = await params;
        const body = await req.json();

        console.log("Received update request for product slug:", slug, "with body:", body);



        // find category ID based on category name provided in the update request
        if (body.category) {
            const categoryDoc = await Category.findOne({ categoryName: body.category });
            if (categoryDoc) {
                body.category = categoryDoc._id; // Replace category name with its ID for the product update
            }
        }

        const product = await Product.findOneAndUpdate(
            { slug },
            body,
            { returnDocument: "after" })
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


        console.log("Updated product details:", product);

        return NextResponse.json(
            {
                success: true,
                message: "Product updated successfully.",
                data: product
            },
            { status: 200 });
    }
    catch (error) {
        console.error("Product update failure:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Internal server error occurred."
            },
            { status: 500 }
        );
    }


}

export const DELETE = async (req, { params }) => {
    const auth = await verifyAuth(req, ["vendor", "admin"]);
    // If authentication or authorization fails, 
    if (!auth.isValid) {
        return NextResponse.json({
            success: false,
            message: auth.message
        },
            { status: auth.status });
    }
    try {
        await connectDB();
        const { slug } = await params;

        const deletedProduct = await Product.findOneAndUpdate(
            { slug: slug },
            { isActive: false },
            { returnDocument: "after" }

        )

        if (!deletedProduct) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Product not found or already deleted."
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "Product deleted successfully.",
                data: deletedProduct
            },
            { status: 200 }
        );
    }

    catch (error) {
        console.error("Product deletion error:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Internal server error occurred."
            },
            { status: 500 }
        );
    }
}