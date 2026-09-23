import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Ensure the Business model is imported so Mongoose registers the collection
import { Business } from '@/models/Business';
import Product from '@/models/Products';



export async function GET() {

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

    // Use aggregate to find pending products and join with the business collection
    const rawPendingData = await Product.aggregate([
      {
        $match: { status: 'pending' }
      },
      {
        $lookup: {
          from: 'businesses', // The actual collection name in MongoDB (usually lowercase plural)
          localField: 'businessId',
          foreignField: '_id',
          as: 'businessDetails'
        }
      },
      {
        $unwind: {
          path: '$businessDetails',
          preserveNullAndEmptyArrays: true // Keeps the product even if the business was deleted
        }
      },
      {
        $sort: { createdAt: -1 } // Fresh products first
      }
    ]);

    // Format the response structure nicely for your React state
    const products = rawPendingData.map(item => ({
      id: item._id.toString(),
      name: item.name,
      price: item.price,
      image: item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
      vendorName: item.businessDetails ? item.businessDetails.name : 'Independent Vendor'
    }));

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('Error fetching pending products:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}