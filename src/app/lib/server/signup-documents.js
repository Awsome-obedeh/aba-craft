import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { SignupError } from "./signup-validation.js";

function configure() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) throw new SignupError("Document storage is not configured.", 503);
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
}

export async function uploadDocument({ bytes, mimeType, size, purpose = "cac" }) {
  configure();
  const extension = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[mimeType];
  if (!["cac", "nin"].includes(purpose)) throw new SignupError("Unsupported document purpose.");
  const publicId = `signup/${purpose}/${randomUUID()}.${extension}`;
  try {
    await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        public_id: publicId, resource_type: "raw", type: "authenticated", overwrite: false, timeout: 60000,
      }, (error, result) => error ? reject(error) : resolve(result));
      stream.on("error", reject);
      stream.end(bytes);
    });
    return { publicId, mimeType, size, uploadedAt: new Date() };
  } catch {
    // Handles uploads accepted remotely before a connection timeout as well.
    await deleteDocument({ publicId }).catch(() => {});
    throw new SignupError("The document could not be uploaded. Please try again.", 502);
  }
}

export async function deleteDocument({ publicId }) {
  configure();
  return cloudinary.uploader.destroy(publicId, { resource_type: "raw", type: "authenticated", invalidate: true });
}

export function documentDownloadUrl(publicId) {
  configure();
  return cloudinary.utils.private_download_url(publicId, null, {
    resource_type: "raw", type: "authenticated", attachment: true, expires_at: Math.floor(Date.now() / 1000) + 60,
  });
}
