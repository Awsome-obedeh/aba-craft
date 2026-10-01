import crypto from "crypto";

export const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
export const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
export const PAYSTACK_BASE_URL = "https://api.paystack.co";
export const PAYSTACK_CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL || "";

export const paystackRequest = async (path, options = {}) => {
    const url = `${PAYSTACK_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            ...options.headers,
        },
    });

    // Paystack can return an HTML error page or an empty body on gateway
    // errors. Calling .json() unconditionally would throw and mask the real
    // status, so fall back to the raw text.
    const text = await response.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { message: text?.slice(0, 500) || "Unparseable response from Paystack" };
    }

    return { ok: response.ok, status: response.status, data };
};

export const toKobo = (amountInNaira) => Math.round(Number(amountInNaira) * 100);

export const fromKobo = (amountInKobo) => Number(amountInKobo) / 100;

export const verifyWebhookSignature = (rawBody, signature) => {
    if (!signature || !PAYSTACK_SECRET_KEY) return false;

    const expected = crypto
        .createHmac("sha512", PAYSTACK_SECRET_KEY)
        .update(rawBody, "utf8")
        .digest("hex");

    // timingSafeEqual throws if the two buffers differ in length, so a
    // malformed or truncated signature would 500 the route instead of being
    // rejected. Compare lengths first, then compare in constant time.
    const expectedBuf = Buffer.from(expected, "hex");
    const signatureBuf = Buffer.from(String(signature), "hex");
    if (expectedBuf.length !== signatureBuf.length) return false;

    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
};

// --- Escrow payouts -------------------------------------------------------
// Paystack has no true escrow, so "holding" vendor money means keeping it in
// our own Paystack balance and only pushing it out via a transfer once the
// release conditions are met. These wrappers are the only place that happens.

// Create a transfer recipient from a vendor's bank details.
export const createTransferRecipient = async ({ type, name, accountNumber, bankCode }) => {
    return paystackRequest("/transfer/recipient", {
        method: "POST",
        body: JSON.stringify({
            type: type || "nuban",
            name,
            account_number: accountNumber,
            bank_code: bankCode,
            currency: "NGN",
        }),
    });
};

// Confirm the account name on file matches what the vendor gave us, so we do
// not pay a typo'd account number.
export const verifyTransferRecipient = async (recipientCode) => {
    return paystackRequest(`/transferrecipient/verify/${encodeURIComponent(recipientCode)}`, {
        method: "GET",
    });
};

// Send money to a recipient. Amount is in kobo, matching our ledger.
export const initiateTransfer = async ({ amount, recipientCode, reference, reason }) => {
    return paystackRequest("/transfer", {
        method: "POST",
        body: JSON.stringify({
            source: "balance",
            amount, // kobo
            recipient: recipientCode,
            reference,
            reason: reason || "Vendor settlement",
        }),
    });
};

// Cancel a transfer we have not yet pushed through. Used when a dispute is
// opened after a payout was queued but not yet sent.
export const cancelTransfer = async (transferCodeOrReference) => {
    return paystackRequest("/transfer/cancel", {
        method: "POST",
        body: JSON.stringify({ transfer_code: transferCodeOrReference }),
    });
};
