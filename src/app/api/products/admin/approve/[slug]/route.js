import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Product from "@/models/Products";
import { NextResponse } from "next/server";
import User from "@/models/User";
import { sendProductApprovalMail } from "@/app/lib/send-mail";

export const PUT = async (req, { params }) => {
    const auth = await verifyAuth(req, ["admin"]);

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
        const frontEndUrl=process.env.FRONT_END_URL;
        const { slug } = await params;









        const product = await Product.findOneAndUpdate(
            {
                slug,
                isActive: true,
            },
            {
                status: "approved",
               
                isPublished:true
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




        // send notification to the vendor about the approval
        console.log("Product ownwer:", product.createdBy);
        const vendorId = product.createdBy.toString();
        // get vendor email
        const vendorEmail = await User.findById(vendorId).select("email").lean();
        const productImage=product.productImages[0];
        await sendProductApprovalMail(
            vendorEmail.email,
            product.slug,
            productImage,
            "Your product has been approved!",
            frontEndUrl
        );

        return NextResponse.json(
            {
                success: true,
                message: "Product approved successfully.",
                data: product
            },
            { status: 200 });



    }
    catch (error) {
        console.error("Product approval failure:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Internal server error occurred."
            },
            { status: 500 }
        );
    }


}