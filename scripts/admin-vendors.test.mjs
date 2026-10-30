import test from 'node:test';
import assert from 'node:assert/strict';
import { vendorListOptions, vendorListMatch, vendorsCsv } from '../src/app/lib/admin-vendors.js';

test('vendor pagination rejects malformed input and caps page size', () => {
  const options = query => vendorListOptions(new URLSearchParams(query));
  assert.deepEqual(options(''), { page: 1, limit: 10, search: '', filter: 'all', exporting: false });
  assert.equal(options('page=-1&limit=999').page, 1);
  assert.equal(options('page=-1&limit=999').limit, 50);
  assert.equal(options('page=2abc&limit=0').page, 1);
  assert.equal(options('page=2abc&limit=0').limit, 10);
  assert.equal(options('page=3&limit=25').page, 3);
  assert.equal(options('filter=invalid').filter, 'all');
  assert.equal(options('export=true').exporting, true);
});

test('search treats regex characters as literal vendor name text', () => {
  const match = vendorListMatch({ search: 'A.* (Crafts) [1]', filter: 'all' });
  const regex = new RegExp(match.$or[0].name.$regex, 'i');
  assert.equal(regex.test('A.* (Crafts) [1]'), true);
  assert.equal(regex.test('ABC Crafts 1'), false);
  assert.equal(match.$or.length, 3);
});

test('product filters and vendor verification filters remain distinct', () => {
  assert.deepEqual(vendorListMatch({ filter: 'pending-products' }), { pendingProducts: { $gt: 0 } });
  assert.deepEqual(vendorListMatch({ filter: 'verified-products' }), { verifiedProducts: { $gt: 0 } });
  assert.deepEqual(vendorListMatch({ filter: 'pending' }), { status: 'pending' });
  assert.deepEqual(vendorListMatch({ filter: 'suspended' }), { status: 'suspended' });
});

test('CSV preserves commas, quotes, zero counts and dates, and neutralizes formulas', () => {
  const csv = vendorsCsv([{ name: 'Royal, "Crafts"', vendorType: 'Wholesaler', email: '=FORMULA()', status: 'pending', totalProducts: 0, createdAt: '2026-10-30T12:00:00Z' }]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"Royal, ""Crafts"""'));
  assert.ok(csv.includes('"\'=FORMULA()"'));
  assert.ok(csv.includes('"0","2026-10-30"'));
  assert.equal(vendorsCsv([]).split('\r\n').length, 1);
});
