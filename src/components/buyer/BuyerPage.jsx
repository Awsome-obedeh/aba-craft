"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/app/lib/axios";
import { useAuthStore } from "@/app/store/authStore";
import { useCartStore } from "@/app/store/cartStore";
import { messageError, messagingApi } from "@/app/lib/messaging/client";
import {
  MessagingError,
  MessagingSkeleton,
} from "@/components/messaging/MessagingUI";
import BuyerShell, {
  buyerHref,
  buyerPages,
  DesignIcon,
  money,
  ProductCard,
  sellingPrice,
} from "./BuyerShell";
import BuyerRequestForm from "./BuyerRequestForm";

const config = { baseURL: "/api" };
export const dateLabel = (date) =>
  new Date(date).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function BuyerEmpty({ title, children }) {
  return (
    <div className="buyer-empty">
      <DesignIcon name="imgUiAnnotationPlus" size={36} />
      <h2>{title}</h2>
      <p>{children}</p>
      <Link className="buyer-button" href="/dashboard/products">
        Continue Shopping
      </Link>
    </div>
  );
}

export default function BuyerPage({ section }) {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("order");
  const queryString = params.toString();
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!user) {
      router.replace(
        `/auth/sign-in?redirect=${encodeURIComponent(buyerHref(section) + (queryString ? `?${queryString}` : ""))}`,
      );
      return;
    }
    if (user.role !== "customer") return;
    const controller = new AbortController();
    api
      .get(`/buyer/${section}`, {
        ...config,
        params: { page, ...(orderId ? { order: orderId } : {}) },
        signal: controller.signal,
      })
      .then(({ data }) => setState({ loading: false, data, error: "" }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setState((previous) => ({
            ...previous,
            loading: false,
            error: messageError(error),
          }));
      });
    return () => controller.abort();
  }, [user, section, page, orderId, attempt, router, queryString]);

  if (!user) return <MessagingSkeleton />;
  if (user.role !== "customer")
    return (
      <BuyerEmpty title="Buyer account required">
        This section is available to buyers. Your vendor messages are in your
        dashboard inbox.
      </BuyerEmpty>
    );
  const title = buyerPages.find(([key]) => key === section)?.[1] || "Account";

  return (
    <BuyerShell section={section}>
      <h1 className="buyer-panel-title">
        {title}
        {section === "wishlist" && state.data
          ? ` (${state.data.products.length})`
          : ""}
      </h1>
      {state.error && (
        <MessagingError message={state.error} onRetry={refresh} />
      )}
      {state.loading ? (
        <MessagingSkeleton />
      ) : (
        state.data && (
          <>
            {["orders", "tracking", "reviews", "quote", "issue"].includes(
              section,
            ) ? (
              <OrderScreens
                section={section}
                data={state.data}
                refresh={refresh}
              />
            ) : ["cookies", "newsletter"].includes(section) ? (
              <Preferences
                key={`${section}:${attempt}`}
                section={section}
                data={state.data}
              />
            ) : (
              <Collections
                section={section}
                data={state.data}
                refresh={refresh}
              />
            )}
            {(state.data.hasMore || page > 1) && (
              <div className="buyer-body buyer-actions">
                <button
                  className="buyer-button secondary"
                  disabled={page === 1}
                  onClick={() => {
                    setState((previous) => ({ ...previous, loading: true }));
                    setPage((value) => value - 1);
                  }}
                >
                  Previous
                </button>
                <span>Page {page}</span>
                <button
                  className="buyer-button secondary"
                  disabled={!state.data.hasMore}
                  onClick={() => {
                    setState((previous) => ({ ...previous, loading: true }));
                    setPage((value) => value + 1);
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )
      )}
    </BuyerShell>
  );
}

function ProductImage({ src, name }) {
  return (
    <div className="buyer-row-photo">
      {src ? (
        <Image src={src} alt={name} fill sizes="144px" unoptimized />
      ) : (
        <DesignIcon name="imgFiRsBox" size={36} />
      )}
    </div>
  );
}

function Collections({ section, data, refresh }) {
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const addItem = useCartStore((state) => state.addItem);
  async function remove(id) {
    setBusy(id);
    setError("");
    try {
      await api.patch(`/buyer/${section}`, { id, remove: true }, config);
      refresh();
      setFeedback("Removed from your account.");
    } catch (error) {
      setError(messageError(error));
    } finally {
      setBusy("");
    }
  }
  if (!(data.products?.length || data.sellers?.length))
    return (
      <BuyerEmpty
        title={
          section === "wishlist"
            ? "Save the things you love"
            : section === "followed"
              ? "Keep your favourite makers close"
              : "Your recent finds will appear here"
        }
      >
        {section === "followed"
          ? "Follow a seller from a product page to find them here."
          : section === "wishlist"
            ? "Save a product to your wishlist from its product page."
            : "Explore the collection, then return here to pick up where you left off."}
      </BuyerEmpty>
    );
  return (
    <div className="buyer-body">
      {error && (
        <p role="alert" className="buyer-error">
          {error}
        </p>
      )}
      <p role="status" className="buyer-success">
        {feedback}
      </p>
      {section === "followed" ? (
        data.sellers.map((seller) => (
          <article className="buyer-seller" key={seller._id}>
            <header>
              <div>
                <h2>{seller.businessName}</h2>
                {seller.verificationStatus === "verified" && (
                  <span className="buyer-badge">Verified</span>
                )}
              </div>
              <button
                disabled={busy === seller._id}
                className="buyer-text-button"
                onClick={() => remove(seller._id)}
              >
                Unfollow
              </button>
            </header>
            <p className="buyer-body">
              {seller.businessDescription ||
                "Discover this seller’s latest handmade products."}
            </p>
            <div className="buyer-grid">
              {seller.products.map((product) => (
                <ProductCard product={product} key={product._id} />
              ))}
            </div>
            {!seller.products.length && (
              <p className="buyer-body">No products are currently available.</p>
            )}
          </article>
        ))
      ) : section === "recently-viewed" ? (
        <>
          <button
            className="buyer-text-button"
            onClick={async () => {
              setBusy("all");
              try {
                for (const product of data.products)
                  await api.patch(
                    "/buyer/recently-viewed",
                    { id: product._id, remove: true },
                    config,
                  );
                refresh();
              } catch (error) {
                setError(messageError(error));
              } finally {
                setBusy("");
              }
            }}
            disabled={Boolean(busy)}
          >
            Clear recently viewed
          </button>
          <div className="buyer-grid">
            {data.products.map((product) => (
              <ProductCard product={product} key={product._id} />
            ))}
          </div>
        </>
      ) : (
        <div className="buyer-list">
          {data.products.map((product) => (
            <article className="buyer-row" key={product._id}>
              <ProductImage
                src={product.productImages[0]}
                name={product.productName}
              />
              <div className="buyer-row-info">
                <h2>
                  <Link href={`/dashboard/products/${product.slug}`}>
                    {product.productName}
                  </Link>
                </h2>
                <p>{product.brand}</p>
                <strong>{money(sellingPrice(product))}</strong>
                <small>
                  {product.quantity > 0 ? "In stock" : "Out of stock"}
                </small>
                <div className="buyer-actions">
                  <button
                    className="buyer-text-button"
                    disabled={busy === product._id}
                    onClick={() => remove(product._id)}
                  >
                    Remove
                  </button>
                  <button
                    className="buyer-button"
                    disabled={product.quantity < 1}
                    onClick={() => {
                      addItem(product);
                      setFeedback(`${product.productName} added to your cart.`);
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Preferences({ section, data }) {
  const [newsletter, setNewsletter] = useState(data.newsletter);
  const [consent, setConsent] = useState(data.newsletter);
  const [cookies, setCookies] = useState(data.cookies);
  const [saved, setSaved] = useState(data);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function save(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await api.patch(
        `/buyer/${section}`,
        section === "newsletter" ? { newsletter, consent } : cookies,
        config,
      );
      if (section === "cookies")
        window.dispatchEvent(
          new CustomEvent("abacraft:cookie-preferences", { detail: cookies }),
        );
      setNotice("Your preferences have been saved.");
      setSaved({ newsletter, cookies });
    } catch (error) {
      setError(messageError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="buyer-body buyer-form">
      {section === "newsletter" ? (
        <fieldset>
          <legend>Define your preferences</legend>
          <p className="buyer-subtitle">
            You can subscribe to our newsletter to get updates on our latest
            offers, deals and marketing campaigns. You can change your choice at
            any time.
          </p>
          <label>
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            I consent to AbaCraft processing my data to send me newsletters.
          </label>
          <label>
            <input
              type="radio"
              name="newsletter"
              checked={newsletter}
              onChange={() => setNewsletter(true)}
            />
            I want to receive daily newsletters
          </label>
          <label>
            <input
              type="radio"
              name="newsletter"
              checked={!newsletter}
              onChange={() => setNewsletter(false)}
            />
            I don’t want to receive daily newsletters
          </label>
          <small>
            We’ll save your choice. Newsletter delivery depends on AbaCraft’s
            mailing service.
          </small>
        </fieldset>
      ) : (
        <>
          <fieldset>
            <legend>Essential Cookies</legend>
            <p className="buyer-subtitle">
              Essential for the website to function. Enable shopping cart,
              secure checkout, and account access. Always enabled.
            </p>
          </fieldset>
          <fieldset>
            <legend>Optional Cookies</legend>
            {[
              [
                "advertising",
                "Advertising Cookies",
                "Allow relevant ads and promotional offers based on your interests.",
              ],
              [
                "analytics",
                "Analytics Cookies",
                "Help us understand how you use our website so we can improve your shopping experience.",
              ],
              [
                "personalization",
                "Personalization Cookies",
                "Remember preferences like language, currency, and favourite products for a tailored experience.",
              ],
            ].map(([key, label, description]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  role="switch"
                  checked={cookies[key]}
                  onChange={(event) =>
                    setCookies((previous) => ({
                      ...previous,
                      [key]: event.target.checked,
                    }))
                  }
                />
                {label}
                <small className="block ml-7">{description}</small>
              </label>
            ))}
          </fieldset>
          <p className="buyer-subtitle">
            Choose which optional cookies you’re comfortable with. Your choice
            is saved to your account. Optional tracking services are not enabled
            by this feature.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="buyer-error">
          {error}
        </p>
      )}
      <p role="status" className="buyer-success">
        {notice}
      </p>
      <button className="buyer-button full" disabled={busy}>
        {busy ? "Saving…" : section === "cookies" ? "Save Changes" : "SAVE"}
      </button>
      <button
        type="button"
        className="buyer-text-button"
        disabled={busy}
        onClick={() => {
          setNewsletter(saved.newsletter);
          setConsent(saved.newsletter);
          setCookies(saved.cookies);
          setError("");
          setNotice("");
        }}
      >
        Reset changes
      </button>
    </form>
  );
}

function OrderScreens({ section, data, refresh }) {
  const [cancelled, setCancelled] = useState(false);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useSearchParams();
  const lines = data.orders.flatMap((order) =>
    order.items.map((item) => ({
      order,
      item,
      key: `${order._id}:${item.product}`,
    })),
  );
  const current =
    lines.find((line) => line.key === selected) ||
    lines.find((line) => line.item.product === params.get("product")) ||
    lines[0];

  async function contact(order, item) {
    setBusy(true);
    setError("");
    try {
      const { data } = await messagingApi.post("", {
        productId: item.product,
        orderId: order._id,
      });
      router.push(`/dashboard/messages?conversation=${data.conversation.id}`);
    } catch (error) {
      setError(messageError(error));
      setBusy(false);
    }
  }
  if (!lines.length)
    return (
      <BuyerEmpty
        title={
          section === "reviews"
            ? "You have no orders waiting for feedback"
            : "No orders to show yet"
        }
      >
        {section === "reviews"
          ? "After getting your products delivered, you will be able to rate and review them. Your feedback helps other AbaCraft buyers."
          : "Your orders and supplier updates will appear here after you place an order."}
      </BuyerEmpty>
    );
  if (section === "reviews") {
    const pending = lines.filter(
      (line) =>
        !data.reviews.some(
          (review) =>
            review.orderId === line.order._id &&
            review.productId === line.item.product,
        ),
    );
    return pending.length ? (
      <div className="buyer-body buyer-list">
        {pending.map((line) => (
          <ReviewForm
            key={line.key}
            order={line.order}
            item={line.item}
            refresh={refresh}
          />
        ))}
      </div>
    ) : (
      <BuyerEmpty title="You’re all caught up">
        Thank you for sharing your experience. New delivered orders will appear
        here.
      </BuyerEmpty>
    );
  }
  if (["quote", "issue", "tracking"].includes(section))
    return (
      <div className="buyer-body">
        <label className="buyer-field">
          Select an order and product
          <select
            value={current?.key || ""}
            onChange={(event) => setSelected(event.target.value)}
          >
            {lines.map((line) => (
              <option value={line.key} key={line.key}>
                {line.item.productName} · #{line.order._id.slice(-8)}
              </option>
            ))}
          </select>
        </label>
        {section === "tracking" ? (
          <Tracking
            order={current.order}
            item={current.item}
            onContact={() => contact(current.order, current.item)}
            busy={busy}
          />
        ) : (
          <BuyerRequestForm
            key={`${section}:${current.key}`}
            section={section}
            order={current.order}
            item={current.item}
          />
        )}
        {error && (
          <p role="alert" className="buyer-error">
            {error}
          </p>
        )}
      </div>
    );
  const visible = lines.filter(
    (line) =>
      (line.order.status === "cancelled" ||
        line.order.paymentStatus === "refunded") === cancelled,
  );
  return (
    <>
      <div className="buyer-tabs" role="tablist" aria-label="Order status">
        <button
          role="tab"
          aria-selected={!cancelled}
          onClick={() => setCancelled(false)}
        >
          ONGOING / DELIVERED
        </button>
        <button
          role="tab"
          aria-selected={cancelled}
          onClick={() => setCancelled(true)}
        >
          CANCELLED / REFUNDED
        </button>
      </div>
      {error && (
        <p role="alert" className="buyer-error">
          {error}
        </p>
      )}
      <div className="buyer-body buyer-list" role="tabpanel">
        {visible.map(({ order, item, key }) => (
          <article className="buyer-row" key={key}>
            <ProductImage src={item.productImage} name={item.productName} />
            <div className="buyer-row-info">
              <h2>{item.productName}</h2>
              <p>
                {item.quantity} × {money(item.unitPrice)}
              </p>
              <small>Order #{order._id.slice(-8)}</small>
              <span className="buyer-badge">
                {order.status.replaceAll("_", " ")}
              </span>
              <small>On {dateLabel(order.createdAt)}</small>
              <details>
                <summary className="buyer-text-button">See Details</summary>
                <p>
                  Payment: {order.paymentStatus}. Order total:{" "}
                  {money(order.total)}
                </p>
                <p>
                  {order.shippingAddress.addressLine},{" "}
                  {order.shippingAddress.city}, {order.shippingAddress.state}
                </p>
                <div className="buyer-actions">
                  <Link
                    className="buyer-text-button"
                    href={`${buyerHref("tracking")}?order=${order._id}&product=${item.product}`}
                  >
                    Track shipment
                  </Link>
                  <Link
                    className="buyer-text-button"
                    href={`${buyerHref("quote")}?order=${order._id}&product=${item.product}`}
                  >
                    Request quote
                  </Link>
                  <Link
                    className="buyer-text-button"
                    href={`${buyerHref("issue")}?order=${order._id}&product=${item.product}`}
                  >
                    Report issue
                  </Link>
                  <button
                    disabled={busy}
                    className="buyer-text-button"
                    onClick={() => contact(order, item)}
                  >
                    Contact supplier
                  </button>
                </div>
              </details>
            </div>
          </article>
        ))}
        {!visible.length && <p>No orders in this category on this page.</p>}
      </div>
    </>
  );
}

function ReviewForm({ order, item, refresh }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="buyer-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
          await api.post(
            "/buyer/reviews",
            { orderId: order._id, productId: item.product, rating, text },
            config,
          );
          refresh();
        } catch (error) {
          setError(messageError(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{item.productName}</h2>
      <label className="buyer-field">
        Your rating
        <select
          value={rating}
          onChange={(event) => setRating(Number(event.target.value))}
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} {value === 1 ? "star" : "stars"}
            </option>
          ))}
        </select>
      </label>
      <label className="buyer-field">
        Your review
        <textarea
          required
          maxLength={2000}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="How was the quality, fit and experience?"
        />
      </label>
      {error && (
        <p role="alert" className="buyer-error">
          {error}
        </p>
      )}
      <button className="buyer-button" disabled={busy}>
        {busy ? "Saving…" : "Submit review"}
      </button>
    </form>
  );
}

function Tracking({ order, item, onContact, busy }) {
  const statuses = ["paid", "processing", "shipped", "delivered"];
  const stage = statuses.indexOf(order.status);
  return (
    <>
      <p className="buyer-subtitle mt-6">
        Follow your order from your vendor to your doorstep.
      </p>
      <div className="buyer-summary">
        <h3>{item.productName}</h3>
        <p>
          Order #{order._id.slice(-8)} · {item.quantity} units
        </p>
        <p>Payment: {order.paymentStatus}</p>
      </div>
      <div className="buyer-callout">
        <h3>{order.status.replaceAll("_", " ")}</h3>
        <p>
          A delivery estimate and courier tracking number have not been provided
          for this order. Contact your supplier for an update.
        </p>
      </div>
      {stage >= 0 && (
        <div className="buyer-progress">
          {["Confirmed", "Processing", "Dispatched", "Delivered"].map(
            (label, index) => (
              <span key={label} className={index <= stage ? "complete" : ""}>
                {label}
              </span>
            ),
          )}
        </div>
      )}
      <h2 className="text-lg font-bold">Shipment updates</h2>
      <ol className="buyer-timeline">
        <li>
          <strong>Current status: {order.status.replaceAll("_", " ")}</strong>
          <p>Order last updated {dateLabel(order.updatedAt)}</p>
        </li>
        <li>
          <strong>Order created</strong>
          <p>{dateLabel(order.createdAt)}</p>
        </li>
      </ol>
      {order.vendorNote && (
        <div className="buyer-summary">
          <h3>Supplier’s note</h3>
          <p>{order.vendorNote}</p>
        </div>
      )}
      <div className="buyer-summary">
        <h3>Delivery details</h3>
        <p>{order.shippingAddress.fullName}</p>
        <p>{order.shippingAddress.addressLine}</p>
        <p>
          {order.shippingAddress.city}, {order.shippingAddress.state}
        </p>
        <p>{order.shippingAddress.phone}</p>
      </div>
      <div className="buyer-actions">
        <Link
          className="buyer-button secondary"
          href={`${buyerHref("issue")}?order=${order._id}&product=${item.product}`}
        >
          Report an issue
        </Link>
        <button className="buyer-button" disabled={busy} onClick={onContact}>
          {busy ? "Opening…" : "Contact supplier"}
        </button>
      </div>
    </>
  );
}
