
import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Product from "@/models/Products";

import { NextResponse } from "next/server";
export const POST = async (req) => {

    const auth = await verifyAuth(req, ["vendor", "admin"]);

    // If authentication or authorization fails, i
    if (!auth.isValid) {
        return NextResponse.json({
            success: false,
            message: auth.message
        },

            { status: auth.status });
    }


    // console.log(auth)


    const { productName, businessId, description, price, quantity, category, brand, isFeatured, productImages, discountPrice, discountPercentage, redirectWhatsapp } = await req.json();

    // Basic validation
    if (!productName || !description || !price || !quantity || !category || !brand || !productImages) {
        return new Response(JSON.stringify({ error: "All fields are required" }), { status: 400 });
    }

    try {

        await connectDB();
        // Create slug
        const slug = productName
            .toLowerCase()
            .trim()
            .replace(/[^a-zA-Z0-9 ]/g, "")
            .replace(/\s+/g, "-");

        // Check if product already exists
        const existingProduct =
            await Product.findOne({
                slug,
                isActive:true
            });

        if (existingProduct) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Product with this name already exists",
                },
                {
                    status: 409,
                }
            );
        }



        // Create Product
        const product = await Product.create({
            createdBy: auth.user.id, // Associate product with the authenticated vendor/admin
            businessId:businessId || '', // shops that own produt
            productName,
            description,
            price,
            quantity,
            category,
            brand,
            slug,
            productImages,
            discountPrice: discountPrice || 0,
            discountPercentage: discountPercentage || 0,
            featured: isFeatured || false,
            redirectWhatsapp: redirectWhatsapp || false,

            // Default workflow values
            status: "under_review",
            isPublished: false,
        });

        return NextResponse.json(
            {
                success: true,
                message:
                    "Product submitted for admin review",
                product,
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        console.log("PRODUCT CREATE ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    "Server Error",
                error: error.message,
            },
            {
                status: 500,
            }
        );
    }
}






export const GET = async (req) => {

    const auth = await verifyAuth(req, ["vendor", "admin"]);

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
        
        // Core Pagination Parameters 
        const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
        const limit = Math.max(1, parseInt(searchParams.get("limit")) || 9);
        const skip = (page - 1) * limit;

        //  Extract operational filter criteria
        const search = searchParams.get("search");
        const category = searchParams.get("category");
        const brand = searchParams.get("brand");
        const minPrice = searchParams.get("minPrice");
        const maxPrice = searchParams.get("maxPrice");
        const hasDiscount = searchParams.get("hasDiscount");
        const hasPercentageDiscount = searchParams.get("hasPercentageDiscount");

        let query = {};
        query.isActive = true; // Only fetch active products

        if (search) query.productName  = { $regex: search, $options: "i" };
        if (category) query.category = category; 
        if (brand) query.brand = { $regex: `^${brand}$`, $options: "i" };

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        if (hasDiscount === "true") {
            query.discountPrice = { $gt: 0, $ne: null };
        }

        if (hasPercentageDiscount === "true") {
            query.discountPercentage = { $gt: 0, $ne: null };
        }

        // Ensure vendors only see their products, admins can see all
        if(auth.user.id && auth.user.role === "vendor") query.createdBy = auth.user.id;

        //  Run execution query along with parallel total counter
        const [products, totalItems] = await Promise.all([
            Product.find(query)
                .select("productName price discountPrice discountPercentage brand category productImages slug ")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Product.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return NextResponse.json({ 
            success: true, 
           data:products,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                limit
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Product fetch error:", error);
        return NextResponse.json({ success: false, message: "Server error fetching products" }, { status: 500 });
    }
}




// multi search bar with pagination and filters for price range, category, brand, and discount availability
// export async function GET(req) {
//     try {
//         await connectDB();
        
//         const { searchParams } = new URL(req.url);
        
//         // 1. Pagination Params
//         const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
//         const limit = Math.max(1, parseInt(searchParams.get("limit")) || 9);
//         const skip = (page - 1) * limit;

//         // 2. Filter Params
//         const search = searchParams.get("search");
//         const minPrice = searchParams.get("minPrice");
//         const maxPrice = searchParams.get("maxPrice");
//         const hasDiscount = searchParams.get("hasDiscount");

//         // 3. Build the Base Match Stage (for static filters)
//         let baseMatch = {};
//         if (minPrice || maxPrice) {
//             baseMatch.price = {};
//             if (minPrice) baseMatch.price.$gte = parseFloat(minPrice);
//             if (maxPrice) baseMatch.price.$lte = parseFloat(maxPrice);
//         }
//         if (hasDiscount === "true") {
//             baseMatch.discountPrice = { $gt: 0, $ne: null };
//         }

//         // 4. Construct the Assembly Line (Pipeline)
//         let pipeline = [];

//         // Apply basic price/discount filters first to minimize data moving down the line
//         if (Object.keys(baseMatch).length > 0) {
//             pipeline.push({ $match: baseMatch });
//         }

//         // Pull in the referenced Category document so we can read its text name
//         pipeline.push({
//             $lookup: {
//                 from: "categories",         // Collection name in MongoDB
//                 localField: "category",     // The ObjectId field on Product
//                 foreignField: "_id",        // The target field on Category
//                 as: "categoryDetails"
//             }
//         });

//         // Flatten the categoryDetails array from $lookup into a single object
//         pipeline.push({
//             $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true }
//         });

//         // Universal Search Stage using $or
//         if (search) {
//             pipeline.push({
//                 $match: {
//                     $or: [
//                         { name: { $regex: search, $options: "i" } },
//                         { brand: { $regex: search, $options: "i" } },
//                         { "categoryDetails.categoryName": { $regex: search, $options: "i" } }
//                     ]
//                 }
//             });
//         }

//         // 5. Facet Stage: Handles getting data and counts concurrently
//         pipeline.push({
//             $facet: {
//                 metadata: [{ $count: "total" }],
//                 data: [
//                     { $sort: { createdAt: -1 } },
//                     { $skip: skip },
//                     { $limit: limit },
//                     {
//                         $project: {
//                             name: 1,
//                             price: 1,
//                             discountPrice: 1,
//                             brand: 1,
//                             slug: 1,
//                             category: "$categoryDetails.categoryName" // Remap category to show the name string directly
//                         }
//                     }
//                 ]
//             }
//         });

//         const aggregationResult = await Product.aggregate(pipeline);
        
//         // Extract data and totals from the facet payload securely
//         const products = aggregationResult[0]?.data || [];
//         const totalItems = aggregationResult[0]?.metadata[0]?.total || 0;
//         const totalPages = Math.ceil(totalItems / limit);

//         return NextResponse.json({ 
//             success: true, 
//             data: products,
//             pagination: { totalItems, totalPages, currentPage: page, limit }
//         }, { status: 200 });

//     } catch (error) {
//         console.error("Universal search error:", error);
//         return NextResponse.json({ success: false, message: "Server error executing search index" }, { status: 500 });
//     }
// }