// POST /api/admin/settlements/disputes/[id]/resolve
//
// Admin decides the fate of a disputed escrow.
//
//   resolution = "release"  -> all of it to the vendor
//   resolution = "refund"   -> all of it back to the customer
//   resolution = "partial"  -> refundAmountKobo to the customer, rest to the vendor
//
// A refund is not complete when this route returns — it calls Paystack and
// waits. The refund.processed webhook then posts the ledger entry.

import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import VendorOrder, { ESCROW } from "@/models/VendorOrder";
import Order from "@/models/Order";
import { NextResponse } from "next/server";
import {
    resolveDispute,
    resolveDisputePartially,
    requestRelease,
} from "@/app/lib/escrow";
import { postPartialRefund } from "@/app/lib/ledger";
import { toIntegerKobo, nairaToKobo } from "@/app/lib/money";
import { paystackRequest } from "@/app/lib/paystack";

const RESOLUTIONS = ["release", "refund", "partial"];

/** Call Paystack's refund API. Amounts are in kobo throughout. */
async function refundFromPaystack(order, amountKobo, note) {
    return paystackRequest("/refund", {
        method: "POST",
        body: JSON.stringify({
            reference: order.paymentRef,
            amount: toIntegerKobo(amountKobo),
            // Paystack reason codes. "customer" is the appropriate one for a
            // dispute resolved in the buyer's favour.
            reason: "customer",
            merchant_note: String(note || "Dispute resolved by admin").slice(0, 200),
        }),
    });
}

export async function POST(req, { params }) {
    const auth = await verifyAuth(req, ["admin"]);
    if (!auth.isValid) {
        return NextResponse.json(
            { success: false, message: auth.message },
            { status: auth.status }
        );
    }

    const { id } = await params;
    const { resolution, note = "", refundAmount, refundPercent } =
        await req.json().catch(() => ({}));

    if (!RESOLUTIONS.includes(resolution)) {
        return NextResponse.json(
            { success: false, message: `resolution must be one of ${RESOLUTIONS.join(", ")}` },
            { status: 400 }
        );
    }

    try {
        await connectDB();

        const vendorOrder = await VendorOrder.findById(id);
        if (!vendorOrder) {
            return NextResponse.json(
                { success: false, message: "Vendor order not found" },
                { status: 404 }
            );
        }
        if (vendorOrder.disputeStatus !== "open") {
            return NextResponse.json(
                { success: false, message: "That dispute is not open" },
                { status: 400 }
            );
        }

        const order = await Order.findById(vendorOrder.orderId);
        if (!order) {
            return NextResponse.json(
                { success: false, message: "Parent order not found" },
                { status: 404 }
            );
        }

        // --- Full release to the vendor -------------------------------------
        if (resolution === "release") {
            const resolved = await resolveDispute(vendorOrder._id, "release", auth.user.id, note);
            if (!resolved) {
                return NextResponse.json(
                    { success: false, message: "Could not resolve that dispute" },
                    { status: 409 }
                );
            }

            // Same atomic path as a normal release, so an admin decision is
            // queued for payout exactly like a customer confirmation.
            const released = await requestRelease(resolved._id, {
                createdBy: `admin:${auth.user.id}`,
                reason: note || "dispute resolved in favour of the vendor",
            });

            return NextResponse.json({
                success: true,
                message: released
                    ? "Dispute resolved — funds queued for payout"
                    : "Dispute resolved",
                vendorOrder: resolved,
            });
        }

        // --- Full refund to the customer ------------------------------------
        if (resolution === "refund") {
            const resolved = await resolveDispute(vendorOrder._id, "refund", auth.user.id, note);
            if (!resolved) {
                return NextResponse.json(
                    { success: false, message: "Could not resolve that dispute" },
                    { status: 409 }
                );
            }

            // Refund this vendor's share of the order. The escrow was split
            // per vendor, so refunding the full order total when there are
            // several vendors would refund money that is not ours to refund.
            const { ok, data } = await refundFromPaystack(order, vendorOrder.netAmount, note);
            if (!ok) {
                return NextResponse.json(
                    { success: false, message: data?.message || "Paystack rejected the refund", error: data },
                    { status: 400 }
                );
            }

            resolved.escrowStatus = ESCROW.REFUNDED;
            await resolved.save();

            return NextResponse.json({
                success: true,
                message: "Refund initiated — awaiting Paystack confirmation",
                vendorOrder: resolved,
            });
        }

        // --- Partial split ---------------------------------------------------
        // The admin can give an exact kobo amount or a percentage of the
        // vendor's net. Percentage is more usable in a UI, kobo is exact.
        const escrowKobo = toIntegerKobo(vendorOrder.netAmount);
        let requested;

        if (refundAmount != null) {
            // Accept naira or kobo; the UI sends naira.
            requested = nairaToKobo(refundAmount);
        } else if (refundPercent != null) {
            const pct = Number(refundPercent);
            if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) {
                return NextResponse.json(
                    { success: false, message: "refundPercent must be between 0 and 100" },
                    { status: 400 }
                );
            }
            requested = Math.floor((escrowKobo * pct) / 100);
        } else {
            return NextResponse.json(
                { success: false, message: "partial resolution needs refundAmount or refundPercent" },
                { status: 400 }
            );
        }

        if (requested <= 0 || requested >= escrowKobo) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Refund must be between 0 and the escrowed amount (${escrowKobo} kobo)`,
                },
                { status: 400 }
            );
        }

        const split = await resolveDisputePartially(vendorOrder, requested, auth.user.id, note);
        const updated = await VendorOrder.findById(vendorOrder._id).lean();

        // Book only the customer's half. The vendor's half is posted by
        // requestRelease below, on the same path as every other payout, so the
        // escrow account drains exactly once.
        await postPartialRefund({
            vendorOrder: vendorOrder.toObject(),
            refundKobo: split.refundKobo,
            orderId: order._id,
            reference: String(vendorOrder._id),
            createdBy: `admin:${auth.user.id}`,
        });

        // Return the customer's share through Paystack.
        const { ok, data } = await refundFromPaystack(order, split.refundKobo, note);
        if (!ok) {
            return NextResponse.json(
                { success: false, message: data?.message || "Paystack rejected the partial refund", error: data },
                { status: 400 }
            );
        }

        // Queue the vendor's remaining share for payout. The vendor order's
        // netAmount was already reduced, so requestRelease moves the right
        // amount.
        await requestRelease(vendorOrder._id, {
            createdBy: `admin:${auth.user.id}`,
            reason: note || "partial dispute split",
        });

        return NextResponse.json({
            success: true,
            message: `Split: ${split.refundKobo} kobo refunded, ${split.releaseKobo} kobo queued for the vendor`,
            split: {
                refundKobo: split.refundKobo,
                refundNaira: split.refundKobo / 100,
                releaseKobo: split.releaseKobo,
                releaseNaira: split.releaseKobo / 100,
            },
            vendorOrder: updated,
        });
    } catch (error) {
        console.error("RESOLVE DISPUTE ERROR:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Server error resolving dispute" },
            { status: 500 }
        );
    }
}
