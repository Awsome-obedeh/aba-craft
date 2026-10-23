
import connectDB from '@/app/lib/connect';
import Product from '@/models/Products';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/app/lib/verifyAuth';


export async function GET(req) {

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

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
        const limitParam = parseInt(searchParams.get("limit")) || 20;
        const limit = Math.max(1, Math.min(100, limitParam));
        const skip = (page - 1) * limit;

        const [rawPendingData, totalCount] = await Promise.all([
            Product.aggregate([
                // Get all products pending publication
                {
                    $match: { status: 'under_review', isActive: true }
                },
                //Join with the business collection to get vendor info
                {
                    $lookup: {
                        from: 'businesses',
                        localField: 'businessId',
                        foreignField: '_id',
                        as: 'businessDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$businessDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: { createdAt: -1 }
                },
                { $skip: skip },
                { $limit: limit }
            ]),
            Product.countDocuments({ status: 'under_review', isActive: true })
        ]);

        // Compute per-business pending counts with ONE grouped aggregation
        const businessIds = rawPendingData
            .map(item => item.businessId)
            .filter(id => id);

        let businessPendingCountMap = {};
        if (businessIds.length > 0) {
            const groupedCounts = await Product.aggregate([
                {
                    $match: {
                        status: 'under_review',
                        isActive: true,
                        businessId: { $in: businessIds }
                    }
                },
                {
                    $group: {
                        _id: '$businessId',
                        count: { $sum: 1 }
                    }
                }
            ]);
            groupedCounts.forEach(gc => {
                businessPendingCountMap[gc._id.toString()] = gc.count;
            });
        }

        // Format the payload 
        const products = rawPendingData.map(item => ({
            id: item._id.toString(),
            productName: item.productName,
            price: item.price,
            slug: item.slug,
            status: item.status,
            discountPrice: item.discountPrice,
            discountPercentage: item.discountPercentage,
            productImages: item.productImages,
            vendorName: item.businessDetails ? item.businessDetails.businessName : 'Independent Vendor',
            underReviewCount: item.businessId ? (businessPendingCountMap[item.businessId.toString()] || 0) : 0
        }));

        return NextResponse.json(
            {
                success: true,
                products,
                page,
                total: totalCount,
            },
            { status: 200 });


    } catch (error) {
        console.error('Error fetching pending products:', error);
        return NextResponse.json(
            {
                success: false,
                message: "Failed to get vendor's pending business",
                error: error.message,
            },
            { status: 500 }
        );
    }
}