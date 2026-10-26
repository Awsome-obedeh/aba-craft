"use client";

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronDown, CircleHelp, Heart, Home, MessageSquare, Package, Search, Share2, ShieldCheck, ShoppingCart, Star, Truck, UserRound } from "lucide-react";
import { api } from "@/app/lib/axios";
import { useAuthStore } from "@/app/store/authStore";
import { useCartStore } from "@/app/store/cartStore";
import { marketplacePrice } from "@/app/lib/marketplace";
import MarketplaceSearch from "./MarketplaceSearch";
import header from "@/app/market-place/marketplace.module.css";
import styles from "./product-detail.module.css";

const money = (amount) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
const date = (value) => new Date(value).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" });
function Photo({ src, alt, className }) {
  // Vendor image hosts are dynamic.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={src || "/images/buyer/imgFiRsBox.svg"} alt={alt} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/images/buyer/imgFiRsBox.svg"; }} />;
}
function Stars({ rating, count }) {
  return <span className={styles.stars} aria-label={`${rating.toFixed(1)} out of 5${count !== undefined ? ` from ${count} ratings` : ""}`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={13} fill={index < Math.round(rating) ? "currentColor" : "none"} aria-hidden="true" />)}{count !== undefined && <span>({count} ratings)</span>}</span>;
}

export default function MarketplaceProductDetail({ slug }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const addItem = useCartStore((state) => state.addItem);
  const cart = useCartStore((state) => state.items);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchButton = useRef(null);
  const [comments, setComments] = useState([]);
  const [commentsError, setCommentsError] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [commentAttempt, setCommentAttempt] = useState(0);
  const [text, setText] = useState("");
  const [textError, setTextError] = useState("");
  const [posting, setPosting] = useState(false);
  const commentRequest = useRef(null);
  const postingRef = useRef(false);
  const product = data?.product;
  const signIn = `/auth/sign-in?redirect=${encodeURIComponent(`/market-place/${slug}`)}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/marketplace/${encodeURIComponent(slug)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || "Unable to load this product."); return result; })
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        try { const previous = JSON.parse(localStorage.getItem("marketplace-recent") || "[]"); const ids = Array.isArray(previous) ? previous.filter((id) => typeof id === "string" && id !== result.product._id) : []; localStorage.setItem("marketplace-recent", JSON.stringify([result.product._id, ...ids].slice(0, 40))); } catch {}
      }).catch((error) => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    fetch("/api/marketplace", { signal: controller.signal, cache: "no-store" }).then((response) => response.json()).then((result) => { if (result.success) setCatalog(result.data); }).catch(() => {});
    if (!useAuthStore.getState().accessToken) api.post("/auth/refresh", {}, { baseURL: "/api", skipAuthRefresh: true, signal: controller.signal }).then(({ data }) => useAuthStore.getState().setAuthData(data.accessToken, data.user)).catch(() => {});
    return () => controller.abort();
  }, [slug, attempt]);
  useEffect(() => {
    if (!product?._id || user?.role !== "customer") return;
    const controller = new AbortController();
    api.patch("/buyer/recently-viewed", { id: product._id }, { baseURL: "/api", signal: controller.signal }).catch(() => {});
    api.get("/buyer/wishlist", { baseURL: "/api", signal: controller.signal }).then(({ data }) => setSaved(data.products?.some((item) => item._id === product._id) || false)).catch(() => {});
    return () => controller.abort();
  }, [product?._id, user?.id, user?.role]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/marketplace/${encodeURIComponent(slug)}/comments?page=${commentPage}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Unable to load comments.");
        return result;
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        setComments(result.comments); setHasMore(result.hasMore);
      })
      .catch((error) => { if (!controller.signal.aborted) setCommentsError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setCommentsLoading(false); });
    return () => controller.abort();
  }, [slug, commentPage, commentAttempt]);

  function retryProduct() {
    setLoading(true); setError(""); setAttempt((value) => value + 1);
  }
  function loadComments(page = commentPage) {
    setCommentsLoading(true); setCommentsError("");
    setCommentPage(page); setCommentAttempt((value) => value + 1);
  }

  function closeSearch() { setSearchOpen(false); requestAnimationFrame(() => searchButton.current?.focus({ preventScroll: true })); }
  function search(value, mode) { router.push(`/market-place?search=${encodeURIComponent(value)}&type=${mode}`); closeSearch(); }
  async function contact() {
    if (!user) { router.push(signIn); return; }
    if (user.role !== "customer") { setNotice("Sign in with a buyer account to chat with this seller."); return; }
    setBusy(true); setNotice("");
    try { const { data } = await api.post("/conversations", { productId: product._id }, { baseURL: "/api" }); router.push(`/dashboard/messages?conversation=${data.conversation.id}`); }
    catch (error) { setNotice(error.response?.data?.message || "Unable to contact the seller."); }
    finally { setBusy(false); }
  }
  async function wishlist() {
    if (!user) { router.push(signIn); return; }
    if (user.role !== "customer") { setNotice("Sign in with a buyer account to save products."); return; }
    setBusy(true);
    try { await api.patch("/buyer/wishlist", { id: product._id, remove: saved }, { baseURL: "/api" }); setSaved(!saved); }
    catch (error) { setNotice(error.response?.data?.message || "Unable to update your wishlist."); }
    finally { setBusy(false); }
  }
  async function share() {
    try { if (navigator.share) await navigator.share({ title: product.productName, url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); setNotice("Product link copied."); } }
    catch (error) { if (error.name !== "AbortError") setNotice("Copy this page's address to share the product."); }
  }
  function addToCart() {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > Math.min(99, product.quantity)) { setNotice("Choose a quantity within the available stock."); return; }
    addItem(product, quantity); setNotice(`${product.productName} added to your cart.`);
  }
  async function postComment(event) {
    event.preventDefault();
    if (postingRef.current) return;
    if (!text.trim() || text.trim().length > 2000) { setTextError("Enter a comment between 1 and 2,000 characters."); return; }
    postingRef.current = true; setPosting(true); setTextError("");
    commentRequest.current ||= crypto.randomUUID();
    try {
      await api.post(`/marketplace/${encodeURIComponent(slug)}/comments`, { text: text.trim(), clientId: commentRequest.current }, { baseURL: "/api" });
      setText(""); commentRequest.current = null; loadComments(1); setNotice("Your comment has been posted.");
    } catch (error) { setTextError(error.response?.data?.message || "Unable to post your comment. Please try again."); }
    finally { postingRef.current = false; setPosting(false); }
  }
  const price = product ? marketplacePrice(product) : null;
  const sameBrand = product?.brand ? catalog.filter((item) => item._id !== product._id && item.brand.toLowerCase() === product.brand.toLowerCase()).slice(0, 6) : [];
  const highlights = catalog.filter((item) => item._id !== product?._id && item.featured).slice(0, 6);

  return <div className={styles.page} inert={searchOpen}>
    {searchOpen && <MarketplaceSearch key={user?.id || "guest"} products={catalog} query={query} onQuery={setQuery} mode="all" onSearch={search} onClose={closeSearch} onVisit={() => {}} userId={user?.id} loading={false} error="" />}
    <div className={styles.wrap}>
      <header className={header.header}><div className={header.top}><Link href="/market-place" className={header.logo}><BrandLogo /></Link><form className={header.search} role="search" onSubmit={(event) => { event.preventDefault(); setSearchOpen(true); }}><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setSearchOpen(true)} placeholder="Search products, brands and categories" aria-label="Search products, brands and categories" aria-haspopup="dialog" /><button ref={searchButton} type="submit" aria-haspopup="dialog" aria-expanded={searchOpen} aria-controls={searchOpen ? "market-search-popup" : undefined}>Search</button></form><nav className={header.actions} aria-label="Account"><Link href={user ? "/dashboard/profile" : signIn}><UserRound size={15} />{user ? `Hi, ${user.fullName?.split(" ")[0] || user.email?.split("@")[0] || "Buyer"}` : "Sign in"}<ChevronDown size={12} /></Link><button type="button" aria-expanded={help} onClick={() => setHelp(!help)}><CircleHelp size={15} /> Help</button><Link href="/cart"><ShoppingCart size={17} /> Cart{cart.length > 0 && ` (${cart.reduce((sum, item) => sum + item.quantity, 0)})`}</Link></nav></div>{help && <p className={header.help}>Use Chat Now to discuss product options, delivery and returns with the seller. Review your cart before checkout.</p>}</header>
      <div className={styles.back}><Link href="/market-place"><ArrowLeft size={20} /><span>Search on AbaCraft</span></Link><Link href="/cart" aria-label="Your cart"><ShoppingCart size={18} /></Link></div>
      <main>
        {loading ? <p className={styles.loading} role="status">Loading product...</p> : error ? <section className={styles.panel}><h1>Product unavailable</h1><p role="alert" className={styles.error}>{error}</p><button className={`${styles.button} mt-5`} onClick={retryProduct}>Try again</button><Link href="/market-place" className="ml-5 underline">Back to marketplace</Link></section> : product && <>
          <section className={styles.gallery} aria-label="Product images"><Photo src={product.productImages[imageIndex]} alt={product.productName} className={styles.mainImage} /><div className={styles.thumbnails}>{product.productImages.map((image, index) => <button key={`${image}-${index}`} aria-label={`View product image ${index + 1}`} aria-pressed={imageIndex === index} onClick={() => setImageIndex(index)}><Photo src={image} alt={`${product.productName}, view ${index + 1}`} /></button>)}</div></section>
          {notice && <p role="status" className={styles.notice}>{notice} <Link href="/cart" className="underline">View cart</Link></p>}
          <section className={styles.panel}><h1 className={styles.title}>{product.productName}</h1><p className={styles.brand}>Brand: {product.brand || product.manufacturer}{product.brand && <> | <button type="button" onClick={() => document.getElementById("similar-products")?.scrollIntoView({ behavior: "smooth" })}>Similar products from {product.brand}</button></>}</p><p className={styles.price}>{money(price.current)}</p>{price.discount > 0 && <p className={styles.old}><s>{money(price.original)}</s><span>-{price.discount}%</span></p>}<p className={styles.stock}>{product.quantity === 0 ? "Out of stock" : product.quantity <= 5 ? `Low stock: ${product.quantity} remaining` : `${product.quantity} items in stock`}</p><p className="mt-2 text-xs">Delivery options and fees are confirmed at checkout.</p><div className={styles.ratingLine}><Stars rating={product.rating} count={product.reviewCount} /><div className={styles.utilities}><button type="button" onClick={share} aria-label="Share product"><Share2 size={18} /><span>Share</span></button><button disabled={busy} type="button" onClick={wishlist} aria-label={saved ? "Remove from wishlist" : "Save to wishlist"} aria-pressed={saved}><Heart size={18} fill={saved ? "currentColor" : "none"} /><span>{saved ? "Saved" : "Save"}</span></button></div></div><div className={styles.specs}>{product.productType && <span>{product.productType}</span>}<span>{product.category}</span>{product.dimensions && <span>Dimensions: {product.dimensions}</span>}{product.weight > 0 && <span>Weight: {product.weight} kg</span>}</div><label className={styles.quantity}>Quantity<input type="number" min={1} max={Math.min(99, product.quantity)} disabled={!product.quantity} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label><p className={styles.description}>{product.description}</p><p className="mt-3 text-xs text-neutral-500">Need a specific size or variation? Confirm available options with the seller before ordering.</p></section>
          {highlights.length > 0 && <section className={styles.panel}><h2>Featured Products</h2><div className={styles.strip}>{highlights.map((item) => <Link key={item._id} href={`/market-place/${encodeURIComponent(item.slug)}`} className={styles.smallCard}><Photo src={item.productImages[0]} alt={item.productName} /><h3>{item.productName}</h3><p>{money(marketplacePrice(item).current)}</p>{marketplacePrice(item).discount > 0 && <s>{money(marketplacePrice(item).original)}</s>}</Link>)}</div></section>}
          <section className={styles.panel}><h2>Delivery and Returns info</h2><p className={styles.location}>Ships from {product.seller.location || "the seller's location"}</p><div className={styles.delivery}><Package size={23} /><div><h3>Pickup options</h3><p>Ask the seller whether pickup is available for this product.</p><details><summary>Details</summary><p>Confirm the pickup point, opening times and any fees in your conversation with the seller.</p></details></div></div><div className={styles.delivery}><Truck size={23} /><div><h3>Delivery</h3><p>Enter your shipping address at checkout to review the shipping fee before paying.</p><details><summary>Details</summary><p>Delivery availability and timing depend on the destination. Confirm any required delivery date with the seller.</p></details></div></div><div className={styles.delivery}><ShieldCheck size={23} /><div><h3>Returns</h3><p>Confirm the return conditions with the seller before placing your order.</p></div></div></section>
          <section className={styles.panel} aria-labelledby="reviews-title"><div className={styles.row}><h2 id="reviews-title">Product Rating &amp; Reviews</h2><a href="#product-comments" className="text-xs underline">Comments</a></div><div className={styles.ratingSummary}><strong>{product.rating ? product.rating.toFixed(1) : "—"}/5</strong><span>({product.reviewCount} ratings)</span></div>{data.reviews.length ? data.reviews.map((review) => <article className={styles.review} key={review.id}><div className={styles.reviewTop}><Stars rating={review.rating} /><time dateTime={review.createdAt}>{date(review.createdAt)}</time></div><p>{review.text}</p><div className={styles.byline}><span>AbaCraft buyer</span><span className={styles.verified}><CheckCircle2 size={14} fill="currentColor" stroke="white" />Verified Purchase</span></div></article>) : <p className={styles.empty}>No purchase reviews yet.</p>}
            <div id="product-comments" className={styles.commentsTitle}><h2>Comments about this product</h2>{commentsLoading ? <p className={styles.empty} role="status">Loading comments...</p> : commentsError ? <p role="alert" className={styles.error}>{commentsError} <button className="underline" onClick={() => loadComments()}>Retry</button></p> : comments.length ? comments.map((comment) => <article key={comment.id} className={styles.review}><div className={styles.reviewTop}><strong className="text-xs">{comment.authorName}</strong><time dateTime={comment.createdAt}>{date(comment.createdAt)}</time></div><p>{comment.text}</p>{comment.verifiedPurchase && <div className={styles.byline}><span className={styles.verified}><CheckCircle2 size={14} />Verified Purchase</span></div>}</article>) : <p className={styles.empty}>No comments yet. Be the first to start the conversation.</p>}{(commentPage > 1 || hasMore) && <div className={styles.pagination}><button disabled={commentsLoading || commentPage === 1} onClick={() => loadComments(commentPage - 1)}>Previous</button><span>Page {commentPage}</span><button disabled={commentsLoading || !hasMore} onClick={() => loadComments(commentPage + 1)}>Next</button></div>}
              {user?.role === "customer" ? <form onSubmit={postComment} className={styles.commentForm}><label htmlFor="product-comment">Leave a comment</label><textarea id="product-comment" maxLength={2000} disabled={posting} value={text} onChange={(event) => { setText(event.target.value); setTextError(""); commentRequest.current = null; }} aria-invalid={!!textError} aria-describedby="product-comment-error" placeholder="Ask a question or share your experience with this product." /><p id="product-comment-error" role="alert" className={styles.error}>{textError}</p><button type="submit" className={styles.button} disabled={posting}>{posting ? "Posting..." : "Post comment"}</button></form> : <p className="mt-5 text-sm">{user ? "Sign in with a buyer account to leave a comment." : <Link href={signIn} className="underline">Sign in to leave a comment</Link>}</p>}
            </div>
          </section>
          <section className={styles.panel}><h2>Seller Information</h2><p className="text-sm font-semibold">{product.seller.name}</p><div className={styles.seller}>{product.seller.verified && <p><CheckCircle2 size={17} />Verified seller</p>}{product.seller.location && <p><Home size={17} />{product.seller.location}</p>}<p><ShieldCheck size={17} />This product has been approved for the marketplace</p></div></section>
          <section id="similar-products" className={styles.panel}><h2>Similar Products</h2>{data.similar.length ? <div className={styles.similar}>{data.similar.slice(0, 6).map((item) => <Link key={item._id} href={`/market-place/${encodeURIComponent(item.slug)}`}><Photo src={item.productImages[0]} alt={item.productName} /><h3>{item.productName}</h3><p>{money(marketplacePrice(item).current)}</p></Link>)}</div> : <p className={styles.empty}>More products in this category will appear here as vendors publish them.</p>}{sameBrand.length > 0 && <details className="mt-6 text-sm"><summary className="cursor-pointer text-[#94751d]">More from {product.brand}</summary><div className={styles.strip}>{sameBrand.map((item) => <Link key={item._id} href={`/market-place/${encodeURIComponent(item.slug)}`} className={styles.smallCard}><Photo src={item.productImages[0]} alt={item.productName} /><h3>{item.productName}</h3><p>{money(marketplacePrice(item).current)}</p></Link>)}</div></details>}</section>
          <section className={`${styles.panel} ${styles.chat}`}><p>Any questions about this product?</p><button disabled={busy} onClick={contact}><MessageSquare size={18} />{busy ? "Opening chat..." : "Chat Now"}</button></section><section className={styles.panel}><button className={styles.report} onClick={() => { setNotice("Use Chat Now to discuss incorrect product information with the seller. For an order-related issue, open the order in your account to report it."); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Report incorrect product information</button></section>
        </>}
      </main>
    </div>
    {product && !loading && !error && <div className={styles.bottom}><Link href="/market-place" aria-label="Marketplace home"><Home size={20} /></Link><button disabled={busy} onClick={contact} aria-label="Contact seller"><MessageSquare size={20} /></button><button type="button" disabled={product.quantity === 0} onClick={addToCart} className={styles.add}>{product.quantity === 0 ? "Out of stock" : "Add To Cart"}</button></div>}
  </div>;
}
