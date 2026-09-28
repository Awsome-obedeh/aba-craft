// Run against a local app and a disposable local database only. See ACCOUNT_SETTINGS.md.
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../src/models/User.js';
import Business from '../src/models/Business.js';

const base = process.env.ACCOUNT_TEST_URL || 'http://localhost:3100';
const uri = process.env.MONGODB_URI || '';
if (!/^mongodb:\/\/(localhost|127\.0\.0\.1):\d+\/abacraft_account_test$/.test(uri) || !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) throw new Error('Use a local app and the disposable abacraft_account_test database.');
await mongoose.connect(uri);
const password = 'CraftTest1!';
const ids = [];
const sessions = {};
let checks = 0;
async function request(path, { token, method = 'GET', body, cookie } = {}) {
  const response = await fetch(`${base}/api${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
function check(condition, message) { assert.ok(condition, message); checks++; console.log(`PASS ${message}`); }

try {
  for (const role of ['vendor', 'customer', 'admin']) {
    const email = `account-${role}@abacraft.test`;
    const user = await User.create({ email, fullName: role === 'vendor' ? 'Ada Okafor' : `${role} tester`, role, password: await bcrypt.hash(password, 12), emailVerified: true });
    ids.push(user._id);
    const login = await request('/auth/sign-in', { method: 'POST', body: { email, password } });
    check(login.status === 200, `${role} can sign in`);
    sessions[role] = { token: login.data.accessToken, cookie: login.cookie, id: String(user._id) };
    const profile = await request('/account/profile', sessions[role]);
    check(profile.status === 200 && profile.data.user.role === role && !('password' in profile.data.user), `${role} can load a safe profile`);
  }
  check((await request('/account/profile')).status === 401, 'anonymous profile requests are rejected');
  const customer = sessions.customer;
  const saved = await request('/account/profile', { ...customer, method: 'PATCH', body: { fullName: 'Updated Customer', phoneNumber: '+234 800 123 4567', role: 'admin', emailVerified: false, sessionVersion: 9 } });
  check(saved.status === 200 && saved.data.user.role === 'customer' && saved.data.user.emailVerified, 'personal save ignores protected fields');
  check((await request('/account/profile', customer)).data.user.fullName === 'Updated Customer', 'personal changes survive a fresh request');
  check((await request('/account/profile', { ...customer, method: 'PATCH', body: { phoneNumber: 'invalid' } })).status === 400, 'invalid personal data rejected');
  check((await request('/vendor/profile', { ...customer, method: 'PATCH', body: {} })).status === 403, 'customer cannot edit vendor details');
  const vendor = sessions.vendor;
  const before = await request('/vendor/profile', vendor);
  check(before.data.formattedResponse.vendorInfo.fullName === 'Ada Okafor' && before.data.formattedResponse.businessInfo === null, 'vendor without a business still has personal details');
  for (let i = 0; i < 2; i++) {
    const result = await request('/vendor/profile', { ...vendor, method: 'PATCH', body: { vendorInfo: { role: 'admin', verificationStatus: 'verified' }, businessInfo: { businessName: 'Ada Leather Studio', businessDescription: 'Thoughtful leather goods, handcrafted in Aba.', state: 'Abia', country: 'Nigeria', lga: 'Aba North', bankDetails: { bankName: 'Test Bank', accountName: 'Ada Okafor', accountNumber: '0123456789' } } } });
    check(result.status === 200, `vendor save ${i + 1} succeeds`);
  }
  check(await Business.countDocuments({ ownerId: vendor.id }) === 1, 'repeated saves do not duplicate businesses');
  const general = await request('/vendor/profile', vendor);
  check(!('bankDetails' in general.data.formattedResponse.businessInfo), 'bank details omitted from general vendor response');
  check((await request('/vendor/profile?includeBank=true', vendor)).data.formattedResponse.businessInfo.bankDetails.accountNumber === '0123456789', 'nested bank data round trips in owner settings');
  check((await request('/account/profile', vendor)).data.user.verificationStatus === 'pending', 'profile save cannot approve identity');
  check((await request(`/vendor/profile/${customer.id}`, { ...vendor, method: 'PATCH', body: {} })).status === 403, 'vendor cannot approve another user');
  const duplicate = await Business.create({ ownerId: vendor.id, businessName: 'Duplicate test' });
  check((await request('/vendor/profile', { ...vendor, method: 'PATCH', body: { businessInfo: { businessName: 'Ambiguous' } } })).status === 409, 'duplicate business records produce a conflict');
  check((await request('/account/profile', vendor)).data.businessError, 'duplicate business does not hide personal profile');
  await Business.deleteOne({ _id: duplicate._id });
  const form = new FormData(); form.append('photo', new Blob(['fake image'], { type: 'image/png' }), 'fake.png');
  check((await fetch(`${base}/api/account/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${vendor.token}` }, body: form })).status === 400, 'fake image bytes rejected');
  const large = new FormData(); large.append('photo', new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: 'image/png' }), 'large.png');
  check((await fetch(`${base}/api/account/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${vendor.token}` }, body: large })).status === 413, 'oversized photo rejected');
  check((await request('/account/avatar', { ...vendor, method: 'DELETE' })).status === 200, 'avatar removal succeeds');
  const legacy = jwt.sign({ id: customer.id, role: 'customer', email: 'account-customer@abacraft.test' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
  check((await request('/account/profile', { token: legacy })).status === 200, 'legacy zero-version session remains compatible');
  const change = { currentPassword: password, newPassword: 'NewCraftPass2!', confirmPassword: 'NewCraftPass2!' };
  check((await request('/account/password', { ...customer, method: 'POST', body: { ...change, currentPassword: 'WrongPass1!' } })).status === 400, 'wrong current password rejected');
  check((await request('/account/password', { ...customer, method: 'POST', body: { ...change, confirmPassword: 'different' } })).status === 400, 'password mismatch rejected');
  check((await request('/account/password', { ...customer, method: 'POST', body: change })).status === 200, 'password change succeeds');
  check((await request('/account/profile', customer)).status === 401 && (await request('/account/profile', { token: legacy })).status === 401, 'old and legacy access tokens revoked');
  check((await request('/auth/refresh', { method: 'POST', cookie: customer.cookie })).status === 401, 'old refresh token revoked');
  const login = await request('/auth/sign-in', { method: 'POST', body: { email: 'account-customer@abacraft.test', password: change.newPassword } });
  check(login.status === 200 && (await request('/account/profile', { token: login.data.accessToken })).data.user.fullName === 'Updated Customer', 'new password restores access and saved profile');
  console.log(`${checks} integration checks passed.`);
} finally {
  if (process.env.KEEP_ACCOUNT_FIXTURES !== '1') {
    await Business.deleteMany({ ownerId: { $in: ids } });
    await User.deleteMany({ _id: { $in: ids } });
  }
  await mongoose.disconnect();
}
