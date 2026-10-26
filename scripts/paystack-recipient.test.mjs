import test from "node:test";
import assert from "node:assert/strict";
import { getTransferRecipientAccountName } from "../src/app/lib/paystack.js";

test("reads account name from Paystack recipient details response", () => {
    assert.equal(
        getTransferRecipientAccountName({
            ok: true,
            data: {
                status: true,
                message: "Recipient retrieved",
                data: { details: { account_name: "Aba Vendor" } },
            },
        }),
        "Aba Vendor"
    );
});

test("supports top-level account name response and trims whitespace", () => {
    assert.equal(
        getTransferRecipientAccountName({ data: { account_name: "  Aba Vendor  " } }),
        "Aba Vendor"
    );
});

test("returns an empty name when Paystack does not provide one", () => {
    assert.equal(
        getTransferRecipientAccountName({ data: { status: true, message: "Recipient retrieved", data: {} } }),
        ""
    );
});
