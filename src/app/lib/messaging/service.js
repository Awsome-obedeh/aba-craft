import { createHash } from "node:crypto";
import mongoose from "mongoose";
import Conversation from "../../../models/Conversation.js";
import Message from "../../../models/Message.js";
import Product from "../../../models/Products.js";
import User from "../../../models/User.js";
import Business from "../../../models/Business.js";
import Order from "../../../models/Order.js";
import MessageAttachment from "../../../models/MessageAttachment.js";
import { messageAttachments } from "./attachments.js";
import {
  CONVERSATION_PAGE_SIZE,
  MESSAGE_PAGE_SIZE,
  MessagingError,
  makeCursor,
  objectId,
  parseCursor,
  readMessageIds,
  validateMessage,
} from "./validation.js";

const id = (value) => new mongoose.Types.ObjectId(objectId(String(value)));
const stableId = (...parts) =>
  new mongoose.Types.ObjectId(
    createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 24),
  );
const participantFilter = (user) => ({
  [user.role === "customer" ? "buyerId" : "vendorId"]: id(user.id),
});

function beforeCursor(cursor, field) {
  if (!cursor) return {};

  return {
    $or: [
      { [field]: { $lt: cursor.date } },
      { [field]: cursor.date, _id: { $lt: id(cursor.id) } },
    ],
  };
}

function serializeMessage(message) {
  return {
    id: String(message._id),
    senderId: String(message.senderId),
    text: message.text,
    clientId: message.clientId,
    createdAt: message.createdAt,
    readAt: message.readAt,
    attachments: message.attachments || [],
  };
}

export async function ownedConversation(user, conversationId) {
  const conversation = await Conversation.findOne({
    _id: id(conversationId),
    ...participantFilter(user),
  }).lean();
  if (!conversation) throw new MessagingError("Conversation not found.", 404);
  return conversation;
}

async function describeConversation(conversation, user) {
  const peerId =
    user.role === "customer" ? conversation.vendorId : conversation.buyerId;
  const [peer, business, product] = await Promise.all([
    User.findById(peerId).select("fullName role").lean(),
    conversation.businessId
      ? Business.findById(conversation.businessId)
          .select(
            "businessName isActive bannedStatus ownerId verificationStatus sellerRole",
          )
          .lean()
      : null,
    Product.findById(conversation.productId)
      .select("slug isActive isPublished status")
      .lean(),
  ]);
  const expectedRole = user.role === "customer" ? "vendor" : "customer";
  const businessAvailable =
    !conversation.businessId ||
    (business &&
      business.isActive &&
      business.bannedStatus !== "banned" &&
      String(business.ownerId) === String(conversation.vendorId));

  return {
    id: String(conversation._id),
    businessId: conversation.businessId
      ? String(conversation.businessId)
      : null,
    verificationStatus: business?.verificationStatus || "pending",
    sellerRole: business?.sellerRole || "vendor",
    orderId: conversation.orderId ? String(conversation.orderId) : null,
    participant: {
      name:
        (user.role === "customer" && business?.businessName) ||
        peer?.fullName ||
        (expectedRole === "vendor" ? "AbaCraft vendor" : "AbaCraft buyer"),
      role: expectedRole,
    },
    product: {
      ...conversation.product,
      id: String(conversation.productId),
      href:
        product?.isActive &&
        product.isPublished &&
        product.status === "approved"
          ? `/dashboard/products/${encodeURIComponent(product.slug)}`
          : null,
    },
    canReply: Boolean(peer && peer.role === expectedRole && businessAvailable),
  };
}

export async function startConversation(user, body) {
  if (user.role !== "customer")
    throw new MessagingError(
      "Only buyers can start a product conversation.",
      403,
    );
  if (body?.orderId) {
    const order = await Order.findOne({
      _id: id(body.orderId),
      customer: id(user.id),
    }).lean();
    const item = order?.items.find(
      (item) => String(item.product) === objectId(body.productId),
    );
    if (!item) throw new MessagingError("Order item not found.", 404);
    const vendor = await User.findOne({ _id: item.vendor, role: "vendor" })
      .select("_id")
      .lean();
    if (!vendor) throw new MessagingError("This vendor is unavailable.", 409);
    const product = await Product.findById(item.product)
      .select("slug businessId")
      .lean();
    const conversationId = stableId(
      "order-conversation",
      user.id,
      String(order._id),
      String(item.product),
    );
    try {
      await Conversation.updateOne(
        { _id: conversationId },
        {
          $setOnInsert: {
            buyerId: user.id,
            vendorId: item.vendor,
            productId: item.product,
            businessId: product?.businessId || null,
            orderId: order._id,
            product: {
              name: item.productName,
              slug: product?.slug || "unavailable",
              image: item.productImage,
            },
            lastMessageAt: new Date(),
          },
        },
        { upsert: true },
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
    return { id: String(conversationId) };
  }
  const product = await Product.findOne({
    _id: id(body?.productId),
    isActive: true,
    isPublished: true,
    status: "approved",
  })
    .select("productName slug productImages createdBy businessId")
    .lean();
  if (!product)
    throw new MessagingError(
      "This product is no longer available for enquiries.",
      404,
    );
  if (String(product.createdBy) === user.id)
    throw new MessagingError("You cannot message yourself.");

  const vendor = await User.findOne({ _id: product.createdBy, role: "vendor" })
    .select("_id")
    .lean();
  if (!vendor) throw new MessagingError("This vendor is unavailable.", 409);
  if (
    product.businessId &&
    !(await Business.exists({
      _id: product.businessId,
      ownerId: vendor._id,
      isActive: true,
      bannedStatus: { $ne: "banned" },
    }))
  ) {
    throw new MessagingError(
      "This business is unavailable for new enquiries.",
      409,
    );
  }

  // The deterministic primary key makes concurrent starts idempotent on standalone MongoDB too.
  const conversationId = stableId(
    "conversation",
    user.id,
    String(vendor._id),
    String(product._id),
  );
  try {
    await Conversation.updateOne(
      { _id: conversationId },
      {
        $setOnInsert: {
          buyerId: user.id,
          vendorId: vendor._id,
          productId: product._id,
          businessId: product.businessId || null,
          product: {
            name: product.productName,
            slug: product.slug,
            image: product.productImages?.[0] || "",
          },
          lastMessageAt: new Date(),
        },
      },
      { upsert: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }

  return { id: String(conversationId) };
}

export async function listConversations(user, searchParams) {
  const cursor = parseCursor(searchParams.get("before"));
  const search = (searchParams.get("search") || "").trim();
  if (search.length > 100)
    throw new MessagingError("Keep your search within 100 characters.");
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const onlyUnread = searchParams.get("unread") === "true";

  // Join only public display names. Bank, identity, contact and login fields never enter the response.
  const records = await Conversation.aggregate([
    {
      $match: {
        ...participantFilter(user),
        ...beforeCursor(cursor, "lastMessageAt"),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: user.role === "customer" ? "vendorId" : "buyerId",
        foreignField: "_id",
        pipeline: [{ $project: { fullName: 1 } }],
        as: "peer",
      },
    },
    {
      $lookup: {
        from: "businesses",
        localField: "businessId",
        foreignField: "_id",
        pipeline: [{ $project: { businessName: 1 } }],
        as: "business",
      },
    },
    {
      $lookup: {
        from: "messages",
        localField: "_id",
        foreignField: "conversationId",
        pipeline: [
          { $sort: { createdAt: -1, _id: -1 } },
          { $limit: 1 },
          { $project: { text: 1, createdAt: 1 } },
        ],
        as: "latest",
      },
    },
    {
      $lookup: {
        from: "messages",
        localField: "_id",
        foreignField: "conversationId",
        pipeline: [
          { $match: { recipientId: id(user.id), readAt: null } },
          { $count: "count" },
        ],
        as: "unread",
      },
    },
    {
      $set: {
        name: {
          $ifNull: [
            user.role === "customer"
              ? { $arrayElemAt: ["$business.businessName", 0] }
              : { $arrayElemAt: ["$peer.fullName", 0] },
            {
              $ifNull: [
                { $arrayElemAt: ["$peer.fullName", 0] },
                user.role === "customer" ? "AbaCraft vendor" : "AbaCraft buyer",
              ],
            },
          ],
        },
        unreadCount: { $ifNull: [{ $arrayElemAt: ["$unread.count", 0] }, 0] },
      },
    },
    ...(search
      ? [
          {
            $match: {
              $or: [
                { name: { $regex: escapedSearch, $options: "i" } },
                { "product.name": { $regex: escapedSearch, $options: "i" } },
              ],
            },
          },
        ]
      : []),
    ...(onlyUnread ? [{ $match: { unreadCount: { $gt: 0 } } }] : []),
    { $sort: { lastMessageAt: -1, _id: -1 } },
    { $limit: CONVERSATION_PAGE_SIZE + 1 },
    {
      $project: {
        product: 1,
        name: 1,
        unreadCount: 1,
        lastMessageAt: 1,
        latest: { $arrayElemAt: ["$latest", 0] },
      },
    },
  ]);
  const page = records.slice(0, CONVERSATION_PAGE_SIZE);

  return {
    conversations: page.map((record) => ({
      id: String(record._id),
      participant: { name: record.name || "AbaCraft member" },
      product: record.product,
      unreadCount: record.unreadCount,
      preview: record.latest?.text || "Start the conversation",
      lastMessageAt: record.latest?.createdAt || record.lastMessageAt,
    })),
    nextCursor:
      records.length > CONVERSATION_PAGE_SIZE
        ? makeCursor(page.at(-1), "lastMessageAt")
        : null,
  };
}

export async function getMessages(user, conversationId, cursorValue) {
  const conversation = await ownedConversation(user, conversationId);
  const cursor = parseCursor(cursorValue);
  const [details, records] = await Promise.all([
    describeConversation(conversation, user),
    Message.find({
      conversationId: conversation._id,
      ...beforeCursor(cursor, "createdAt"),
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(MESSAGE_PAGE_SIZE + 1)
      .lean(),
  ]);
  const page = records.slice(0, MESSAGE_PAGE_SIZE);

  return {
    conversation: details,
    messages: page.map(serializeMessage).reverse(),
    nextCursor:
      records.length > MESSAGE_PAGE_SIZE ? makeCursor(page.at(-1)) : null,
  };
}

export async function sendMessage(user, conversationId, body) {
  const fields = validateMessage(body);
  const conversation = await ownedConversation(user, conversationId);
  const details = await describeConversation(conversation, user);
  if (!details.canReply)
    throw new MessagingError(
      "This conversation is read-only because the account or business is unavailable.",
      409,
    );
  const attachments = await messageAttachments(
    user,
    conversationId,
    body.attachmentIds,
  );

  const messageId = stableId(
    "message",
    conversationId,
    user.id,
    fields.clientId,
  );
  let message = await Message.findById(messageId).lean();
  if (!message) {
    const recent = await Message.countDocuments({
      senderId: id(user.id),
      createdAt: { $gte: new Date(Date.now() - 60_000) },
    });
    if (recent >= 30)
      throw new MessagingError(
        "You’re sending messages too quickly. Try again in a minute.",
        429,
      );

    try {
      message = (
        await Message.create({
          _id: messageId,
          conversationId: conversation._id,
          senderId: user.id,
          recipientId:
            user.role === "customer"
              ? conversation.vendorId
              : conversation.buyerId,
          ...fields,
          attachments,
        })
      ).toObject();
    } catch (error) {
      if (error.code !== 11000) throw error;
      message = await Message.findById(messageId).lean();
    }
  }

  if (message.text !== fields.text)
    throw new MessagingError(
      "This message reference was already used. Start a new message.",
      409,
    );
  if (
    JSON.stringify(
      (message.attachments || []).map((file) => String(file.id)),
    ) !== JSON.stringify(attachments.map((file) => file.id))
  )
    throw new MessagingError(
      "This message reference was already used with different files.",
      409,
    );
  await MessageAttachment.updateMany(
    { _id: { $in: attachments.map((file) => file.id) } },
    { $unset: { expiresAt: 1 } },
  );

  // Retrying also repairs the inbox order if a previous request lost its connection after insertion.
  await Conversation.updateOne(
    { _id: conversation._id },
    { $max: { lastMessageAt: message.createdAt } },
  );
  return serializeMessage(message);
}

export async function markRead(user, conversationId, body) {
  const messageIds = readMessageIds(body);
  const conversation = await ownedConversation(user, conversationId);

  // Acknowledge only displayed incoming messages, never messages that arrived during the request.
  await Message.updateMany(
    {
      _id: { $in: messageIds.map(id) },
      conversationId: conversation._id,
      recipientId: id(user.id),
      readAt: null,
    },
    { $set: { readAt: new Date() } },
  );
}

export async function unreadTotal(user) {
  const records = await Message.aggregate([
    { $match: { recipientId: id(user.id), readAt: null } },
    {
      $lookup: {
        from: "conversations",
        localField: "conversationId",
        foreignField: "_id",
        pipeline: [{ $match: participantFilter(user) }],
        as: "conversation",
      },
    },
    { $match: { "conversation.0": { $exists: true } } },
    { $count: "count" },
  ]);

  return records[0]?.count || 0;
}
