import User from '@/models/User';
import { verifyAuth } from '@/app/lib/verifyAuth';
import { personalChanges, publicUser, publicBusiness, AccountError } from '@/app/lib/accountValidation';
import { accountResponse, accountFailure, ownedBusiness } from '@/app/lib/accountServer';

export async function GET(req) {
  const auth = await verifyAuth(req);
  if (!auth.isValid) return accountResponse({ message: auth.message }, auth.status);
  try {
    const user = await User.findById(auth.user.id).lean();
    if (!user) throw new AccountError('Account not found.', 404);
    let business = null;
    let businessError = null;
    if (user.role === 'vendor') {
      try { business = publicBusiness(await ownedBusiness(user._id)); }
      catch (error) { if (error.status !== 409) throw error; businessError = error.message; }
    }
    return accountResponse({ success: true, user: publicUser(user), business, businessError });
  } catch (error) { return accountFailure(error); }
}

export async function PATCH(req) {
  const auth = await verifyAuth(req);
  if (!auth.isValid) return accountResponse({ message: auth.message }, auth.status);
  try {
    const body = await req.json();
    const changes = personalChanges(body);
    // New images must pass the authenticated upload endpoint, never an arbitrary URL.
    if ('profilePicture' in body) {
      if (body.profilePicture !== null) throw new AccountError('Use the photo upload control to change your picture.');
      changes.profilePicture = null;
    }
    const user = await User.findByIdAndUpdate(auth.user.id, { $set: changes }, { new: true, runValidators: true }).lean();
    if (!user) throw new AccountError('Account not found.', 404);
    return accountResponse({ success: true, user: publicUser(user) });
  } catch (error) { return accountFailure(error); }
}
