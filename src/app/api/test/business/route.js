import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Business from "@/models/Business";
import { NextResponse } from "next/server";

export const POST = async (req) => {
    const auth = await verifyAuth(req, ["admin", "vendor"]);

    // If authentication or authorization fails, i
    if (!auth.isValid) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }

    try {
        await connectDB();
        const { businessName, description, logo, address, typeOfBusiness } = await req.json();

        if (!businessName || !description || !address || !typeOfBusiness) {
            return NextResponse.json(
                { message: "All fields are required" },
                { status: 400 }
            );
        }
        const existingBusiness = await Business.findOne({ businessName });

        if (existingBusiness) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Business already exists"
                },
                { status: 409 }
            );
        }

        const business = await Business.create({
            businessName,
            description,
            logo: logo || "",
            address,
            ownerId: auth.user.id,
            typeOfBusiness,

        });

        return NextResponse.json(
            {
                success: true,
                message: "Business created successfully",
                data:business
            },
            { status: 201 }
        );
    }


    catch (error) {
        console.error('Error creating business:', error);
        return NextResponse.json(
            {
                success: false,
                message: "Failed to create business",
                error: error.message,
            },
            { status: 500 }
        );
    }
}