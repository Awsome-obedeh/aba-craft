import { jwtVerify } from 'jose';
import connectDB from '@/app/lib/connect';
import User from '@/models/User';
import { sameSession } from './accountValidation';

export async function verifyAuth(request, allowedRoles = []) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return { isValid: false, status: 401, message: 'Please sign in.' };
  let payload;
  try {
    ({ payload } = await jwtVerify(header.slice(7), new TextEncoder().encode(process.env.JWT_ACCESS_SECRET)));
  } catch {
    return { isValid: false, status: 401, message: 'Your session has expired. Please sign in again.' };
  }
  try {
    await connectDB();
    const user = await User.findById(payload.id).select('role email sessionVersion').lean();
    if (!sameSession(user, payload)) return { isValid: false, status: 401, message: 'Your session has expired. Please sign in again.' };
    if (allowedRoles.length && !allowedRoles.includes(user.role)) return { isValid: false, status: 403, message: 'You do not have access to this action.' };
    return { isValid: true, user: { ...payload, id: String(user._id), role: user.role, email: user.email } };
  } catch {
    return { isValid: false, status: 503, message: 'Account service is unavailable. Please try again.' };
  }
}
