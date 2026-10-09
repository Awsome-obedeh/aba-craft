"use client";

import { useEffect, useState } from "react";
import { api } from "@/app/lib/axios";
import { messageError } from "@/app/lib/messaging/client";

export default function ProductReviews({ productId }) {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({
    reviews: [],
    hasMore: false,
    error: "",
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api
      .get(`/reviews/${productId}`, {
        baseURL: "/api",
        params: { page },
        signal: controller.signal,
      })
      .then(({ data }) => setState({ ...data, error: "" }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setState((previous) => ({ ...previous, error: messageError(error) }));
      });
    return () => controller.abort();
  }, [productId, page, attempt]);
  return (
    <section className="mt-10 space-y-4 border-t border-brandBorder pt-6">
      <h2 className="text-xl font-semibold">Verified purchase reviews</h2>
      {state.error ? (
        <p role="alert">
          {state.error}{" "}
          <button
            className="underline"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry
          </button>
        </p>
      ) : !state.reviews.length ? (
        <p className="text-sm text-muted">No reviews yet.</p>
      ) : (
        state.reviews.map((review) => (
          <article
            key={review._id}
            className="rounded-lg border border-brandBorder p-4"
          >
            <p className="text-sm font-semibold">
              {review.rating}/5 · Verified purchase
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">
              {review.text}
            </p>
            <time
              className="mt-2 block text-xs text-muted"
              dateTime={review.createdAt}
            >
              {new Date(review.createdAt).toLocaleDateString("en-NG")}
            </time>
          </article>
        ))
      )}
      {(page > 1 || state.hasMore) && (
        <div className="flex gap-4">
          <button
            disabled={page === 1}
            className="underline disabled:opacity-40"
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </button>
          <button
            disabled={!state.hasMore}
            className="underline disabled:opacity-40"
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
