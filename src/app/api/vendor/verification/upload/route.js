import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";

export const dynamic = "force-dynamic";

function getOwnerIdFromPayload(payload) {
  return (
    payload?.userId ||
    payload?.user_id ||
    payload?.sub ||
    payload?.id
  );
}

// This endpoint accepts a multipart file upload and stores the document in Cloudinary.
// UI expects: { url } (or { secure_url }).
export async function POST(req) {
  const auth = await verifyAuth(req, ["vendor"]);

  if (!auth.isValid) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  try {
    // Cloudinary config (admin secret not required for unsigned upload)
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    await connectDB();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, message: "CAC file is required." },
        { status: 400 }
      );
    }

    // The file object from FormData in Next.js has: { name, type, arrayBuffer() }
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "abacraft/vendor_verification/cac",
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      uploadStream.end(buffer);
    });

    const url = uploadResult?.secure_url || uploadResult?.url;

    if (!url) {
      return NextResponse.json(
        { success: false, message: "Cloudinary did not return a URL." },
        { status: 500 }
      );
    }

    // Optionally: we could upsert the document URL here, but the UI currently
    // POSTs to /vendor/verification with the URL after upload.
    return NextResponse.json(
      { success: true, url },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error uploading CAC document",
        error: error?.message,
      },
      { status: 500 }
    );
  }
}

