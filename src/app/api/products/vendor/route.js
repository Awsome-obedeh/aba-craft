
import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Product from "@/models/Products";
import Category from "@/models/Category";

import { NextResponse } from "next/server";

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

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
        const limitParam = parseInt(searchParams.get("limit")) || 20;
        const limit = Math.max(1, Math.min(100, limitParam));
        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            Product.find({
                createdBy: auth.user.id,
                isActive: true
            })
                .populate({ path: "category", select: "categoryName slug", model: Category }).sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments({
                createdBy: auth.user.id,
                isActive: true
            })
        ]);
        return NextResponse.json({
            success: true,
            products,
            total
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
