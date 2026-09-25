import { generateAccessToken, verifyRefreshToken } from '@/app/lib/jwt';
import { cookies } from 'next/headers';
import connectDB from '@/app/lib/connect';
import User from '@/models/User';
import { publicUser, sameSession } from '@/app/lib/accountValidation';
import { accountResponse } from '@/app/lib/accountServer';

export async function POST() {
  const token = (await cookies()).get('refreshToken')?.value;
  let decoded;
  try { decoded = verifyRefreshToken(token); }
  catch { return accountResponse({ message: 'Please sign in again.' }, 401); }
  try {
    await connectDB();
    const record = await User.findById(decoded.id).lean();
    if (!sameSession(record, decoded)) return accountResponse({ message: 'Please sign in again.' }, 401);
    const user = publicUser(record);
    const accessToken = generateAccessToken({ id: user.id, role: user.role, email: user.email, sessionVersion: record.sessionVersion ?? 0 });
    return accountResponse({ accessToken, user });
  } catch { return accountResponse({ message: 'Account service is unavailable. Please try again.' }, 503); }
}
