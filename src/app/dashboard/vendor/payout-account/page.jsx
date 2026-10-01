"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuthStore } from "@/app/store/authStore";
import { api } from "@/app/lib/axios";

// Nigerian banks, by Paystack bank code. A static list is deliberate: it keeps
// the form working offline and avoids a third-party lookup for what is a fixed
// regulatory list. Paystack is still the source of truth — it is what actually
// verifies the account number when this is saved.
const BANKS = [
    { code: "063", name: "Access Bank" },
    { code: "002", name: "Ecobank Nigeria" },
    { code: "003", name: "First Bank of Nigeria" },
    { code: "004", name: "First City Monument Bank (FCMB)" },
    { code: "005", name: "Guaranty Trust Bank" },
    { code: "011", name: "Kuda Bank" },
    { code: "061", name: "Providus Bank" },
    { code: "010", name: "Polaris Bank" },
    { code: "076", name: "Polaris Bank (alternate)" },
    { code: "023", name: "Stanbic IBTC Bank" },
    { code: "068", name: "Standard Chartered Bank" },
    { code: "052", name: "Sterling Bank" },
    { code: "032", name: "Union Bank of Nigeria" },
    { code: "033", name: "United Bank for Africa (UBA)" },
    { code: "215", name: "Union Bank (alternate)" },
    { code: "035", name: "Wema Bank" },
    { code: "090", name: "Zenith Bank" },
];

export default function VendorPayoutAccountPage() {
    const user = useAuthStore((s) => s.user);
    const [form, setForm] = useState({ bankCode: "", accountNumber: "", accountName: "" });
    const [existing, setExisting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await api.get("/vendor/recipient");
            const r = res.data?.data;
            setExisting(r || null);
            if (r) {
                setForm({
                    bankCode: r.bankCode || "",
                    accountNumber: r.accountNumber || "",
                    accountName: r.accountName || "",
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        // Deferred to a microtask so the effect body itself never sets state.
        Promise.resolve().then(() => {
            if (!cancelled) load();
        });
        return () => { cancelled = true; };
    }, [load]);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();

        if (!/^\d{10}$/.test(form.accountNumber.replace(/\s/g, ""))) {
            toast.error("Nigerian account numbers are 10 digits");
            return;
        }
        if (form.accountName.trim().split(/\s+/).length < 2) {
            toast.error("Enter the full account name as it appears at your bank");
            return;
        }

        try {
            setSaving(true);
            const res = await api.post("/vendor/recipient", {
                bankCode: form.bankCode,
                accountNumber: form.accountNumber,
                accountName: form.accountName.trim(),
            });
            if (res.data?.success) {
                toast.success("Payout account verified");
                await load();
            } else {
                toast.error(res.data?.message || "Could not verify this account");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not save payout account");
        } finally {
            setSaving(false);
        }
    };

    const bankName = BANKS.find((b) => b.code === form.bankCode)?.name || "—";

    return (
        <DashboardLayout role="vendor" email={user?.email}>
            <h1 className="text-2xl font-bold">Payout account</h1>
            <p className="text-sm text-gray-500 mt-1">
                Where your earnings are sent. We verify it with Paystack before saving.
            </p>

            {loading ? (
                <div className="py-24 text-center text-sm text-gray-400 animate-pulse">Loading…</div>
            ) : (
                <div className="mt-6 max-w-lg space-y-5">
                    {existing?.verifiedAt && (
                        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                            <p className="font-semibold">Payout account verified</p>
                            <p className="mt-1">
                                {existing.accountName} — {bankName} ·{" "}
                                {existing.accountNumber}
                            </p>
                        </div>
                    )}

                    <form onSubmit={submit} className="border rounded-2xl p-5 bg-white space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Bank
                            </label>
                            <select
                                value={form.bankCode}
                                onChange={set("bankCode")}
                                className="w-full rounded-md border border-gray-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            >
                                <option value="">Select your bank</option>
                                {BANKS.map((b) => (
                                    <option key={b.code} value={b.code}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Account number
                            </label>
                            <input
                                value={form.accountNumber}
                                onChange={set("accountNumber")}
                                inputMode="numeric"
                                maxLength={10}
                                placeholder="0123456789"
                                className="w-full rounded-md border border-gray-300 p-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Account name
                            </label>
                            <input
                                value={form.accountName}
                                onChange={set("accountName")}
                                placeholder="As registered at your bank"
                                className="w-full rounded-md border border-gray-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                This must match exactly, or the payout will be rejected.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={saving || !form.bankCode}
                            className="w-full bg-black text-white py-2.5 rounded-md text-sm font-semibold disabled:opacity-50"
                        >
                            {saving ? "Verifying with Paystack…" : "Save and verify"}
                        </button>
                    </form>

                    <a
                        href="/dashboard/vendor/settlements"
                        className="inline-block text-sm text-gray-600 underline"
                    >
                        ← Back to payouts
                    </a>
                </div>
            )}
        </DashboardLayout>
    );
}
