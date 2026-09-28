// src/app/api/categories/stats/route.js
import { NextResponse } from "next/server";

import mongoose from "mongoose";
import { verifyAuth } from "@/app/lib/verifyAuth";
import connectDB from "@/app/lib/connect";
import Category from "@/models/Category";

export async function GET(request) {

    const auth = await verifyAuth(request);
    if (!auth.isValid) {
        return NextResponse.json(
            {
                success: false,
                message: auth.message
            },
            { status: auth.status }
        );
    }

    // Convert the string userId from the JWT payload into a MongoDB ObjectId
    const userId = new mongoose.Types.ObjectId(auth.user.id);

    try {
        await connectDB();

        //  Aggregate Category Data with Product Counts for this specific user
        const categoriesWithCounts = await Category.aggregate([
            {
                //  Look up products that belong to this category
                $lookup: {
                    from: "products",         //  Where are we looking?
                    localField: "_id",        //  What field in 'Category collection' are we matching?
                    foreignField: "category", //  What field in 'Product collection' references Category?
                    as: "userProducts",       //  name of the resulting array?
                    // Pipeline to filter the products by the current user before counting
                    pipeline: [
                        {
                            $match: {
                                // Only match products created by logged-in Vendor
                                createdBy: userId 
                            }
                        }
                    ]
                }
            },

            {
                //Reshape the output to keep it clean and performant
                $project: {
                    _id: 1,
                    categoryName: 1,
                   
                    // Count the number of items inside the filtered userProducts array
                    productCount: { $size: "$userProducts" }
                }
            },
            {
                //Sort alphabetically by category name
                $sort: { categoryName: 1 }
            }
        ]);

        return NextResponse.json({
            success: true,
            categories: categoriesWithCounts
        }, { status: 200 });

    } catch (error) {
        console.error("Aggregation Error:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Failed to compile category statistics."
            },
            { status: 500 }
        );
    }
}