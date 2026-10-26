// /api/vendor/recipient
//   GET  — the signed-in vendor's payout account
//   POST — save bank details and verify them with Paystack
//   PUT  — same as POST; details can be changed
//
// A vendor cannot be fully verified (and so cannot sell) without a verified
// payout account. Otherwise we would accept their money and have no way to pay
// it back. The vendor verification flow gates on this record's verifiedAt.

import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import VendorRecipient from "@/models/VendorRecipient";
import { NextResponse } from "next/server";
import {
    createTransferRecipient,
    getTransferRecipientAccountName,
    verifyTransferRecipient,
} from "@/app/lib/paystack";

export const dynamic = "force-dynamic";

export async function GET(req) {
    const auth = await verifyAuth(req, ["vendor", "admin"]);
    if (!auth.isValid) {
        return NextResponse.json(
            { success: false, message: auth.message },
            { status: auth.status }
        );
    }

    try {
        await connectDB();
        const recipient = await VendorRecipient.findOne({ vendorId: auth.user.id }).lean();
        return NextResponse.json({ success: true, data: recipient || null });
    } catch (error) {
        console.error("VENDOR RECIPIENT GET ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}

async function saveRecipient(req) {
    const auth = await verifyAuth(req, ["vendor", "admin"]);
    if (!auth.isValid) {
        return NextResponse.json(
            { success: false, message: auth.message },
            { status: auth.status }
        );
    }

    try {
        await connectDB();

        const { bankCode, accountNumber, accountName } = await req.json();

        if (!bankCode || !accountNumber || !accountName) {
            return NextResponse.json(
                { success: false, message: "bankCode, accountNumber and accountName are required" },
                { status: 400 }
            );
        }

        const cleanedAccount = String(accountNumber).replace(/\s/g, "");

        // Create the recipient with Paystack first. This is the real check —
        // Paystack will reject an unknown bank code or a bad account number.
        const created = await createTransferRecipient({
            type: "nuban",
            name: String(accountName).trim(),
            accountNumber: cleanedAccount,
            bankCode: String(bankCode).trim(),
        });

        // Paystack returns HTTP 200 even for business-logic rejections, so
        // check its `status` field too, not just `ok`.
        const paystackRejected =
            !created.ok ||
            created.data?.status === false ||
            !created.data?.data?.recipient_code;

        if (paystackRejected) {
            console.error(
                "PAYSTACK RECIPIENT CREATE REJECTED:",
                JSON.stringify({ status: created.status, body: created.data })
            );
            return NextResponse.json(
                {
                    success: false,
                    message:
                        created.data?.message ||
                        created.data?.data?.message ||
                        `Paystack returned status ${created.status}`,
                },
                { status: 400 }
            );
        }

        const code = created.data.data.recipient_code;

        // Confirm the resolved account name matches. This is what stops us
        // paying a mistyped account number.
        const verified = await verifyTransferRecipient(code);
        const paystackAccountName = getTransferRecipientAccountName(verified);
        const nameMatches =
            paystackAccountName &&
            paystackAccountName.replace(/\s/g, "").toLowerCase() ===
                String(accountName).replace(/\s/g, "").toLowerCase();

        if (!verified.ok || verified.data?.status !== true) {
            return NextResponse.json(
                {
                    success: false,
                    message: verified.data?.message || "Could not verify this account with Paystack",
                },
                { status: 400 }
            );
        }

        if (!paystackAccountName) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Paystack retrieved the recipient but did not return a bank account name to verify. Please contact support.",
                },
                { status: 400 }
            );
        }

        if (!nameMatches) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Account name mismatch: Paystack has "${paystackAccountName}" on this account`,
                },
                { status: 400 }
            );
        }

        const recipient = await VendorRecipient.findOneAndUpdate(
            { vendorId: auth.user.id },
            {
                $set: {
                    bankCode: String(bankCode).trim(),
                    accountNumber: cleanedAccount,
                    accountName: String(accountName).trim(),
                    paystackRecipientCode: code,
                    verifiedAt: new Date(),
                    verificationFailureReason: "",
                },
            },
            { new: true, upsert: true }
        );

        return NextResponse.json({
            success: true,
            message: "Payout account verified",
            data: recipient,
        });
    } catch (error) {
        console.error("VENDOR RECIPIENT SAVE ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Server error saving payout account" },
            { status: 500 }
        );
    }
}

export const POST = saveRecipient;
export const PUT = saveRecipient;
