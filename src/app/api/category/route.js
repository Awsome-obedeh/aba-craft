import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Category from "@/models/Category";
import { NextResponse } from "next/server";




export const POST = async (req) => {

    const auth = await verifyAuth(req, ["vendor", "admin"]);

    // If authentication or authorization fails, i
    if (!auth.isValid) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }


    console.log("Authenticated Vendor ID:", auth);

    try {
        await connectDB();

        const body = await req.json();

        const { categoryName, description, image, parentCategory } = body;

        if (!categoryName) {
            return NextResponse.json(
                { message: "Category name is required" },
                { status: 400 }
            );
        }

        // check if exists
        const existingCategory = await Category.findOne({ categoryName });

        if (existingCategory) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Category already exists"
                },
                { status: 409 }
            );
        }

        const category = await Category.create({
            categoryName,
            description,
            image,
            parentCategory: parentCategory || null,
        });

        return NextResponse.json(
            {
                success: true,
                message: "Category created successfully",
                category,
            },
            { status: 201 }
        );

    } catch (error) {
        console.error("Category creation error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal Server Error"
            },
            { status: 500 }
        );
    }
}


export const GET = async (req) => {

    const auth = await verifyAuth(req, ["vendor", "admin", "customer"]);

    // If authentication or authorization fails, i
    if (!auth.isValid) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }


    console.log("Authenticated Vendor ID:", auth);
    try {
        await connectDB();
        const categories = await Category.find({})
            .select("categoryName slug parentCategory")
            .populate({
                path: "parentCategory",
                select: "categoryName slug"
            })
            .lean();

        return NextResponse.json(
            {
                success: true,
                categories,
            },
            { status: 200 }
        );
    }
    catch (error) {
        console.error("Category fetch error:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Internal Server Error"
            },
            { status: 500 }
        );
    }
}