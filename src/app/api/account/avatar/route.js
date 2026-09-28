import { v2 as cloudinary } from 'cloudinary';
import User from '@/models/User';
import { verifyAuth } from '@/app/lib/verifyAuth';
import { AccountError, publicUser } from '@/app/lib/accountValidation';
import { accountFailure, accountResponse } from '@/app/lib/accountServer';

export async function POST(req) {
  const auth = await verifyAuth(req);
  if (!auth.isValid) return accountResponse({ message: auth.message }, auth.status);
  try {
    const { CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret, NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: cloudName } = process.env;
    if (Number(req.headers.get('content-length')) > 2 * 1024 * 1024 + 16384) throw new AccountError('Choose a photo smaller than 2 MB.', 413);
    const data = await req.formData();
    const file = data.get('photo');
    if (!file || typeof file.arrayBuffer !== 'function' || !['image/jpeg', 'image/png'].includes(file.type)) throw new AccountError('Choose a JPEG or PNG image.');
    if (!file.size || file.size > 2 * 1024 * 1024) throw new AccountError('Choose a photo smaller than 2 MB.', 413);
    const bytes = Buffer.from(await file.arrayBuffer());
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if ((file.type === 'image/png' && !png) || (file.type === 'image/jpeg' && !jpeg)) throw new AccountError('The file is not a valid JPEG or PNG image.');
    if (!apiKey || !apiSecret || !cloudName) throw new AccountError('Photo uploads are not configured yet. Your existing photo has been kept.', 503);
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    const image = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ resource_type: 'image', folder: `abacraft/avatars/${auth.user.id}`, allowed_formats: ['jpg', 'png'], transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'auto' }] }, (error, result) => error ? reject(error) : resolve(result)).end(bytes);
    });
    // Only replace the database value after Cloudinary has decoded and stored the image.
    const user = await User.findByIdAndUpdate(auth.user.id, { $set: { profilePicture: image.secure_url } }, { new: true }).lean();
    return accountResponse({ success: true, user: publicUser(user) });
  } catch (error) { return accountFailure(error); }
}

export async function DELETE(req) {
  const auth = await verifyAuth(req);
  if (!auth.isValid) return accountResponse({ message: auth.message }, auth.status);
  try {
    const user = await User.findByIdAndUpdate(auth.user.id, { $set: { profilePicture: null } }, { new: true }).lean();
    return accountResponse({ success: true, user: publicUser(user) });
  } catch (error) { return accountFailure(error); }
}
