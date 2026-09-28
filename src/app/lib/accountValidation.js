export class AccountError extends Error {
  constructor(message, status = 400, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function objectBody(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AccountError('Provide a valid form.');
  return value;
}

function textFields(body, limits) {
  objectBody(body);
  const result = {};
  const fields = {};
  for (const [key, max] of Object.entries(limits)) {
    if (!(key in body)) continue;
    if (body[key] !== null && typeof body[key] !== 'string') fields[key] = 'Enter text only.';
    else {
      const value = (body[key] ?? '').trim();
      if (value.length > max) fields[key] = `Use ${max} characters or fewer.`;
      result[key] = value;
    }
  }
  if (Object.keys(fields).length) throw new AccountError('Check the highlighted fields.', 400, fields);
  return result;
}

export function personalChanges(body) {
  const result = textFields(body, { fullName: 100, phoneNumber: 30, sex: 10 });
  const fields = {};
  if ('fullName' in result && !result.fullName) fields.fullName = 'Enter your full name.';
  if (result.phoneNumber && !/^\+?[\d ()-]{7,30}$/.test(result.phoneNumber)) fields.phoneNumber = 'Enter a valid phone number.';
  if ('sex' in result) {
    result.sex ||= null;
    if (![null, 'male', 'female', 'other'].includes(result.sex)) fields.sex = 'Choose an option from the list.';
  }
  if (Object.keys(fields).length) throw new AccountError('Check the highlighted fields.', 400, fields);
  return result;
}

export function businessChanges(body) {
  const result = textFields(body, { businessName: 150, businessDescription: 2000, businessType: 100, country: 80, state: 80, lga: 100, address: 300, postalCode: 20, landmark: 200 });
  if ('businessName' in result && !result.businessName) throw new AccountError('Enter your business name.', 400, { businessName: 'Business name is required.' });
  if ('bankDetails' in body) {
    const bank = textFields(body.bankDetails, { bankName: 100, accountName: 150, accountNumber: 10, accountType: 40 });
    if (bank.accountNumber && !/^\d{10}$/.test(bank.accountNumber)) throw new AccountError('Check your account number.', 400, { accountNumber: 'Enter a 10-digit Nigerian account number.' });
    for (const [key, value] of Object.entries(bank)) result[`bankDetails.${key}`] = value;
  }
  return result;
}

export function validatePassword(body) {
  objectBody(body);
  const fields = {};
  if (typeof body.currentPassword !== 'string' || !body.currentPassword) fields.currentPassword = 'Enter your current password.';
  const password = body.newPassword;
  if (typeof password !== 'string' || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password) || new TextEncoder().encode(password).length > 72) {
    fields.newPassword = 'Use 8–72 bytes, uppercase, lowercase, a number and one of @$!%*?&.';
  }
  if (password !== body.confirmPassword) fields.confirmPassword = 'Passwords do not match.';
  if (password && password === body.currentPassword) fields.newPassword = 'Choose a password different from your current password.';
  if (Object.keys(fields).length) throw new AccountError('Check the highlighted fields.', 400, fields);
  return body;
}

export function publicUser(user) {
  return {
    id: String(user._id), fullName: user.fullName ?? '', email: user.email,
    phoneNumber: user.phoneNumber ?? '', sex: user.sex ?? '', profilePicture: user.profilePicture ?? null,
    role: user.role, emailVerified: Boolean(user.emailVerified), verificationStatus: user.verificationStatus,
    onBoardingStatus: user.onBoardingStatus, createdAt: user.createdAt, updatedAt: user.updatedAt,
  };
}

export function publicBusiness(business) {
  if (!business) return null;
  const fields = ['businessName', 'businessDescription', 'businessType', 'country', 'state', 'lga', 'address', 'postalCode', 'landmark', 'logo', 'verificationStatus'];
  return { id: String(business._id), ...Object.fromEntries(fields.map(key => [key, business[key] ?? ''])) };
}

export function sameSession(user, payload) {
  return Boolean(user) && (user.sessionVersion ?? 0) === (payload.sessionVersion ?? 0);
}
