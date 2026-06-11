import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Product from "@/models/Products";
import { NextResponse } from "next/server";
import User from "@/models/User";
import { sendProductRejectionMail } from "@/app/lib/send-mail";

export const PUT = async (req, { params }) => {
    const auth = await verifyAuth(req, ["admin"]);

    if (!auth.isValid) {
        return NextResponse.json({
            success: false,
            message: auth.message
        }, { status: auth.status });
    }

    try {
        await connectDB();

        const { slug } = await params;
        const body = await req.json();

        const product = await Product.findOneAndUpdate(
            { slug, isActive: true },
            { 
                status: "rejected", 
                rejectionReason: body.rejectionReason || "No reason provided"
            },
            { returnDocument: "after" }
        ).lean();

        if (!product) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Requested product could not be found."
                },
                { status: 404 }
            );
        }

        // Send notification to vendor about rejection
        const vendorId = product.createdBy.toString();
        const vendorEmail = await User.findById(vendorId).select("email").lean();
        if (vendorEmail?.email) {
            await sendProductRejectionMail(
                vendorEmail.email,
                product.productName,
                product.slug,
                body.rejectionReason
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "Product rejected successfully.",
                data: product
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Product rejection failure:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Internal server error occurred."
            },
            { status: 500 }
        );
    }
};