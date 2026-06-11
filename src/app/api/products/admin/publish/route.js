import connectDB from '@/app/lib/connect';
import { verifyAuth } from '@/app/lib/verifyAuth';
import Product from '@/models/Products';
import { NextResponse } from 'next/server';

export async function GET(req) {
    const auth = await verifyAuth(req, ["admin"]);

    if (!auth.isValid) {
        return NextResponse.json({
            success: false,
            message: auth.message
        }, { status: auth.status });
    }

    try {
        await connectDB();

        const rawPendingData = await Product.aggregate([
            {
                $match: { status: 'under_review', isActive: true }
            },
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
            {
                $lookup: {
                    from: 'users',
                    localField: 'createdBy',
                    foreignField: '_id',
                    as: 'vendorDetails'
                }
            },
            {
                $unwind: {
                    path: '$vendorDetails',
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);

        const products = rawPendingData.map(item => ({
            id: item._id.toString(),
            productName: item.productName,
            price: item.price,
            productImages: item.productImages,
            slug: item.slug,
            status: item.status,
            vendorName: item.businessDetails?.businessName || item.vendorDetails?.fullName || 'Independent Vendor',
            createdAt: item.createdAt
        }));

        return NextResponse.json({
            success: true,
            products
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching pending products:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}