import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import User from "@/models/User";
import { NextResponse } from "next/server";

export const GET = async (req) => {
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
        connectDB();

        const [vendors, totalVendors, pendingVendors] = await Promise.all([

            User.aggregate([
                {
                    $match: {
                        role: "vendor"
                    }
                },

                {
                    $lookup: {
                        from: "products",
                        localField: "_id",
                        foreignField: "createdBy", 
                        as: "products"
                    }
                },

                {
                    $addFields: {
                        totalProducts: {
                            $size: "$products"
                        }
                    }
                },

                {
                    $project: {
                        fullName: 1,
                        email: 1,
                        profilePicture: 1,
                        onBoardingStatus: 1,
                        createdAt: 1,
                        totalProducts: 1
                    }
                },

                {
                    $sort: {
                        createdAt: -1
                    }
                }
            ]),

            User.countDocuments({
                role: "vendor"
            }),

            User.countDocuments({
                role: "vendor",
                onBoardingStatus: "in_progress"
            })

        ]);
        const formattedVendors = vendors.map(vendor => ({
            id: vendor._id.toString(),
            name: vendor.fullName,
            email: vendor.email,
            profilePicture: vendor.profilePicture,
            status: vendor.onBoardingStatus || "not_started",
            joinedDate: vendor.createdAt.toLocaleDateString()
        }));
        return NextResponse.json({
            success: true,
            vendors: formattedVendors,
            totalVendors,
            pendingVendors
        },
            { status: 200 });
    }
    catch (error) {
        console.log("AMIN GETTING VENDORS", error);
        return NextResponse.json({
            success: false,
            message: "Error fetching vendors",
            error: error.message
        },
            { status: 500 })
    };
}