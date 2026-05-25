import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

export async function POST(req) {
    const { timestamp, folder } = await req.json();

    const signature = cloudinary.utils.api_sign_request(
        {
            timestamp,
            folder,
        },
        process.env.CLOUDINARY_API_SECRET
    );

    return NextResponse.json({
        signature,
        timestamp,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    });
}