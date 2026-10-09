"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MessageCircle } from "lucide-react";
import { messagingApi, messageError } from "@/app/lib/messaging/client";

export default function ContactVendorButton({ productId }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function contactVendor() {
    if (pending) return;
    setPending(true);
    setError("");

    try {
      const { data } = await messagingApi.post("", { productId });
      router.push(`/dashboard/messages?conversation=${data.conversation.id}`);
    } catch (error) {
      setError(messageError(error));
      setPending(false);
    }
  }

  return (
    <div className="md:col-span-2">
      <button
        type="button"
        disabled={pending}
        onClick={contactVendor}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-forest/20 bg-cream px-5 py-3 font-semibold text-forest transition hover:bg-forest hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-clay disabled:opacity-60"
      >
        {pending ? (
          <LoaderCircle size={18} className="animate-spin" />
        ) : (
          <MessageCircle size={18} />
        )}
        {pending ? "Opening conversation…" : "Contact vendor"}
      </button>
      <p className="mt-2 text-center text-xs leading-5 text-muted">
        Ask about materials, sizing, custom orders or delivery.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-clay-dark">
          {error} Select Contact vendor to retry.
        </p>
      )}
    </div>
  );
}
