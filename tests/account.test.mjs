import test from 'node:test';
import assert from 'node:assert/strict';
import { personalChanges, businessChanges, validatePassword, publicUser, publicBusiness, sameSession } from '../src/app/lib/accountValidation.js';

test('personal updates cannot alter privileges, credentials, or verification', () => {
  assert.deepEqual(personalChanges({ fullName: '  Ada Obi ', role: 'admin', password: 'attack', emailVerified: true, verificationStatus: 'verified', sessionVersion: 99 }), { fullName: 'Ada Obi' });
  assert.throws(() => personalChanges({ phoneNumber: 'not a number' }));
  assert.throws(() => personalChanges({ sex: 'invalid' }));
  assert.throws(() => personalChanges({ fullName: '' }));
  assert.throws(() => personalChanges(null));
});

test('bank changes use dotted paths and preserve untouched fields', () => {
  assert.deepEqual(businessChanges({ businessName: 'Craft House', ownerId: 'other', verificationStatus: 'verified', bankDetails: { accountNumber: '0123456789', bvn: 'private' } }), { businessName: 'Craft House', 'bankDetails.accountNumber': '0123456789' });
  assert.throws(() => businessChanges({ bankDetails: { accountNumber: '123' } }));
  assert.throws(() => businessChanges({ bankDetails: [] }));
});

test('password policy rejects mismatch, reuse, weak values and bcrypt truncation', () => {
  const valid = { currentPassword: 'OldPassword1!', newPassword: 'NewPassword2!', confirmPassword: 'NewPassword2!' };
  assert.equal(validatePassword(valid), valid);
  for (const changes of [{ confirmPassword: 'no' }, { newPassword: 'short' }, { newPassword: valid.currentPassword, confirmPassword: valid.currentPassword }, { newPassword: 'Aa1!' + 'é'.repeat(40) }]) assert.throws(() => validatePassword({ ...valid, ...changes }));
});

test('legacy sessions default to zero and password changes invalidate older tokens', () => {
  assert.equal(sameSession({}, {}), true);
  assert.equal(sameSession({ sessionVersion: 1 }, {}), false);
  assert.equal(sameSession({ sessionVersion: 1 }, { sessionVersion: 1 }), true);
  assert.equal(sameSession(null, {}), false);
});

test('public responses never expose bank or authentication secrets', () => {
  const user = publicUser({ _id: 'u', role: 'vendor', password: 'secret', verificationNumber: 'private', sessionVersion: 3 });
  assert.equal(user.password, undefined); assert.equal(user.verificationNumber, undefined); assert.equal(user.sessionVersion, undefined);
  const business = publicBusiness({ _id: 'b', bankDetails: { accountNumber: '0123456789' }, supportingDocuments: ['private'] });
  assert.equal(business.bankDetails, undefined); assert.equal(business.supportingDocuments, undefined);
});
