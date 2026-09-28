import { NextResponse } from 'next/server';
import Business from '@/models/Business';
import { AccountError } from './accountValidation';

export function accountResponse(data, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function accountFailure(error) {
  if (error instanceof AccountError) return accountResponse({ success: false, message: error.message, fields: error.fields }, error.status);
  if (error instanceof SyntaxError || error?.name === 'ValidationError') return accountResponse({ success: false, message: 'Check your form values.' }, 400);
  return accountResponse({ success: false, message: 'Account service is unavailable. Please try again.' }, 503);
}

export async function ownedBusiness(ownerId) {
  const records = await Business.find({ ownerId }).limit(2).lean();
  if (records.length > 1) throw new AccountError('Multiple business records were found. Contact your administrator to reconcile them before editing.', 409);
  return records[0] ?? null;
}
