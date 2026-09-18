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

    const data = await response.json();

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

    return crypto.timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(signature, "hex")
    );
};
