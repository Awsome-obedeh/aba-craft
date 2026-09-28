import { verifyAuth } from '@/app/lib/verifyAuth';
import Business from '@/models/Business';
import User from '@/models/User';
import { AccountError, objectBody, personalChanges, businessChanges, publicUser, publicBusiness } from '@/app/lib/accountValidation';
import { accountResponse, accountFailure, ownedBusiness } from '@/app/lib/accountServer';

export async function GET(req) {
  const auth = await verifyAuth(req, ['vendor', 'admin']);
  if (!auth.isValid) return accountResponse({ success: false, message: auth.message }, auth.status);
  try {
    const user = await User.findById(auth.user.id).lean();
    const business = await ownedBusiness(auth.user.id);
    const businessInfo = publicBusiness(business);
    if (businessInfo) {
      businessInfo.veificationStatus = businessInfo.verificationStatus; // Legacy response key.
      if (new URL(req.url).searchParams.get('includeBank') === 'true') {
        const bank = business.bankDetails ?? {};
        businessInfo.bankDetails = { bankName: bank.bankName ?? '', accountName: bank.accountName ?? '', accountNumber: bank.accountNumber ?? '', accountType: bank.accountType ?? '' };
      }
    }
    const vendorInfo = { ...publicUser(user), joinedDate: user.createdAt, lastUpdated: user.updatedAt };
    return accountResponse({ status: true, formattedResponse: { vendorInfo, businessInfo } });
  } catch (error) { return accountFailure(error); }
}

export async function PATCH(req) {
  const auth = await verifyAuth(req, ['vendor']);
  if (!auth.isValid) return accountResponse({ success: false, message: auth.message }, auth.status);
  try {
    const body = objectBody(await req.json());
    const person = personalChanges(body.vendorInfo ?? {});
    const changes = businessChanges(body.businessInfo ?? {});
    const existing = await ownedBusiness(auth.user.id);
    if (!existing && Object.keys(changes).length && !changes.businessName) throw new AccountError('Save your business details before adding bank details.', 400);
    let business = existing;
    if (Object.keys(changes).length) {
      // Existing records are updated by their owner-scoped ID; never recreate on save.
      if (existing) business = await Business.findOneAndUpdate({ _id: existing._id, ownerId: auth.user.id }, { $set: changes }, { new: true, runValidators: true }).lean();
      else {
        // A stable ID makes concurrent first saves converge on the same document.
        try {
          business = await Business.findOneAndUpdate({ _id: auth.user.id, ownerId: auth.user.id }, { $set: changes, $setOnInsert: { ownerId: auth.user.id } }, { upsert: true, new: true, runValidators: true }).lean();
        } catch (error) {
          if (error.code === 11000) throw new AccountError('Business details changed while saving. Reload and try again.', 409);
          throw error;
        }
      }
    }
    if (business?.businessName) person.onBoardingStatus = 'completed';
    const updatedVendor = Object.keys(person).length
      ? await User.findByIdAndUpdate(auth.user.id, { $set: person }, { new: true, runValidators: true }).lean()
      : await User.findById(auth.user.id).lean();
    return accountResponse({ success: true, message: 'Vendor profile updated successfully', data: { updatedVendor: publicUser(updatedVendor), business: publicBusiness(business) } });
  } catch (error) { return accountFailure(error); }
}
