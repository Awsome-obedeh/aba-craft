import { createHash } from "node:crypto";
import BuyerAccount from "../../../models/BuyerAccount.js";
import BuyerReview from "../../../models/BuyerReview.js";
import BuyerRequest from "../../../models/BuyerRequest.js";
import Product from "../../../models/Products.js";
import Business from "../../../models/Business.js";
import Order from "../../../models/Order.js";
import { MessagingError, objectId, validateMessage } from "./validation.js";
import { sendMessage, startConversation } from "./service.js";

const publicProducts = {
  isActive: true,
  isPublished: true,
  status: "approved",
};
const productFields =
  "productName slug productImages price discountPrice discountPercentage quantity brand businessId";
const sections = [
  "orders",
  "wishlist",
  "followed",
  "recently-viewed",
  "reviews",
  "newsletter",
  "cookies",
  "quote",
  "tracking",
  "issue",
  "recommendations",
];

function guard(user, section) {
  if (user.role !== "customer")
    throw new MessagingError("This area is for buyer accounts.", 403);
  if (!sections.includes(section))
    throw new MessagingError("Page not found.", 404);
}

export async function buyerData(user, section, params) {
  guard(user, section);
  const page = Number(params.get("page") || 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000)
    throw new MessagingError("Invalid page.");
  if (section === "recommendations")
    return {
      products: await Product.find(publicProducts)
        .select(productFields)
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
    };
  if (["orders", "tracking", "quote", "issue", "reviews"].includes(section)) {
    const filter = {
      customer: user.id,
      ...(section === "reviews" ? { status: "delivered" } : {}),
    };
    if (params.get("order")) filter._id = objectId(params.get("order"));
    const [orders, count, reviews] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * 20)
        .limit(20)
        .lean(),
      Order.countDocuments(filter),
      section === "reviews"
        ? BuyerReview.find({ buyerId: user.id })
            .select("orderId productId rating text")
            .lean()
        : [],
    ]);
    return { orders, reviews, page, hasMore: count > page * 20 };
  }
  const account = await BuyerAccount.findById(user.id).lean();
  if (section === "newsletter" || section === "cookies")
    return {
      newsletter: account?.newsletter || false,
      cookies: account?.cookies || {
        advertising: false,
        analytics: false,
        personalization: false,
      },
    };
  if (section === "followed") {
    const sellers = await Business.find({
      _id: { $in: account?.followed || [] },
      isActive: true,
      bannedStatus: { $ne: "banned" },
    })
      .select("businessName logo verificationStatus businessDescription")
      .lean();
    return {
      sellers: await Promise.all(
        sellers.map(async (seller) => ({
          ...seller,
          products: await Product.find({
            ...publicProducts,
            businessId: seller._id,
          })
            .select(productFields)
            .limit(2)
            .lean(),
        })),
      ),
    };
  }
  const ids =
    section === "wishlist"
      ? account?.wishlist || []
      : account?.recentlyViewed || [];
  const products = await Product.find({ ...publicProducts, _id: { $in: ids } })
    .select(productFields)
    .lean();
  products.sort(
    (a, b) =>
      ids.map(String).indexOf(String(a._id)) -
      ids.map(String).indexOf(String(b._id)),
  );
  return { products };
}

export async function saveBuyerData(user, section, body) {
  guard(user, section);
  if (section === "newsletter" || section === "cookies") {
    let update;
    if (section === "newsletter") {
      if (
        typeof body.newsletter !== "boolean" ||
        (body.newsletter && body.consent !== true)
      )
        throw new MessagingError("Consent is required to subscribe.");
      update = {
        newsletter: body.newsletter,
        newsletterConsentAt: body.newsletter ? new Date() : null,
      };
    } else {
      update = {};
      for (const field of ["advertising", "analytics", "personalization"]) {
        if (typeof body[field] !== "boolean")
          throw new MessagingError("Choose each cookie preference.");
        update[`cookies.${field}`] = body[field];
      }
    }
    await BuyerAccount.updateOne(
      { _id: user.id },
      { $set: update },
      { upsert: true },
    );
    return { message: "Preferences saved." };
  }
  if (!["wishlist", "followed", "recently-viewed"].includes(section))
    throw new MessagingError("This page cannot be updated this way.", 405);
  const reference = objectId(body.id);
  if (typeof body.remove !== "boolean" && body.remove !== undefined)
    throw new MessagingError("Invalid removal choice.");
  const field = {
    wishlist: "wishlist",
    followed: "followed",
    "recently-viewed": "recentlyViewed",
  }[section];
  if (!body.remove) {
    const exists =
      section === "followed"
        ? await Business.exists({
            _id: reference,
            isActive: true,
            bannedStatus: { $ne: "banned" },
          })
        : await Product.exists({ _id: reference, ...publicProducts });
    if (!exists) throw new MessagingError("This item is unavailable.", 404);
  }
  // A pipeline makes move-to-front, de-duplication and the storage cap one atomic write.
  await BuyerAccount.updateOne(
    { _id: user.id },
    [
      {
        $set: {
          [field]: {
            $slice: [
              {
                $concatArrays: [
                  body.remove ? [] : [{ $toObjectId: reference }],
                  {
                    $filter: {
                      input: { $ifNull: [`$${field}`, []] },
                      as: "entry",
                      cond: { $ne: ["$$entry", { $toObjectId: reference }] },
                    },
                  },
                ],
              },
              section === "recently-viewed" ? 40 : 100,
            ],
          },
        },
      },
    ],
    { upsert: true, updatePipeline: true },
  );
  return { message: body.remove ? "Removed." : "Saved." };
}

const requiredText = (value, label, max = 2000) => {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new MessagingError(
      `${label} is required (maximum ${max} characters).`,
    );
  return value.trim();
};

export async function submitBuyerAction(user, section, body) {
  guard(user, section);
  if (!["reviews", "quote", "issue"].includes(section))
    throw new MessagingError("Action not found.", 405);
  const order = await Order.findOne({
    _id: objectId(body.orderId),
    customer: user.id,
  }).lean();
  const productId = objectId(body.productId);
  const item = order?.items.find((item) => String(item.product) === productId);
  if (!item) throw new MessagingError("Order item not found.", 404);
  if (section === "reviews") {
    if (order.status !== "delivered")
      throw new MessagingError("Reviews are available after delivery.", 409);
    if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)
      throw new MessagingError("Choose a rating from 1 to 5.");
    const text = requiredText(body.text, "Review");
    try {
      await BuyerReview.create({
        buyerId: user.id,
        orderId: order._id,
        productId,
        rating: body.rating,
        text,
      });
    } catch (error) {
      if (error.code === 11000)
        throw new MessagingError(
          "You have already reviewed this order item.",
          409,
        );
      throw error;
    }
    return { message: "Thank you. Your review is saved." };
  }
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (notes.length > 1600 || notes.split(/\s+/).filter(Boolean).length > 300)
    throw new MessagingError(
      "Keep notes within 300 words and 1,600 characters.",
    );
  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000)
    throw new MessagingError("Quantity must be between 1 and 100,000.");
  let details;
  let text;
  if (section === "quote") {
    const price = Number(body.unitPrice);
    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      price > 100000000 ||
      Math.abs(Math.round(price * 100) - price * 100) > 0.000001
    )
      throw new MessagingError(
        "Enter a valid unit price with up to two decimal places.",
      );
    const leadTime = requiredText(body.leadTime, "Production lead time", 80);
    details = { quantity, unitPrice: price, leadTime, notes };
    text = `REQUEST UPDATED QUOTE\nOrder #${order._id}\n${item.productName}\nQuantity: ${quantity}\nUnit price: NGN ${price}\nGross: NGN ${price * quantity}\nLead time: ${leadTime}\n${notes}`;
  } else {
    const resolutions = ["documentation", "replacement", "refund"];
    if (!resolutions.includes(body.resolution))
      throw new MessagingError("Choose a preferred resolution.");
    const buyerName = requiredText(body.buyerName, "Buyer name", 100);
    if (!notes)
      throw new MessagingError("Describe the issue so your supplier can help.");
    if (quantity > item.quantity)
      throw new MessagingError(
        "Affected quantity cannot exceed the quantity ordered.",
      );
    details = { quantity, buyerName, resolution: body.resolution, notes };
    text = `REPORT AN ISSUE\nOrder #${order._id}\n${item.productName}\nBuyer: ${buyerName}\nAffected quantity: ${quantity}\nPreferred resolution: ${body.resolution}\n${notes}`;
  }
  validateMessage({ text, clientId: body.clientId });
  const conversation = await startConversation(user, {
    orderId: String(order._id),
    productId,
  });
  const requestId = createHash("sha256")
    .update(`${user.id}:${body.clientId}`)
    .digest("hex")
    .slice(0, 24);
  const record = {
    buyerId: user.id,
    orderId: order._id,
    productId,
    conversationId: conversation.id,
    kind: section,
    clientId: body.clientId,
    details,
  };
  try {
    await BuyerRequest.updateOne(
      { _id: requestId },
      { $setOnInsert: record },
      { upsert: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  const saved = await BuyerRequest.findById(requestId).lean();
  if (
    saved.kind !== section ||
    String(saved.orderId) !== String(order._id) ||
    String(saved.productId) !== productId ||
    JSON.stringify(saved.details) !== JSON.stringify(details)
  )
    throw new MessagingError("This request reference was already used.", 409);
  await sendMessage(user, conversation.id, {
    text,
    clientId: body.clientId,
    attachmentIds: body.attachmentIds,
  });
  return {
    conversationId: conversation.id,
    message: "Sent to your supplier. Continue the conversation in your Inbox.",
  };
}
