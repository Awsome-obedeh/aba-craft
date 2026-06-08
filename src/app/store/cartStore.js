// src/app/store/cartStore.js
//
// Shopping cart, persisted to localStorage so refreshes don't wipe the cart.
// Items are stored as a flat array of `{ productId, slug, name, brand, price,
// image, quantity }` so the cart survives even if the product is later edited
// or removed from the store.
//
// Prices are the *display* price at the time of adding — the real price is
// re-validated server-side at checkout.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const MAX_QTY_PER_ITEM = 99;

export const useCartStore = create(
    persist(
        (set, get) => ({
            items: [],

            // Add an item, merging by productId and clamping to stock
            addItem: (product, quantity = 1) => {
                if (!product?._id) return;
                const qty = Math.max(1, Math.min(MAX_QTY_PER_ITEM, Number(quantity) || 1));
                const items = get().items.slice();
                const idx = items.findIndex(i => i.productId === product._id);

                const snapshot = {
                    productId: product._id,
                    slug: product.slug,
                    name: product.productName,
                    brand: product.brand || "",
                    image: (product.productImages && product.productImages[0]) || "",
                    price: Number(product.price) || 0,
                    discountPrice: Number(product.discountPrice) || 0,
                    discountPercentage: Number(product.discountPercentage) || 0,
                    stock: Number(product.quantity) || 0,
                };

                if (idx >= 0) {
                    const next = items[idx].quantity + qty;
                    items[idx] = {
                        ...items[idx],
                        quantity: Math.min(MAX_QTY_PER_ITEM, Math.min(items[idx].stock || MAX_QTY_PER_ITEM, next)),
                    };
                } else {
                    items.push({ ...snapshot, quantity: Math.min(qty, snapshot.stock || MAX_QTY_PER_ITEM) });
                }

                set({ items });
            },

            updateQuantity: (productId, quantity) => {
                const qty = Math.max(1, Math.min(MAX_QTY_PER_ITEM, Number(quantity) || 1));
                set({
                    items: get().items.map(i =>
                        i.productId === productId ? { ...i, quantity: qty } : i
                    ),
                });
            },

            removeItem: (productId) => {
                set({ items: get().items.filter(i => i.productId !== productId) });
            },

            clear: () => set({ items: [] }),

            // Selectors (call as functions, not as React state)
            itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
            subtotal: () =>
                get().items.reduce((sum, i) => {
                    const final = i.discountPrice > 0
                        ? i.price - i.discountPrice
                        : i.discountPercentage > 0
                            ? i.price - (i.price * i.discountPercentage) / 100
                            : i.price;
                    return sum + final * i.quantity;
                }, 0),
        }),
        {
            name: "abacraft-cart",
            storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : undefined)),
            partialize: (state) => ({ items: state.items }),
        }
    )
);
