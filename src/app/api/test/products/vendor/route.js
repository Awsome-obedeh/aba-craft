
import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Product from "@/models/Products";

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
        const products = await Product.find({ 
            createdBy: auth.user.id,
            isActive: true
         })
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