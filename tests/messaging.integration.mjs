// HTTP + real MongoDB verification. Refuses remote apps and non-disposable databases.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import Business from "../src/models/Business.js";
import Product from "../src/models/Products.js";
import Category from "../src/models/Category.js";
import Conversation from "../src/models/Conversation.js";
import Message from "../src/models/Message.js";
import Order from "../src/models/Order.js";
import BuyerAccount from "../src/models/BuyerAccount.js";
import BuyerReview from "../src/models/BuyerReview.js";
import BuyerRequest from "../src/models/BuyerRequest.js";
import MessageAttachment from "../src/models/MessageAttachment.js";

const base = process.env.MESSAGING_TEST_URL || "http://localhost:3100";
const uri = process.env.MONGODB_URI || "";
if (
  !/^mongodb:\/\/(localhost|127\.0\.0\.1):\d+\/abacraft_messaging_test$/.test(
    uri,
  ) ||
  !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)
) {
  throw new Error(
    "Use a local app and the disposable abacraft_messaging_test database.",
  );
}
if (!process.env.JWT_ACCESS_SECRET)
  throw new Error("Use the local app's test JWT_ACCESS_SECRET.");

await mongoose.connect(uri);
await Promise.all([User.init(), Conversation.init(), Message.init()]);
const accounts = {};
const userIds = [];
const productIds = [];
let business;
let category;
let checks = 0;

function check(condition, description) {
  assert.ok(condition, description);
  checks++;
  console.log(`PASS ${description}`);
}

async function request(
  path,
  { user, method = "GET", body, raw, token, cookie } = {},
) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      ...(user || token
        ? { Authorization: `Bearer ${token || accounts[user].token}` }
        : {}),
      ...(body || raw ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body || raw ? { body: raw || JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  return {
    status: response.status,
    data,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
    cache: response.headers.get("cache-control"),
  };
}

try {
  for (const [name, role] of [
    ["buyer", "customer"],
    ["otherBuyer", "customer"],
    ["vendor", "vendor"],
    ["otherVendor", "vendor"],
    ["admin", "admin"],
  ]) {
    const email = `messaging-${name.toLowerCase()}-${Date.now()}@abacraft.test`;
    const user = await User.create({
      email,
      password: await bcrypt.hash("CraftTest1!", 4),
      role,
      fullName: name === "vendor" ? "Ada Leather Studio" : "Jonathan Buyer",
      emailVerified: true,
    });
    userIds.push(user._id);
    const login = await request("/auth/sign-in", {
      method: "POST",
      body: { email, password: "CraftTest1!" },
    });
    check(login.status === 200, `${name} signs in`);
    accounts[name] = {
      id: String(user._id),
      token: login.data.accessToken,
      cookie: login.cookie,
      email,
    };
  }

  business = await Business.create({
    ownerId: accounts.vendor.id,
    businessName: "Ada Leather Studio",
    bankDetails: { accountNumber: "PRIVATE-BANK-DATA" },
  });
  category = await Category.create({
    categoryName: `Messaging test ${Date.now()}`,
  });
  const product = await Product.create({
    productName: "Handcrafted leather weekender",
    slug: `messaging-weekender-${Date.now()}`,
    description: "A thoughtfully crafted travel bag.",
    price: 45000,
    quantity: 5,
    category: category._id,
    createdBy: accounts.vendor.id,
    businessId: business._id,
    status: "approved",
    isPublished: true,
    productImages: ["/images/home/bag.webp"],
  });
  productIds.push(product._id);

  check(
    (await request("/conversations")).status === 401,
    "anonymous inbox is rejected",
  );
  check(
    (await request("/conversations", { user: "admin" })).status === 403,
    "admins cannot read private conversations",
  );
  check(
    (
      await request("/conversations", {
        user: "vendor",
        method: "POST",
        body: { productId: String(product._id) },
      })
    ).status === 403,
    "vendors cannot initiate buyer conversations",
  );
  check(
    (
      await request("/conversations", {
        user: "buyer",
        method: "POST",
        body: { productId: { $ne: null } },
      })
    ).status === 400,
    "query operators cannot substitute for product IDs",
  );

  const starts = await Promise.all(
    Array.from({ length: 4 }, () =>
      request("/conversations", {
        user: "buyer",
        method: "POST",
        body: {
          productId: String(product._id),
          vendorId: accounts.otherVendor.id,
          buyerId: accounts.otherBuyer.id,
        },
      }),
    ),
  );
  check(
    starts.every((result) => result.status === 200) &&
      new Set(starts.map((result) => result.data.conversation.id)).size === 1,
    "concurrent starts reuse one conversation",
  );
  const conversationId = starts[0].data.conversation.id;
  const conversation = await Conversation.findById(conversationId).lean();
  check(
    String(conversation.vendorId) === accounts.vendor.id &&
      String(conversation.buyerId) === accounts.buyer.id,
    "participants come from authentication and the product, not request fields",
  );
  const path = `/conversations/${conversationId}/messages`;

  check(
    (await request(path, { user: "buyer" })).data.messages.length === 0,
    "a new conversation has a usable empty history",
  );
  for (const name of ["otherBuyer", "otherVendor"]) {
    check(
      (await request(path, { user: name })).status === 404,
      `${name} cannot read another conversation`,
    );
    check(
      (
        await request(path, {
          user: name,
          method: "POST",
          body: { text: "Intrusion", clientId: randomUUID() },
        })
      ).status === 404,
      `${name} cannot send into another conversation`,
    );
    check(
      (
        await request(`/conversations/${conversationId}/read`, {
          user: name,
          method: "POST",
          body: { messageIds: [String(new mongoose.Types.ObjectId())] },
        })
      ).status === 404,
      `${name} cannot mark another conversation read`,
    );
  }
  check(
    (await request("/conversations/not-an-id/messages", { user: "buyer" }))
      .status === 400,
    "malformed route ID is rejected",
  );
  for (const text of ["  ", "a".repeat(2001), { $gt: "" }])
    check(
      (
        await request(path, {
          user: "buyer",
          method: "POST",
          body: { text, clientId: randomUUID() },
        })
      ).status === 400,
      "invalid message text is rejected",
    );
  check(
    (await request(path, { user: "buyer", method: "POST", raw: "{" }))
      .status === 400,
    "malformed JSON is rejected",
  );
  check(
    (
      await request(path, {
        user: "buyer",
        method: "POST",
        raw: JSON.stringify({ text: "a".repeat(17000) }),
      })
    ).status === 413,
    "oversized request body is rejected",
  );

  const clientId = randomUUID();
  const sends = await Promise.all(
    Array.from({ length: 4 }, () =>
      request(path, {
        user: "buyer",
        method: "POST",
        body: {
          text: "Can you make this in tan leather?",
          clientId,
          senderId: accounts.vendor.id,
          readAt: new Date(),
        },
      }),
    ),
  );
  check(
    sends.every((result) => result.status === 200) &&
      (await Message.countDocuments({ conversationId })) === 1,
    "concurrent send retries create only one message",
  );
  const messageId = sends[0].data.message.id;
  check(
    sends[0].data.message.senderId === accounts.buyer.id &&
      sends[0].data.message.readAt === null,
    "sender and read state cannot be forged",
  );
  check(
    (
      await request(path, {
        user: "buyer",
        method: "POST",
        body: { text: "Changed", clientId },
      })
    ).status === 409,
    "reusing a message reference for different content fails",
  );

  const vendorInbox = await request("/conversations", { user: "vendor" });
  check(
    vendorInbox.data.conversations[0].unreadCount === 1 &&
      vendorInbox.cache.includes("no-store"),
    "vendor inbox shows an unread message without caching private data",
  );
  check(
    !JSON.stringify(vendorInbox.data).includes("PRIVATE-BANK-DATA") &&
      !JSON.stringify(vendorInbox.data).includes("@abacraft.test"),
    "inbox omits bank and contact data",
  );
  check(
    (await request("/conversations/unread", { user: "vendor" })).data
      .unreadCount === 1,
    "global unread badge reflects incoming messages",
  );
  check(
    (await request("/conversations?search=weekender", { user: "vendor" })).data
      .conversations.length === 1,
    "inbox search finds the product subject",
  );
  check(
    (await request("/conversations?search=%5B", { user: "vendor" })).status ===
      200,
    "search escapes regex syntax",
  );

  await request(`/conversations/${conversationId}/read`, {
    user: "buyer",
    method: "POST",
    body: { messageIds: [messageId] },
  });
  check(
    (await request("/conversations/unread", { user: "vendor" })).data
      .unreadCount === 1,
    "sender cannot mark their outgoing message read",
  );
  await request(`/conversations/${conversationId}/read`, {
    user: "vendor",
    method: "POST",
    body: { messageIds: [messageId] },
  });
  check(
    (await request(path, { user: "buyer" })).data.messages[0].readAt &&
      (await request("/conversations/unread", { user: "vendor" })).data
        .unreadCount === 0,
    "viewing an incoming message clears unread state and exposes its read receipt",
  );

  const reply = await request(path, {
    user: "vendor",
    method: "POST",
    body: {
      text: "Yes, we can. Which size would you like?",
      clientId: randomUUID(),
    },
  });
  check(
    reply.status === 200 &&
      (await request("/conversations/unread", { user: "buyer" })).data
        .unreadCount === 1,
    "vendor replies persist and notify the buyer",
  );
  const refresh = await request("/auth/refresh", {
    method: "POST",
    cookie: accounts.buyer.cookie,
  });
  check(
    refresh.status === 200 &&
      (await request(path, { token: refresh.data.accessToken })).data.messages
        .length === 2,
    "conversation survives session refresh",
  );
  const expired = jwt.sign(
    { id: accounts.buyer.id, role: "customer" },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: -1 },
  );
  check(
    (await request(path, { token: expired })).status === 401,
    "expired access tokens are rejected",
  );

  const timestamp = new Date(Date.now() - 120_000);
  await Message.insertMany(
    Array.from({ length: 45 }, (_, index) => ({
      conversationId,
      senderId: accounts.vendor.id,
      recipientId: accounts.buyer.id,
      text: `Earlier message ${index + 1}`,
      clientId: randomUUID(),
      createdAt: timestamp,
    })),
  );
  const latest = await request(path, { user: "buyer" });
  const older = await request(
    `${path}?before=${encodeURIComponent(latest.data.nextCursor)}`,
    { user: "buyer" },
  );
  const allIds = [...latest.data.messages, ...older.data.messages].map(
    (message) => message.id,
  );
  check(
    latest.data.messages.length === 40 &&
      allIds.length === 47 &&
      new Set(allIds).size === 47,
    "cursor pagination has no gaps or duplicates at equal timestamps",
  );
  check(
    (await request(`${path}?before=bad`, { user: "buyer" })).status === 400,
    "invalid message cursor is rejected",
  );

  await Product.updateOne({ _id: product._id }, { isPublished: false });
  check(
    (
      await request("/conversations", {
        user: "otherBuyer",
        method: "POST",
        body: { productId: String(product._id) },
      })
    ).status === 404,
    "unpublished listings cannot start new conversations",
  );
  const archived = await request(path, { user: "buyer" });
  check(
    archived.data.conversation.product.href === null &&
      archived.data.messages.length === 40,
    "existing history survives a withdrawn listing",
  );
  await Product.updateOne({ _id: product._id }, { isPublished: true });
  await Business.updateOne({ _id: business._id }, { bannedStatus: "banned" });
  check(
    (
      await request(path, {
        user: "buyer",
        method: "POST",
        body: { text: "Hello", clientId: randomUUID() },
      })
    ).status === 409,
    "banned businesses cannot receive new messages",
  );
  check(
    (await request(path, { user: "buyer" })).data.conversation.canReply ===
      false,
    "unavailable business history is read-only",
  );
  await Business.updateOne({ _id: business._id }, { bannedStatus: "none" });

  await User.updateOne({ _id: accounts.otherBuyer.id }, { role: "admin" });
  check(
    (await request("/conversations", { user: "otherBuyer" })).status === 403,
    "authorization uses the current database role instead of a stale token role",
  );

  await User.updateOne({ _id: accounts.otherBuyer.id }, { role: "customer" });
  check(
    (await request("/buyer/wishlist")).status === 401,
    "buyer account requires authentication",
  );
  check(
    (await request("/buyer/orders", { user: "vendor" })).status === 403,
    "vendor cannot access buyer account data",
  );
  for (const section of ["wishlist", "recently-viewed", "followed"]) {
    const reference = String(
      section === "followed" ? business._id : product._id,
    );
    const save = () =>
      request(`/buyer/${section}`, {
        user: "buyer",
        method: "PATCH",
        body: { id: reference },
      });
    check(
      (await save()).status === 200 && (await save()).status === 200,
      `${section} saves are idempotent`,
    );
    const saved = await request(`/buyer/${section}`, { user: "buyer" });
    check(
      (saved.data.products || saved.data.sellers)?.length === 1,
      `${section} persists one entry`,
    );
    const other = await request(`/buyer/${section}`, { user: "otherBuyer" });
    check(
      (other.data.products || other.data.sellers)?.length === 0,
      `${section} remains private`,
    );
  }
  check(
    (
      await request("/buyer/newsletter", {
        user: "buyer",
        method: "PATCH",
        body: { newsletter: true, consent: false },
      })
    ).status === 400,
    "newsletter requires explicit consent",
  );
  check(
    (
      await request("/buyer/newsletter", {
        user: "buyer",
        method: "PATCH",
        body: { newsletter: true, consent: true, role: "admin" },
      })
    ).status === 200,
    "newsletter saves consent",
  );
  check(
    (await request("/buyer/newsletter", { user: "buyer" })).data.newsletter ===
      true,
    "newsletter preference survives read",
  );
  check(
    (
      await request("/buyer/cookies", {
        user: "buyer",
        method: "PATCH",
        body: { advertising: false, analytics: true, personalization: false },
      })
    ).status === 200,
    "cookie preferences save",
  );
  check(
    (await request("/buyer/cookies", { user: "buyer" })).data.cookies
      .analytics === true,
    "cookie preferences persist",
  );
  const order = await Order.create({
    customer: accounts.buyer.id,
    items: [
      {
        product: product._id,
        productName: product.productName,
        productImage: product.productImages[0],
        unitPrice: 45000,
        quantity: 4,
        vendor: accounts.vendor.id,
      },
    ],
    shippingAddress: {
      fullName: "Development Buyer",
      phone: "08000000000",
      addressLine: "Development delivery address",
      city: "Aba",
      state: "Abia",
    },
    subtotal: 180000,
    total: 180000,
    paymentStatus: "paid",
    status: "shipped",
  });
  const orderBody = {
    orderId: String(order._id),
    productId: String(product._id),
  };
  check(
    (
      await request(`/buyer/tracking?order=${order._id}`, {
        user: "otherBuyer",
      })
    ).data.orders.length === 0,
    "tracking cannot disclose another buyer’s address",
  );
  check(
    (await request(`/buyer/tracking?order=${order._id}`, { user: "buyer" }))
      .data.orders[0].status === "shipped",
    "tracking reflects actual order status",
  );
  check(
    (
      await request("/conversations", {
        user: "otherBuyer",
        method: "POST",
        body: orderBody,
      })
    ).status === 404,
    "order conversations require order ownership",
  );
  const orderStart = await request("/conversations", {
    user: "buyer",
    method: "POST",
    body: orderBody,
  });
  check(orderStart.status === 200, "buyer can contact supplier about an order");
  const orderConversationId = orderStart.data.conversation.id;
  const fileContent = Buffer.from("%PDF-1.4\nDevelopment evidence only\n%%EOF");
  const upload = await fetch(
    `${base}/api/conversations/${orderConversationId}/attachments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accounts.buyer.token}`,
        "Content-Type": "application/pdf",
        "X-File-Name": "development-evidence.pdf",
      },
      body: fileContent,
    },
  );
  const file = (await upload.json()).attachment;
  check(upload.status === 200 && file?.id, "private evidence upload succeeds");
  const invalidUpload = await fetch(
    `${base}/api/conversations/${orderConversationId}/attachments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accounts.buyer.token}`,
        "Content-Type": "image/png",
        "X-File-Name": "fake.png",
      },
      body: "not an image",
    },
  );
  check(invalidUpload.status === 415, "spoofed upload content is rejected");
  const download = (user) =>
    fetch(`${base}/api/attachments/${file.id}`, {
      headers: { Authorization: `Bearer ${accounts[user].token}` },
    });
  check(
    (await download("vendor")).status === 404,
    "unsent evidence is hidden from the vendor",
  );
  const quote = {
    ...orderBody,
    unitPrice: 42000,
    quantity: 6,
    leadTime: "2 weeks",
    notes: "Please quote a repeat order in tan leather.",
    clientId: randomUUID(),
    attachmentIds: [file.id],
  };
  check(
    (
      await request("/buyer/quote", {
        user: "otherBuyer",
        method: "POST",
        body: quote,
      })
    ).status === 404,
    "forged quote order is rejected",
  );
  check(
    (
      await request("/buyer/quote", {
        user: "buyer",
        method: "POST",
        body: quote,
      })
    ).status === 200,
    "quote request reaches supplier inbox",
  );
  check(
    (
      await request("/buyer/quote", {
        user: "buyer",
        method: "POST",
        body: quote,
      })
    ).status === 200 &&
      (await BuyerRequest.countDocuments({ buyerId: accounts.buyer.id })) === 1,
    "quote retries do not duplicate requests",
  );
  const fileResponse = await download("vendor");
  check(
    fileResponse.status === 200 &&
      Buffer.from(await fileResponse.arrayBuffer()).equals(fileContent),
    "sent attachment is downloadable byte-for-byte by recipient",
  );
  check(
    (await download("otherBuyer")).status === 404,
    "nonparticipant cannot download evidence",
  );
  check(
    (await MessageAttachment.findById(file.id).lean()).expiresAt === undefined,
    "sent evidence does not expire with draft uploads",
  );
  const issue = {
    ...orderBody,
    quantity: 1,
    buyerName: "Development Buyer",
    resolution: "documentation",
    notes: "The care instructions are missing. Please send them.",
    clientId: randomUUID(),
  };
  check(
    (
      await request("/buyer/issue", {
        user: "buyer",
        method: "POST",
        body: issue,
      })
    ).status === 200,
    "issue report reaches the same order conversation",
  );
  check(
    (
      await request(`/conversations/${orderConversationId}/messages`, {
        user: "vendor",
      })
    ).data.messages.length === 2,
    "vendor sees quote and issue report",
  );
  check(
    (await Order.findById(order._id)).paymentStatus === "paid",
    "requests do not alter payment or original order",
  );
  const review = {
    ...orderBody,
    rating: 5,
    text: "Well made and carefully finished.",
  };
  check(
    (
      await request("/buyer/reviews", {
        user: "buyer",
        method: "POST",
        body: review,
      })
    ).status === 409,
    "reviews require delivery",
  );
  await Order.updateOne({ _id: order._id }, { status: "delivered" });
  check(
    (
      await request("/buyer/reviews", {
        user: "buyer",
        method: "POST",
        body: review,
      })
    ).status === 200,
    "delivered order can be reviewed",
  );
  check(
    (
      await request("/buyer/reviews", {
        user: "buyer",
        method: "POST",
        body: review,
      })
    ).status === 409,
    "duplicate order reviews are rejected",
  );
  check(
    (
      await request("/buyer/reviews", {
        user: "otherBuyer",
        method: "POST",
        body: review,
      })
    ).status === 404,
    "another buyer cannot review this order",
  );
  check(
    (await request("/buyer/reviews", { user: "buyer" })).data.reviews.length ===
      1,
    "submitted reviews persist",
  );
  console.log(`${checks} integration checks passed.`);
  if (process.env.KEEP_MESSAGING_FIXTURES === "1")
    console.log(
      JSON.stringify({
        buyerEmail: accounts.buyer.email,
        vendorEmail: accounts.vendor.email,
        productSlug: product.slug,
        conversationId,
        password: "CraftTest1!",
      }),
    );
} finally {
  if (process.env.KEEP_MESSAGING_FIXTURES !== "1") {
    await Promise.all([
      BuyerAccount.deleteMany({ _id: { $in: userIds } }),
      BuyerReview.deleteMany({ buyerId: { $in: userIds } }),
      BuyerRequest.deleteMany({ buyerId: { $in: userIds } }),
      MessageAttachment.deleteMany({ ownerId: { $in: userIds } }),
      Order.deleteMany({ customer: { $in: userIds } }),
    ]);
    await Message.deleteMany({ senderId: { $in: userIds } });
    await Conversation.deleteMany({ buyerId: { $in: userIds } });
    await Product.deleteMany({ _id: { $in: productIds } });
    if (business) await Business.deleteOne({ _id: business._id });
    if (category) await Category.deleteOne({ _id: category._id });
    await User.deleteMany({ _id: { $in: userIds } });
  }
  await mongoose.disconnect();
}
