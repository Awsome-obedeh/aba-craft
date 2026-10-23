import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Business from "@/models/Business";
import Product from "@/models/Products";
import { validateProductInput } from "@/app/lib/product-input";
import { findDuplicateProduct, createProduct } from "@/app/lib/product-create";

import { NextResponse } from "next/server";
export const POST = async (req) => {

    const auth = await verifyAuth(req, ["vendor", "admin"]);

    if (!auth.isValid) {
        return NextResponse.json({
            success: false,
            message: auth.message
        },

            { status: auth.status });
    }


    let fields;
    try {
        fields = validateProductInput(await req.json());
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    try {
        const vendorId=auth.user.id;


        console.log("VNEDORID", vendorId);
        await connectDB();

        const duplicate = await findDuplicateProduct(fields.productName, Product);
        if (duplicate) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Product with this name already exists",
                },
                {
                    status: 409,
                }
            );
        }

        const business=await Business.findOne({
            ownerId:vendorId,
            isActive:true,
            bannedStatus:"none"
        });

        if(!business){
            return NextResponse.json({
                status:false,
                message:"No business profile found. Please complete verification setup first.",


            },{status:403})
        }


        const product = await createProduct({
            fields,
            createdBy: vendorId,
            businessId: business._id || '',
        }, Product);

        return NextResponse.json(
            {
                success: true,
                message:
                    fields.status === "draft" ? "Product saved as draft" : "Product submitted for admin review",
                product,
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        console.log("PRODUCT CREATE ERROR:", error);

        if (error?.code === 11000) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Product with this name already exists",
                },
                {
                    status: 409,
                }
            );
        }

        return NextResponse.json(
            {
                success: false,
                message: "Server Error",
                error: error.message,
            },
            {
                status: 500,
            }
        );
    }
}



export const GET = async (req) => {

    const auth = await verifyAuth(req, ["vendor", "admin", "customer"]);

    if (!auth.isValid) {
        return NextResponse.json({
            success: false,
            message: auth.message
        },

            { status: auth.status });
    }
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);

        const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
        const limit = Math.max(1, parseInt(searchParams.get("limit")) || 9);
        const skip = (page - 1) * limit;

        const search = searchParams.get("search");
        const category = searchParams.get("category");
        const brand = searchParams.get("brand");
        const minPrice = searchParams.get("minPrice");
        const maxPrice = searchParams.get("maxPrice");
        const hasDiscount = searchParams.get("hasDiscount");
        const hasPercentageDiscount = searchParams.get("hasPercentageDiscount");
        const scope = searchParams.get("scope");

        let query = {};
        query.isActive = true;

        if (search) query.productName  = { $regex: search, $options: "i" };
        if (category) query.category = category;
        if (brand) query.brand = { $regex: `^${brand}$`, $options: "i" };

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        if (hasDiscount === "true") {
            query.discountPrice = { $gt: 0, $ne: null };
        }

        if (hasPercentageDiscount === "true") {
            query.discountPercentage = { $gt: 0, $ne: null };
        }

        if (auth.user.role === "customer") {
            query.isPublished = true;
            query.status = "approved";
        } else if (auth.user.role === "admin") {
        } else if (auth.user.role === "vendor") {
            if (scope === "mine") {
                query.createdBy = auth.user.id;
            } else {
                query.isPublished = true;
                query.status = "approved";
            }
        }

        const [products, totalItems] = await Promise.all([
            Product.find(query)
                .select("productName price discountPrice discountPercentage brand category productImages slug quantity ")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Product.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return NextResponse.json({
            success: true,
           data:products,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                limit
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Product fetch error:", error);
        return NextResponse.json({ success: false, message: "Server error fetching products" }, { status: 500 });
    }
}
