export function vendorListOptions(params) {
  const positive = (value, fallback) => /^\d+$/.test(value || '') && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
  const filter = params.get('filter') || 'all';
  return {
    page: Math.min(1000000, positive(params.get('page'), 1)),
    limit: Math.min(50, positive(params.get('limit'), 10)),
    search: (params.get('search') || '').trim().slice(0, 100),
    filter: ['all', 'pending', 'verified', 'suspended', 'pending-products', 'verified-products'].includes(filter) ? filter : 'all',
    exporting: params.get('export') === 'true',
  };
}

export function vendorListMatch({ search, filter }) {
  const match = {};
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    match.$or = ['name', 'fullName', 'email'].map(field => ({ [field]: { $regex: escaped, $options: 'i' } }));
  }
  if (['pending', 'verified', 'suspended'].includes(filter)) match.status = filter;
  if (filter === 'pending-products') match.pendingProducts = { $gt: 0 };
  if (filter === 'verified-products') match.verifiedProducts = { $gt: 0 };
  return match;
}

export function vendorsCsv(vendors) {
  const cell = value => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return '\uFEFF' + [
    ['Vendor name', 'Vendor type', 'Email', 'Verification status', 'Total products', 'Joined date'],
    ...vendors.map(v => [v.name, v.vendorType, v.email, v.status, v.totalProducts, v.createdAt ? new Date(v.createdAt).toISOString().slice(0, 10) : '']),
  ].map(row => row.map(cell).join(',')).join('\r\n');
}
