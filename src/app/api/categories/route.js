import connectDB from "@/app/lib/connect";
import Category from "@/models/Category";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDB();

    // Fetch active categories and structure subcategories hierarchically
    const categoriesPipeline = await Category.aggregate([
      { 
        // 1. Only pull active parent (root) categories
        $match: { isActive: true } 
      },
      {
        // 2. Lookup child subcategories matching this parent's _id
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: 'parentCategory',
          as: 'subCategories'
        }
      },
      { $sort: { categoryName: 1 } } // Alphabetical sort
    ]);

    // Format the response structure for clean mapping in the UI
    const formattedCategories = categoriesPipeline.map(cat => ({
      id: cat._id.toString(),
      name: cat.categoryName,
      slug: cat.slug,
      description: cat.description,
      image: cat.image || 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=300',
     
    }));

    return NextResponse.json(formattedCategories, { status: 200 });
  } catch (error) {
    console.error('Error fetching public categories:', error);
    return NextResponse.json({ error: 'Failed to retrieve categories' }, { status: 500 });
  }
}