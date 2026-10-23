import mongoose from "mongoose";

// Chart of accounts for Aba Crafts' internal ledger.
//
// Every ledger entry posts debits and credits against these accounts, so the
// platform can always answer: how much money is held, owed, or earned?
// Balances are in integer kobo (1 naira = 100 kobo) — never floats.
//
// | Account                 | Meaning                                          | Normal balance |
// |-------------------------|--------------------------------------------------|----------------|
// | PAYSTACK_CLEARING       | Money received from Paystack into our account    | Debit          |
// | ESCROW_LIABILITY        | Money we hold on behalf of vendors, not yet paid | Credit         |
// | VENDOR_PAYABLE          | Money approved for release to a vendor           | Credit         |
// | PLATFORM_REVENUE        | Aba Crafts commission and shipping fees          | Credit         |
// | PAYSTACK_FEES_EXPENSE   | Paystack processing + transfer fees we paid      | Debit          |
// | REFUNDS_PAYABLE         | Money we owe back to customers                   | Credit         |
// | TRANSFERS_CLEARING      | Money leaving our balance via Paystack transfers | Debit          |

export const ACCOUNT_CODES = {
    PAYSTACK_CLEARING: "PAYSTACK_CLEARING",
    ESCROW_LIABILITY: "ESCROW_LIABILITY",
    VENDOR_PAYABLE: "VENDOR_PAYABLE",
    PLATFORM_REVENUE: "PLATFORM_REVENUE",
    PAYSTACK_FEES_EXPENSE: "PAYSTACK_FEES_EXPENSE",
    REFUNDS_PAYABLE: "REFUNDS_PAYABLE",
    TRANSFERS_CLEARING: "TRANSFERS_CLEARING",
};

// Seeded on first use by ensureAccounts().
const DEFAULT_ACCOUNTS = [
    { code: ACCOUNT_CODES.PAYSTACK_CLEARING, name: "Paystack clearing", normalBalance: "debit" },
    { code: ACCOUNT_CODES.ESCROW_LIABILITY, name: "Escrow held for vendors", normalBalance: "credit" },
    { code: ACCOUNT_CODES.VENDOR_PAYABLE, name: "Payable to vendors", normalBalance: "credit" },
    { code: ACCOUNT_CODES.PLATFORM_REVENUE, name: "Platform revenue", normalBalance: "credit" },
    { code: ACCOUNT_CODES.PAYSTACK_FEES_EXPENSE, name: "Paystack fees", normalBalance: "debit" },
    { code: ACCOUNT_CODES.REFUNDS_PAYABLE, name: "Refunds payable to customers", normalBalance: "credit" },
    { code: ACCOUNT_CODES.TRANSFERS_CLEARING, name: "Outgoing transfers", normalBalance: "debit" },
];

const accountSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true },
        normalBalance: { type: String, enum: ["debit", "credit"], required: true },

        // Materialised running balance in kobo: sum(credits) - sum(debits).
        // Maintained by the ledger helper; never written to directly.
        balance: { type: Number, default: 0 },

        // Incremented on every posting, useful for spotting hot accounts.
        entryCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const Account = mongoose.models.Account || mongoose.model("Account", accountSchema);

export default Account;
export { DEFAULT_ACCOUNTS };

/**
 * Create any missing accounts. Safe to call on every boot or request —
 * upsert on the unique `code` means it is a no-op after the first run.
 */
export async function ensureAccounts() {
    await Account.bulkWrite(
        DEFAULT_ACCOUNTS.map((a) => ({
            updateOne: {
                filter: { code: a.code },
                update: { $setOnInsert: a },
                upsert: true,
            },
        }))
    );
}
