import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import User from "@/models/User";
import Product from "@/models/Products";
import { NextResponse } from "next/server";

export const GET = async (req) => {
    const auth = await verifyAuth(req, ["admin"]);

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
        const limitParam = parseInt(searchParams.get("limit")) || 10;
        const limit = Math.max(1, Math.min(50, limitParam));
        const skip = (page - 1) * limit;

        const [vendors, totalVendors, approvedVendors, pendingVendors, archivedVendors] = await Promise.all([
            User.aggregate([
                {
                    $match: {
                        role: "vendor"
                    }
                },
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        fullName: 1,
                        email: 1,
                        profilePicture: 1,
                        onBoardingStatus: 1,
                        verificationStatus: 1,
                        createdAt: 1,
                        isActive: 1
                    }
                }
            ]),
            User.countDocuments({
                role: "vendor"
            }),
            User.countDocuments({
                role: "vendor",
                verificationStatus: "completed"
            }),
            User.countDocuments({
                role: "vendor",
                verificationStatus: "pending"
            }),
            User.countDocuments({
                role: "vendor",
                isActive: false
            })
        ]);

        const vendorIds = vendors.map(v => v._id);

        let productCountMap = {};
        if (vendorIds.length > 0) {
            const productCounts = await Product.aggregate([
                {
                    $match: {
                        createdBy: { $in: vendorIds }
                    }
                },
                {
                    $group: {
                        _id: "$createdBy",
                        count: { $sum: 1 }
                    }
                }
            ]);
            productCounts.forEach(pc => {
                productCountMap[pc._id.toString()] = pc.count;
            });
        }

        const formattedVendors = vendors.map(vendor => ({
            id: vendor._id.toString(),
            _id: vendor._id.toString(),
            name: vendor.fullName,
            fullName: vendor.fullName,
            email: vendor.email,
            profilePicture: vendor.profilePicture,
            status: vendor.onBoardingStatus || "not_started",
            onBoardingStatus: vendor.onBoardingStatus || "not_started",
            verificationStatus: vendor.verificationStatus || "not_started",
            totalProducts: productCountMap[vendor._id.toString()] || 0,
            createdAt: vendor.createdAt,
            joinedDate: vendor.createdAt.toLocaleDateString()
        }));
        return NextResponse.json({
            success: true,
            vendors: formattedVendors,
            totalVendors,
            pendingVendors,
            approvedVendors,
            archivedVendors
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