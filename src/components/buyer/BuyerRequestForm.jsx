"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/app/lib/axios";
import {
  messageError,
  messagingApi,
  notifyInbox,
} from "@/app/lib/messaging/client";
import { AttachmentPicker } from "@/components/messaging/Attachments";
import { buyerHref, money } from "./BuyerShell";

export default function BuyerRequestForm({ section, order, item }) {
  const quote = section === "quote";
  const initial = {
    buyerName: order.shippingAddress.fullName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    leadTime: "",
    notes: "",
    resolution: "documentation",
  };
  const [form, setForm] = useState(initial);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const clientId = useRef(null);
  const conversationId = useRef(null);

  function change(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
    clientId.current = null;
    setError("");
  }
  async function conversation() {
    if (!conversationId.current) {
      const { data } = await messagingApi.post("", {
        orderId: order._id,
        productId: item.product,
      });
      conversationId.current = data.conversation.id;
    }
    return conversationId.current;
  }
  async function submit(event) {
    event.preventDefault();
    if (busy || uploading) return;
    setBusy(true);
    setError("");
    clientId.current ||= crypto.randomUUID();
    try {
      const { data } = await api.post(
        `/buyer/${section}`,
        {
          ...form,
          orderId: order._id,
          productId: item.product,
          clientId: clientId.current,
          attachmentIds: files.map((file) => file.id),
        },
        { baseURL: "/api" },
      );
      setSuccess(data);
      notifyInbox(data.conversationId);
    } catch (error) {
      setError(messageError(error));
    } finally {
      setBusy(false);
    }
  }
  if (success)
    return (
      <div className="buyer-callout" role="status">
        <h2>{quote ? "Quote request sent" : "Issue report sent"}</h2>
        <p>{success.message}</p>
        <Link
          className="buyer-button mt-5"
          href={`/dashboard/messages?conversation=${success.conversationId}`}
        >
          Open Inbox
        </Link>
      </div>
    );

  return (
    <>
      <p className="buyer-subtitle mt-6">
        {quote
          ? "Ask your supplier for revised pricing on a repeat order."
          : "Tell us what went wrong so your supplier can help resolve it."}
      </p>
      <div className="buyer-callout">
        <h3>
          {quote
            ? "A new quote, not a change to your current order"
            : "Let’s resolve this together"}
        </h3>
        <p>
          {quote
            ? "Request new pricing or terms for a repeat order. Your current order and payment remain unchanged."
            : "Your report goes to the supplier in your Inbox. Include the details and evidence they need to understand the issue. A report does not automatically change your payment or approve a refund."}
        </p>
      </div>
      <div className="buyer-summary">
        <h3>{quote ? "Repeat-order brief" : "Issue summary"}</h3>
        <p>
          {item.productName} · {item.quantity} units
        </p>
        <p>
          Order #{order._id.slice(-8)} · {order.status.replaceAll("_", " ")}
        </p>
        <p>Previous unit price: {money(item.unitPrice)}</p>
      </div>
      <form className="buyer-form" onSubmit={submit}>
        <h2 className="text-lg font-bold">
          {quote ? "What would you like to update?" : "Tell us about the issue"}
        </h2>
        <div className="buyer-form-grid">
          {quote ? (
            <label className="buyer-field">
              Unit Price (₦) *
              <input
                type="number"
                required
                min="0.01"
                max="100000000"
                step="0.01"
                value={form.unitPrice}
                onChange={(event) => change("unitPrice", event.target.value)}
              />
            </label>
          ) : (
            <label className="buyer-field">
              Buyer Name *
              <input
                required
                maxLength={100}
                value={form.buyerName}
                onChange={(event) => change("buyerName", event.target.value)}
              />
            </label>
          )}
          {!quote && (
            <label className="buyer-field">
              Product Name
              <input value={item.productName} readOnly />
            </label>
          )}
          <label className="buyer-field">
            Quantity (Units) *
            <input
              type="number"
              required
              min="1"
              max={quote ? 100000 : item.quantity}
              step="1"
              value={form.quantity}
              onChange={(event) => change("quantity", event.target.value)}
            />
          </label>
          {quote && (
            <>
              <label className="buyer-field">
                Calculated Gross (₦)
                <input
                  readOnly
                  value={money(Number(form.unitPrice) * Number(form.quantity))}
                />
              </label>
              <label className="buyer-field">
                Production lead time *
                <input
                  required
                  maxLength={80}
                  value={form.leadTime}
                  onChange={(event) => change("leadTime", event.target.value)}
                  placeholder="e.g. 2 weeks"
                />
              </label>
            </>
          )}
        </div>
        <label className="buyer-field">
          {quote ? "Additional terms / notes (Optional)" : "Additional notes *"}
          <textarea
            required={!quote}
            maxLength={1600}
            value={form.notes}
            onChange={(event) => change("notes", event.target.value)}
            placeholder={
              quote
                ? "Include changes to sizes, packaging, delivery or other terms."
                : "Describe what happened and when you noticed the issue."
            }
          />
          <small>
            {form.notes.trim().split(/\s+/).filter(Boolean).length} / 300 words
            · {form.notes.length} / 1,600 characters
          </small>
        </label>
        {!quote && (
          <fieldset>
            <legend className="mb-3 font-semibold">
              Preferred resolution *
            </legend>
            {[
              ["documentation", "Provide the missing documentation"],
              ["replacement", "Arrange a replacement"],
              ["refund", "Request a refund"],
            ].map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="resolution"
                  checked={form.resolution === value}
                  onChange={() => change("resolution", value)}
                />
                {label}
              </label>
            ))}
          </fieldset>
        )}
        <div>
          <h3 className="mb-3 font-semibold">
            {quote
              ? "Attachments (Optional)"
              : "Supporting evidence (Optional)"}
          </h3>
          <AttachmentPicker
            getConversationId={conversation}
            files={files}
            onChange={(value) => {
              setFiles(value);
              clientId.current = null;
            }}
            onBusy={setUploading}
            disabled={busy}
          />
        </div>
        {!quote && (
          <p className="buyer-callout">
            Make sure the information is accurate. Do not share passwords,
            payment credentials or unrelated personal information.
          </p>
        )}
        {error && (
          <p role="alert" className="buyer-error">
            {error}
          </p>
        )}
        <div className="buyer-actions">
          <Link className="buyer-button secondary" href={buyerHref("orders")}>
            Cancel
          </Link>
          <button
            type="button"
            className="buyer-text-button"
            disabled={busy || uploading}
            onClick={() => {
              setForm(initial);
              setFiles([]);
              setError("");
              clientId.current = null;
            }}
          >
            Reset
          </button>
          <button className="buyer-button" disabled={busy || uploading}>
            {busy ? "Sending…" : quote ? "Send quote request" : "Submit report"}
          </button>
        </div>
        <p className="buyer-subtitle">
          Your supplier’s reply will appear in your Inbox.{" "}
          {quote && "No payment is required to request a quote."}
        </p>
      </form>
    </>
  );
}
