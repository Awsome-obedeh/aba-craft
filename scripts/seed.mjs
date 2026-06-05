// scripts/seed.mjs
//
// Dev-only seed: creates one admin, two customers, one vendor, and three
// products owned by the vendor. Idempotent — re-running upserts on email and
// category name. Bypasses the OTP/invitation flow by writing users directly
// with `emailVerified: true`, so the seeded accounts can sign in immediately.
//
// Run with:
//   npm run seed
//
// (Loads MONGODB_URI from .env.local manually so the script works on every
// platform with no extra deps. The script also refuses to run when
// NODE_ENV is explicitly set to anything other than "development".)

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../src/models/User.js";
import Category from "../src/models/Category.js";
import Product from "../src/models/Products.js";

// ─── Env loading ─────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");
if (existsSync(envPath)) {
    // Minimal KEY=VALUE parser. Doesn't handle multi-line values or quoted
    // strings with spaces; .env.local only has simple MONGODB_URI in this
    // project. Existing process.env values win so the user can still
    // override on the command line.
    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq < 0) continue;
        const key = line.slice(0, eq).trim();
        const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
        if (process.env[key] === undefined) process.env[key] = value;
    }
}

// Hard dev-only guard. If NODE_ENV is set at all it must be "development".
// Unset is allowed (treated as development) so `npm run seed` just works.
if (process.env.NODE_ENV && process.env.NODE_ENV !== "development") {
    console.error(
        `Refusing to seed: NODE_ENV is "${process.env.NODE_ENV}". ` +
            `Unset it or set it to "development" to run this script.`
    );
    process.exit(1);
}

if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Add it to .env.local.");
    process.exit(1);
}

// ─── Seed data ───────────────────────────────────────────────────────────

const SEED_USERS = [
    {
        email: "admin@abacraft.test",
        password: "AdminPass1!",
        role: "admin",
        fullName: "AbaCraft Admin",
        phoneNumber: "+2340000000001",
    },
    {
        email: "vendor@abacraft.test",
        password: "VendorPass1!",
        role: "vendor",
        fullName: "Aba Artisan Collective",
        phoneNumber: "+2340000000002",
    },
    {
        email: "ada@example.test",
        password: "CustomerPass1!",
        role: "customer",
        fullName: "Ada Eze",
        phoneNumber: "+2340000000003",
    },
    {
        email: "tunde@example.test",
        password: "CustomerPass1!",
        role: "customer",
        fullName: "Tunde Bello",
        phoneNumber: "+2340000000004",
    },
];

const SEED_CATEGORY = {
    categoryName: "Leather Goods",
    description: "Handcrafted leather items from Aba artisans.",
};

const SEED_PRODUCTS = [
    {
        productName: "Aria Leather Tote",
        description:
            "Full-grain leather tote, hand-stitched in Aba. Roomy enough for a 13\" laptop and a day's essentials.",
        price: 28000,
        discountPrice: 0,
        discountPercentage: 0,
        quantity: 12,
        brand: "AbaCraft Studio",
        productImages: [
            "https://picsum.photos/seed/abacraft-tote/800/800",
        ],
        featured: true,
    },
    {
        productName: "Obi Bifold Wallet",
        description:
            "Slim bifold wallet in vegetable-tanned leather. Six card slots, two bill compartments.",
        price: 9500,
        discountPrice: 0,
        discountPercentage: 15,
        quantity: 30,
        brand: "AbaCraft Studio",
        productImages: [
            "https://picsum.photos/seed/abacraft-wallet/800/800",
        ],
        featured: false,
    },
    {
        productName: "Umu Travel Duffle",
        description:
            "Weekender duffle in pebbled leather with brass hardware. Holds a long weekend's worth of kit.",
        price: 54000,
        discountPrice: 49500,
        discountPercentage: 0,
        quantity: 6,
        brand: "AbaCraft Studio",
        productImages: [
            "https://picsum.photos/seed/abacraft-duffle/800/800",
        ],
        featured: true,
    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────

async function upsertUser(credentials) {
    const hashedPassword = await bcrypt.hash(credentials.password, 12);

    // Filter by email (the only stable identity field here); upsert and
    // refresh the role + verified flag every run so re-seeding fixes a
    // user that was created via the OTP flow but never verified.
    return User.findOneAndUpdate(
        { email: credentials.email.toLowerCase() },
        {
            $set: {
                email: credentials.email.toLowerCase(),
                password: hashedPassword,
                role: credentials.role,
                fullName: credentials.fullName,
                phoneNumber: credentials.phoneNumber,
                emailVerified: true,
                onBoardingStatus: "completed",
            },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ).lean();
}

async function upsertCategory(definition) {
    return Category.findOneAndUpdate(
        { categoryName: definition.categoryName },
        {
            $set: {
                categoryName: definition.categoryName,
                description: definition.description,
                isActive: true,
            },
            $setOnInsert: { slug: undefined }, // pre-save hook will fill
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
}

async function upsertProduct(definition, vendorId, categoryId) {
    // Slugs are derived from productName via the API. Re-derive here the
    // same way to make the upsert filter stable.
    const slug = definition.productName
        .toLowerCase()
        .trim()
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .replace(/\s+/g, "-");

    return Product.findOneAndUpdate(
        { slug },
        {
            $set: {
                productName: definition.productName,
                description: definition.description,
                price: definition.price,
                discountPrice: definition.discountPrice,
                discountPercentage: definition.discountPercentage,
                quantity: definition.quantity,
                brand: definition.brand,
                productImages: definition.productImages,
                featured: definition.featured,
                isActive: true,
                // Seeded products are pre-approved and published so the
                // storefront (which filters to isPublished && status==approved)
                // has something to show immediately.
                status: "approved",
                isPublished: true,
                category: categoryId,
                createdBy: vendorId,
            },
            $setOnInsert: { slug },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ).lean();
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
    console.log("Connecting to MongoDB…");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.\n");

    const created = {};

    console.log("Seeding users…");
    for (const u of SEED_USERS) {
        const doc = await upsertUser(u);
        created[u.email] = doc._id;
        console.log(`  ✓ ${u.role.padEnd(8)} ${u.email}`);
    }

    console.log("\nSeeding category…");
    const category = await upsertCategory(SEED_CATEGORY);
    console.log(`  ✓ ${category.categoryName} (${category._id})`);

    console.log("\nSeeding products…");
    for (const p of SEED_PRODUCTS) {
        const doc = await upsertProduct(
            p,
            created["vendor@abacraft.test"],
            category._id
        );
        console.log(`  ✓ ${p.productName} — stock ${p.quantity}`);
    }

    console.log("\nSeed complete. Test credentials:");
    console.log("  admin@abacraft.test    / AdminPass1!");
    console.log("  vendor@abacraft.test   / VendorPass1!");
    console.log("  ada@example.test       / CustomerPass1!");
    console.log("  tunde@example.test     / CustomerPass1!");
}

main()
    .then(async () => {
        await mongoose.disconnect();
        process.exit(0);
    })
    .catch(async (err) => {
        console.error("\nSeed failed:", err);
        try {
            await mongoose.disconnect();
        } catch {
            // ignore
        }
        process.exit(1);
    });
