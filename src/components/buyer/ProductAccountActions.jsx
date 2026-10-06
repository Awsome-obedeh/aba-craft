"use client";

import { useEffect, useState } from "react";
import { Heart, UserPlus } from "lucide-react";
import { api } from "@/app/lib/axios";
import { messageError } from "@/app/lib/messaging/client";

export default function ProductAccountActions({ product }) {
  const [saved, setSaved] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const productId = product._id;
  const businessId = product.businessId?._id || product.businessId;

  useEffect(() => {
    const controller = new AbortController();
    const config = { baseURL: "/api", signal: controller.signal };
    api
      .patch("/buyer/recently-viewed", { id: productId }, config)
      .catch(() => {});
    Promise.all([
      api.get("/buyer/wishlist", config),
      api.get("/buyer/followed", config),
    ])
      .then(([wishlist, sellers]) => {
        setSaved(wishlist.data.products.some((item) => item._id === productId));
        setFollowed(
          sellers.data.sellers.some((item) => item._id === businessId),
        );
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(messageError(error));
      });
    return () => controller.abort();
  }, [productId, businessId]);

  async function toggle(section, id, current, setter) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.patch(
        `/buyer/${section}`,
        { id, remove: current },
        { baseURL: "/api" },
      );
      setter(!current);
      setNotice(
        current
          ? "Removed from your account."
          : section === "wishlist"
            ? "Saved to your wishlist."
            : "You’re following this seller.",
      );
    } catch (error) {
      setError(messageError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        <button
          type="button"
          disabled={busy}
          aria-pressed={saved}
          onClick={() => toggle("wishlist", productId, saved, setSaved)}
          className="flex items-center gap-2 text-sm text-forest underline"
        >
          <Heart size={17} fill={saved ? "currentColor" : "none"} />
          {saved ? "Saved to wishlist" : "Save to wishlist"}
        </button>
        {businessId && (
          <button
            type="button"
            disabled={busy}
            aria-pressed={followed}
            onClick={() =>
              toggle("followed", businessId, followed, setFollowed)
            }
            className="flex items-center gap-2 text-sm text-forest underline"
          >
            <UserPlus size={17} />
            {followed ? "Following seller" : "Follow seller"}
          </button>
        )}
      </div>
      <p role="status" className="text-sm text-forest">
        {notice}
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
