'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Ban, Bell, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ClipboardList, Clock3, Download, MoreVertical, Search, ShieldCheck, Store, Users } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { api } from '@/app/lib/axios';
import { useAuthStore } from '@/app/store/authStore';
import { vendorsCsv } from '@/app/lib/admin-vendors';
import styles from './vendors.module.css';

const tabs = [
  { key: 'all', label: 'All Vendors', icon: Store },
  { key: 'pending-products', label: 'Pending Products', icon: ClipboardList, count: 'pendingProducts' },
  { key: 'verified-products', label: 'Verified Products', icon: ShieldCheck, count: 'verifiedProducts' },
  { key: 'suspended', label: 'Suspended', icon: Ban },
];
const statusLabels = { pending: 'Pending', verified: 'Verified', suspended: 'Suspended', rejected: 'Rejected' };
const number = value => Number(value || 0).toLocaleString('en-US');

function Avatar({ name, src }) {
  const [failed, setFailed] = useState(false);
  return <span className={styles.avatar}>{src && !failed ? <Image src={src} alt="" width={34} height={34} unoptimized onError={() => setFailed(true)} /> : (name || 'V').slice(0, 1).toUpperCase()}</span>;
}

export default function VendorManagement() {
  const user = useAuthStore(state => state.user);
  const router = useRouter();
  const [query, setQuery] = useState({ page: 1, limit: 10, filter: 'all', search: '' });
  const [search, setSearch] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    if (!user) router.replace('/auth/sign-in');
  }, [user, router]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const controller = new AbortController();
    api.get('/admin/vendors', { params: query, signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setResult(data);
      setLoading(false);
    }).catch(err => {
      if (controller.signal.aborted) return;
      setError(err.response?.data?.message || 'Unable to load vendors. Please try again.');
      setLoading(false);
    });
    return () => controller.abort();
  }, [query, attempt, user?.role]);

  function changeQuery(changes) {
    setLoading(true);
    setError('');
    setSelected([]);
    setQuery(previous => ({ ...previous, page: 1, ...changes }));
  }

  async function exportVendors() {
    setExporting(true);
    setExportError('');
    try {
      const csv = selected.length
        ? vendorsCsv(result.vendors.filter(v => selected.includes(v.id)))
        : (await api.get('/admin/vendors', { params: { ...query, export: 'true' }, responseType: 'text' })).data;
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = selected.length ? 'selected-vendors.csv' : 'vendors.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  if (!user) return null;
  if (user.role !== 'admin') return <div className={styles.denied}><h1>Admin access required</h1><Link href="/dashboard">Return to your dashboard</Link></div>;

  const vendors = result?.vendors || [];
  const total = result?.pagination?.total || 0;
  const pages = result?.pagination?.pages || 0;
  const start = total ? (query.page - 1) * query.limit + 1 : 0;
  const pageNumbers = [...new Set([1, ...Array.from({ length: 3 }, (_, i) => query.page + i - 1), pages])].filter(p => p > 0 && p <= pages).sort((a, b) => a - b);
  const metrics = [
    { label: 'Total Active Vendors', value: 'activeVendors', icon: Users, tone: 'gold', note: 'Active vendor accounts' },
    { label: 'Pending Verification', value: 'pendingVendors', icon: Clock3, tone: 'purple', note: 'Needs your attention' },
    { label: 'Verified Vendors', value: 'approvedVendors', icon: CheckCircle2, tone: 'green', note: 'Total vendors' },
    { label: 'Suspended Vendors', value: 'archivedVendors', icon: Ban, tone: 'red', note: 'Action required' },
  ];

  return <div className={styles.shell}>
    <Sidebar role="admin" />
    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <form role="search" className={styles.search} onSubmit={event => { event.preventDefault(); changeQuery({ search: search.trim() }); }}>
          <Search size={15} aria-hidden="true" /><input aria-label="Search vendors" placeholder="Search" value={search} onChange={event => setSearch(event.target.value)} />
          <button type="submit" aria-label="Submit vendor search"><ChevronRight size={14} /></button>
        </form>
        <div className={styles.account}>
          <Link href="/dashboard/messages" aria-label="Open inbox" className={styles.bell}><Bell size={19} /></Link>
          <span className={styles.language}><span aria-hidden="true">🇬🇧</span> English <ChevronDown size={12} /></span>
          <Link href="/dashboard/profile" className={styles.profile}><Avatar name={user.fullName || user.email} src={user.profilePicture} /><span><strong>{user.fullName || user.email}</strong><small>Admin</small></span><ChevronDown size={12} /></Link>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.heading}><div><h1>Vendors List</h1><p>Manage and verify vendors</p></div><button className={styles.verification} onClick={() => changeQuery({ filter: 'pending' })}>Vendor Verification</button></div>
        <section className={styles.metrics} aria-label="Vendor statistics">
          {metrics.map(({ label, value, icon: Icon, tone, note }) => <article key={value} className={`${styles.metric} ${styles[tone]}`}><span className={styles.metricIcon}><Icon size={18} strokeWidth={1.5} /></span><h2>{label}</h2><div><strong>{result ? number(result[value]) : '—'}</strong><span>{note}</span></div></article>)}
        </section>
        <div className={styles.toolbar}>
          <div className={styles.tabs} aria-label="Filter vendors">{tabs.map(({ key, label, icon: Icon, count }) => <button key={key} aria-pressed={query.filter === key} className={query.filter === key ? styles.activeTab : ''} onClick={() => changeQuery({ filter: key })}><Icon size={15} />{label}{count && <span className={key === 'verified-products' ? styles.greenCount : styles.yellowCount}>{result ? number(result[count]) : '—'}</span>}</button>)}</div>
          <button className={styles.export} onClick={exportVendors} disabled={loading || !!error || !total || exporting}><Download size={15} />{exporting ? 'Exporting…' : selected.length ? `Export (${selected.length})` : 'Export'}</button>
        </div>
        {(query.filter === 'pending' || query.search || selected.length > 0) && <div className={styles.filterNotice}><span>{query.filter === 'pending' ? 'Awaiting vendor verification' : query.search ? `Search results for “${query.search}”` : `${selected.length} vendors selected`}</span><button onClick={() => { setSearch(''); changeQuery({ filter: 'all', search: '' }); }}>Clear filters and selection</button></div>}
        {exportError && <p className={styles.error} role="alert">{exportError}</p>}
        <div className={styles.tableWrap} aria-busy={loading}>
          <table className={styles.table}><thead><tr><th className={styles.checkCell}><input type="checkbox" aria-label="Select all vendors on this page" disabled={loading || !!error || !vendors.length} checked={!loading && vendors.length > 0 && selected.length === vendors.length} onChange={event => setSelected(event.target.checked ? vendors.map(v => v.id) : [])} /></th><th>Vendor name</th><th>Verification status</th><th>Total product</th><th>Joined Date</th><th className={styles.actionCell}>Quick Action</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={6} className={styles.empty} role="status">Loading vendors…</td></tr> : error ? <tr><td colSpan={6} className={styles.empty}><p role="alert">{error}</p><button onClick={() => { setLoading(true); setError(''); setAttempt(n => n + 1); }}>Try again</button></td></tr> : !vendors.length ? <tr><td colSpan={6} className={styles.empty}>No vendors found. Try another search or filter.</td></tr> : vendors.map(vendor => <tr key={vendor.id} className={selected.includes(vendor.id) ? styles.selected : ''}>
              <td className={styles.checkCell}><input type="checkbox" aria-label={`Select ${vendor.name}`} checked={selected.includes(vendor.id)} onChange={() => setSelected(ids => ids.includes(vendor.id) ? ids.filter(id => id !== vendor.id) : [...ids, vendor.id])} /></td>
              <td><Link className={styles.vendor} href={`/dashboard/admin/vendors/${vendor.id}`}><Avatar name={vendor.name} src={vendor.profilePicture} /><span><strong>{vendor.name}</strong><small>{vendor.vendorType}</small></span></Link></td>
              <td><span className={`${styles.badge} ${styles[vendor.status] || styles.pending}`}><span />{statusLabels[vendor.status] || 'Pending'}</span></td>
              <td>{number(vendor.totalProducts)}<small className={styles.productLabel}>Products</small></td>
              <td>{vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—'}</td>
              <td className={styles.actionCell}><Link className={styles.action} href={`/dashboard/admin/vendors/${vendor.id}`} aria-label={`Review ${vendor.name}`} title="View vendor and review verification"><MoreVertical size={16} /></Link></td>
            </tr>)}</tbody>
          </table>
        </div>
        <footer className={styles.pagination}>
          <span aria-live="polite">{loading ? 'Loading vendors…' : error ? 'Vendors unavailable' : `Showing ${start} to ${Math.min(query.page * query.limit, total)} of ${number(total)} vendors`}</span>
          <nav aria-label="Vendor pages"><button aria-label="First page" disabled={loading || !!error || query.page <= 1} onClick={() => changeQuery({ page: 1 })}><ChevronsLeft size={14} /></button><button aria-label="Previous page" disabled={loading || !!error || query.page <= 1} onClick={() => changeQuery({ page: query.page - 1 })}><ChevronLeft size={14} /></button>{pageNumbers.map((page, index) => <span key={page}>{index > 0 && page - pageNumbers[index - 1] > 1 && <span className={styles.ellipsis}>…</span>}<button aria-label={`Page ${page}`} aria-current={query.page === page ? 'page' : undefined} disabled={loading || !!error} onClick={() => changeQuery({ page })}>{page}</button></span>)}<button aria-label="Next page" disabled={loading || !!error || query.page >= pages} onClick={() => changeQuery({ page: query.page + 1 })}><ChevronRight size={14} /></button><button aria-label="Last page" disabled={loading || !!error || query.page >= pages} onClick={() => changeQuery({ page: pages })}><ChevronsRight size={14} /></button></nav>
          <label><select aria-label="Vendors per page" value={query.limit} onChange={event => changeQuery({ limit: Number(event.target.value) })}>{[10, 25, 50].map(limit => <option key={limit} value={limit}>{limit} / page</option>)}</select></label>
        </footer>
      </main>
    </div>
  </div>;
}
