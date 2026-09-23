import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Category from "@/models/Category";
import { NextResponse } from "next/server";

export const POST = async (req) => {
     const auth = await verifyAuth(req, ["admin"]);
    
        // If authentication or authorization fails, i
        if (!auth.isValid) {
            return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
        }

        console.log("Auth:", auth);

        try{
            await connectDB();
            const { categoryName, description, imageUrl } = await req.json();

            if(!categoryName || !description || !imageUrl){
                return NextResponse.json(
                    {
                        success: false,
                        message: "categoryName, description and imageUrl are required"
                    },
                    { status: 400 }
                );
            };

            const newCategory = new Category({
                categoryName,
                description,
                image:imageUrl,
                createdBy: auth.id
            });
            await newCategory.save();

            return NextResponse.json(
                {
                    success: true,
                    message: "Category created successfully",
                    category: newCategory
                },
                { status: 201 }
            );

        }

        catch(error){
            console.error('Error creating category:', error);
            return NextResponse.json(
                {
                    success: false,
                    message: "Failed to create category",
                    error: error.message,
                },
                { status: 500 }
            );
        }
};