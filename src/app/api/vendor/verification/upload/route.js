import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import { v2 as cloudinary } from "cloudinary";
import VendorVerification from "@/models/VendorVerification";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const auth = await verifyAuth(req, ["vendor"]);

  if (!auth.isValid) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  // Expects multipart/form-data with:
  // - file: image or pdf
  // - publicId (optional)

  try {
    await connectDB();

    const formData = await req.formData();
    const file = formData.get("file");
    const publicId = formData.get("publicId")?.toString();

    if (!file) {
      return NextResponse.json({ success: false, message: "CAC file is required." }, { status: 400 });
    }

    // Validate basic file type
    const mimeType = file.type || "";
    const isPdf = mimeType === "application/pdf";
    const isImage = mimeType.startsWith("image/");

    if (!isPdf && !isImage) {
      return NextResponse.json(
        { success: false, message: "Invalid file type. Upload an image or PDF." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadRes = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "aba-craft/vendor-verifications",
          public_id: publicId || undefined,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      stream.end(buffer);
    });

    const url = uploadRes.secure_url;

    const ownerId = auth.user.userId || auth.user.user_id || auth.user.sub || auth.user.id;

    const existing = await VendorVerification.findOne({ ownerId });

    if (!existing) {
      // Create placeholder pending record so we can attach the URL.
      await VendorVerification.create({
        ownerId,
        status: "pending",
        cacDocumentUrl: url,
      });
    } else {
      existing.cacDocumentUrl = url;
      await existing.save();
    }

    return NextResponse.json({ success: true, url }, { status: 200 });
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

