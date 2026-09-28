import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import User from '@/models/User';
import { verifyAuth } from '@/app/lib/verifyAuth';
import { AccountError, validatePassword } from '@/app/lib/accountValidation';
import { accountResponse, accountFailure } from '@/app/lib/accountServer';

export async function POST(req) {
  const auth = await verifyAuth(req);
  if (!auth.isValid) return accountResponse({ message: auth.message }, auth.status);
  try {
    const body = validatePassword(await req.json());
    const user = await User.findById(auth.user.id);
    if (!user || !await bcrypt.compare(body.currentPassword, user.password)) throw new AccountError('Your current password is incorrect.', 400, { currentPassword: 'Incorrect password.' });
    const password = await bcrypt.hash(body.newPassword, 12);
    // Compare-and-swap prevents two concurrent requests using the old password.
    const result = await User.updateOne({ _id: user._id, password: user.password }, { $set: { password }, $inc: { sessionVersion: 1 } });
    if (!result.modifiedCount) throw new AccountError('Your password has already changed. Please sign in again.', 409);
    (await cookies()).delete('refreshToken');
    return accountResponse({ success: true, message: 'Password changed. Sign in again on your devices.' });
  } catch (error) { return accountFailure(error); }
}
