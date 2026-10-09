"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/lib/axios";
import { useAuthStore } from "@/app/store/authStore";
import { useCartStore } from "@/app/store/cartStore";
import { messageError } from "@/app/lib/messaging/client";
import { MessagingError } from "@/components/messaging/MessagingUI";
import "./buyer.css";

export const buyerPages = [
  ["orders", "Orders", "imgUiBox"],
  ["inbox", "Inbox", "imgUiInbox02"],
  ["reviews", "Pending Reviews", "imgUiHourglass03"],
  ["quote", "Request Updated Quote", "imgUiAnnotationPlus"],
  ["wishlist", "Wishlist", "imgUiHeartRounded"],
  ["followed", "Followed Sellers", "imgGroup3"],
  ["recently-viewed", "Recently Viewed", "imgUiClockFastForward"],
  ["tracking", "Track Shipment"],
  ["issue", "Report an issue"],
  ["newsletter", "Newsletter Preference"],
  ["cookies", "Cookies Preference"],
];

export const buyerHref = (section) =>
  section === "inbox" ? "/dashboard/messages" : `/dashboard/buyer/${section}`;
export const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value || 0);
export const sellingPrice = (product) =>
  product.discountPrice > 0
    ? product.price - product.discountPrice
    : product.price * (1 - (product.discountPercentage || 0) / 100);

export function DesignIcon({ name, size = 18 }) {
  return (
    <span
      className="buyer-design-icon"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src={`/images/buyer/${name}.${name === "imgGrid" ? "png" : "svg"}`}
        fill
        sizes={`${size}px`}
        alt=""
        style={{ objectFit: "contain" }}
      />
    </span>
  );
}

export function ProductCard({ product }) {
  return (
    <Link
      className="buyer-product"
      href={`/dashboard/products/${encodeURIComponent(product.slug)}`}
    >
      <div className="buyer-product-photo">
        {product.productImages?.[0] ? (
          <Image
            src={product.productImages[0]}
            alt={product.productName}
            fill
            sizes="(max-width: 700px) 45vw, 30vw"
            unoptimized
          />
        ) : (
          <DesignIcon name="imgFiRsBox" size={36} />
        )}
      </div>
      <h3>{product.productName}</h3>
      <strong>{money(sellingPrice(product))}</strong>
      {(product.discountPrice > 0 || product.discountPercentage > 0) && (
        <del>{money(product.price)}</del>
      )}
    </Link>
  );
}

export default function BuyerShell({ section, children }) {
  const user = useAuthStore((state) => state.user);
  const cartCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [recommendationError, setRecommendationError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [policy, setPolicy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get("/buyer/recommendations", {
        baseURL: "/api",
        signal: controller.signal,
      })
      .then(({ data }) => {
        setProducts(data.products);
        setRecommendationError("");
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setRecommendationError(messageError(error));
      });
    return () => controller.abort();
  }, [attempt]);

  async function logout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await api.post("/auth/logout", {}, { baseURL: "/api" });
      useAuthStore.getState().clearAuth();
      router.replace("/auth/sign-in");
    } catch (error) {
      setLogoutError(messageError(error));
      setLoggingOut(false);
    }
  }

  return (
    <div className="buyer-app messaging-surface">
      <a href="#buyer-content" className="buyer-skip">
        Skip to account content
      </a>
      <header className="buyer-header">
        <div className="buyer-topline buyer-container">
          {[
            ["Leather Goods", "imgShield"],
            ["Bags", "imgBriefcase"],
            ["Shoes", "imgTag"],
            ["Belts", "imgSettings"],
            ["Accessories", "imgStar"],
          ].map(([label, icon]) => (
            <Link
              key={label}
              href={`/dashboard/products?search=${encodeURIComponent(label)}`}
            >
              <DesignIcon name={icon} size={14} />
              {label}
            </Link>
          ))}
        </div>
        <div className="buyer-mainnav buyer-container">
          <button
            type="button"
            aria-label="Toggle account navigation"
            aria-expanded={menuOpen}
            aria-controls="buyer-navigation"
            onClick={() => setMenuOpen((value) => !value)}
          >
            <DesignIcon name="imgMenu" size={22} />
          </button>
          <Link href="/" className="buyer-brand">
            <Image
              src="/images/buyer/imgLogo12.png"
              width={46}
              height={37}
              alt=""
            />
            <span>
              Aba<b>Craft</b>
            </span>
          </Link>
          <form className="buyer-search" action="/dashboard/products">
            <DesignIcon name="imgSearch" size={16} />
            <input
              aria-label="Search products"
              name="search"
              placeholder="Search products, vendors..."
            />
          </form>
          <Link className="buyer-greeting" href="/dashboard/profile">
            <DesignIcon name="imgUser" />
            Hi, {user?.fullName?.split(" ")[0] || "there"}
            <DesignIcon name="imgChevronDown" size={12} />
          </Link>
          <Link href={buyerHref("issue")} className="buyer-help">
            <DesignIcon name="imgInfo" />
            Help
          </Link>
          <Link
            href="/cart"
            className="buyer-cart"
            aria-label={`Cart${cartCount ? `, ${cartCount} items` : ""}`}
          >
            <DesignIcon name="imgShoppingCart" size={24} />
            <span>Cart {cartCount > 0 && `(${cartCount})`}</span>
          </Link>
        </div>
      </header>
      <nav aria-label="Product categories" className="buyer-categories">
        {[
          ["Categories", "imgGrid", ""],
          ["Hand Bags", "imgIcon", "bag"],
          ["Male & Female Shoes", "imgVector", "shoes"],
          ["Trendy Wallet", "imgUiWallet04", "wallet"],
          ["Male Belt", "imgGroup", "belt"],
          ["Accessories", "imgUiTag02", "accessories"],
          ["Unisex Sandals", "imgGroup1", "sandals"],
          ["Comfy Backpacks", "imgGroup2", "backpack"],
          ["Key Holder", "imgUiKey01", "key holder"],
          ["Wrist Band", "imgUiWatchCircle", "wrist band"],
          ["Pouch", "imgUiPhone02", "pouch"],
        ].map(([label, icon, search]) => (
          <Link
            key={label}
            href={`/dashboard/products?search=${encodeURIComponent(search)}`}
          >
            <DesignIcon name={icon} size={24} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="buyer-container buyer-columns">
        <aside
          id="buyer-navigation"
          className={`buyer-sidebar ${menuOpen ? "is-open" : ""}`}
        >
          <Link className="buyer-account-title" href="/dashboard/profile">
            <DesignIcon name="imgGroup3" />
            My Aba Craft Account
          </Link>
          <nav aria-label="Buyer account">
            {buyerPages.map(([key, label, icon]) => (
              <Link
                key={key}
                href={buyerHref(key)}
                aria-current={section === key ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {icon && <DesignIcon name={icon} size={16} />}
                {label}
              </Link>
            ))}
          </nav>
          <button
            className="buyer-logout"
            type="button"
            onClick={logout}
            disabled={loggingOut}
          >
            {loggingOut ? "Signing out…" : "Logout"}
          </button>
          {logoutError && (
            <p role="alert" className="buyer-error">
              {logoutError}
            </p>
          )}
        </aside>
        <main id="buyer-content" className="buyer-panel" tabIndex={-1}>
          {children}
        </main>
      </div>
      <section
        aria-labelledby="recommendations-heading"
        className="buyer-container buyer-recommendations"
      >
        <h2 id="recommendations-heading">Recommended for you</h2>
        {recommendationError ? (
          <MessagingError
            message={recommendationError}
            onRetry={() => setAttempt((value) => value + 1)}
          />
        ) : products.length ? (
          <div>
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <p className="buyer-empty-note">
            New finds will appear here when products are available.
          </p>
        )}
      </section>
      <footer className="buyer-footer">
        <div className="buyer-container">
          <div className="buyer-footer-top">
            <div>
              <Link href="/" className="buyer-brand">
                Aba<b>Craft</b>
              </Link>
              <p>
                The premium e-commerce gateway connecting skilled Aba leather
                creators with quality-conscious consumers nationwide and
                globally.
              </p>
            </div>
            <div>
              <h2>SUPPORT</h2>
              <Link href={buyerHref("inbox")}>Help Center</Link>
              <Link href={buyerHref("issue")}>Contact Us</Link>
              <Link href={buyerHref("orders")}>Orders & Payments</Link>
            </div>
            <div>
              <h2>YOUR PRIVACY</h2>
              <button onClick={() => setPolicy(true)}>
                Privacy information
              </button>
              <Link href={buyerHref("cookies")}>Cookie preferences</Link>
              <Link href={buyerHref("newsletter")}>Newsletter preferences</Link>
            </div>
          </div>
          <div className="buyer-footer-bottom">
            <span>
              © {new Date().getFullYear()} AbaCraft. All rights reserved.
            </span>
            <span>Nigeria’s Digital Artisanal Hub</span>
          </div>
        </div>
      </footer>
      {policy && (
        <div
          className="buyer-policy"
          role="region"
          aria-label="Privacy information"
        >
          <h2>Your account preferences</h2>
          <p>
            Messages and files are shared with the other participant. Orders,
            saved products and preferences are stored with your account.
            Optional cookie choices default to off. Newsletter consent can be
            withdrawn at any time.
          </p>
          <button
            className="buyer-button"
            autoFocus
            onClick={() => setPolicy(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
