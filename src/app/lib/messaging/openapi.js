const string = { type: "string" };
const id = { type: "string", pattern: "^[a-fA-F0-9]{24}$" };
const object = (properties) => ({ type: "object", properties });
const json = (schema) => ({ "application/json": { schema } });
const query = (name) => ({ in: "query", name, schema: string });
const path = (name, schema = id) => ({
  in: "path",
  name,
  required: true,
  schema,
});
const message = object({
  text: { type: "string", minLength: 1, maxLength: 2000 },
  clientId: {
    type: "string",
    minLength: 16,
    maxLength: 64,
    description:
      "Stable retry reference; create a new UUID when content or attachments change.",
  },
  attachmentIds: { type: "array", maxItems: 5, uniqueItems: true, items: id },
});
message.required = ["text", "clientId"];

function operation(
  operationId,
  summary,
  { parameters = [], body, description = "", binary = false } = {},
) {
  return {
    tags: ["Buyer communication"],
    operationId,
    summary,
    description,
    security: [{ bearerAuth: [] }],
    parameters,
    ...(body ? { requestBody: { required: true, content: json(body) } } : {}),
    responses: {
      200: {
        description: binary
          ? "Private attachment. Content-Disposition is attachment; no-store and nosniff headers are set."
          : "Success. Private responses use Cache-Control: private, no-store.",
        content: binary
          ? {
              "application/octet-stream": {
                schema: { type: "string", format: "binary" },
              },
            }
          : json({ type: "object" }),
      },
      ...Object.fromEntries(
        [400, 401, 403, 404, 409, 413, 415, 429, 503].map((code) => [
          code,
          {
            description: {
              400: "Invalid request",
              401: "Sign in required or session expired",
              403: "Role not permitted",
              404: "Not found or not a participant",
              409: "Conflict or account unavailable",
              413: "Request too large",
              415: "Unsupported file",
              429: "Rate limit exceeded",
              503: "Service unavailable",
            }[code],
            content: json(
              object({ success: { type: "boolean" }, message: string }),
            ),
          },
        ]),
      ),
    },
  };
}

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
const buyerBody = object({
  id,
  remove: { type: "boolean" },
  newsletter: { type: "boolean" },
  consent: { type: "boolean" },
  advertising: { type: "boolean" },
  analytics: { type: "boolean" },
  personalization: { type: "boolean" },
  orderId: id,
  productId: id,
  rating: { type: "integer", minimum: 1, maximum: 5 },
  text: { type: "string", maxLength: 2000 },
  buyerName: { type: "string", maxLength: 100 },
  quantity: { type: "integer", minimum: 1, maximum: 100000 },
  unitPrice: {
    type: "number",
    exclusiveMinimum: true,
    minimum: 0,
    maximum: 100000000,
  },
  leadTime: { type: "string", maxLength: 80 },
  notes: {
    type: "string",
    maxLength: 1600,
    description: "Also limited to 300 words.",
  },
  resolution: {
    type: "string",
    enum: ["documentation", "replacement", "refund"],
  },
  clientId: message.properties.clientId,
  attachmentIds: message.properties.attachmentIds,
});

const paths = {
  "/conversations": {
    get: operation("listConversations", "List the caller’s conversations", {
      parameters: [query("search"), query("before"), query("unread")],
      description:
        "Customer/vendor only. Returns conversations and nextCursor, at most 25. Search is limited to 100 characters. Cursors are ISO timestamps followed by underscore and ObjectId. Only the caller’s participant records are included.",
    }),
    post: operation(
      "startConversation",
      "Start or reuse a product or order conversation",
      {
        body: {
          ...object({ productId: id, orderId: id }),
          required: ["productId"],
        },
        description:
          "Customer only. Returns {success, conversation:{id}}. Vendor is derived from the approved product or an owned order line. Concurrent retries return the same conversation. An order conversation remains available after the listing is withdrawn.",
      },
    ),
  },
  "/conversations/{id}/messages": {
    get: operation(
      "getConversationMessages",
      "Read conversation details and messages",
      {
        parameters: [path("id"), query("before")],
        description:
          "Participant only. Returns conversation, messages in chronological order, and nextCursor. Page size 40. Messages include id, senderId, text, clientId, createdAt, readAt and attachments. Reads do not automatically mark messages read.",
      },
    ),
    post: operation(
      "sendConversationMessage",
      "Send a message or retry its stable clientId",
      {
        parameters: [path("id")],
        body: message,
        description:
          "Participant only. Returns message. References reused with different text or files return 409. At most 30 new messages per sender per minute (best-effort count). Attachments must be owned uploads in this conversation.",
      },
    ),
  },
  "/conversations/{id}/read": {
    post: operation(
      "markConversationRead",
      "Mark displayed received messages read",
      {
        parameters: [path("id")],
        body: {
          ...object({
            messageIds: { type: "array", minItems: 1, maxItems: 40, items: id },
          }),
          required: ["messageIds"],
        },
      },
    ),
  },
  "/conversations/unread": {
    get: operation("getUnreadMessageCount", "Get unreadCount for the caller"),
  },
  "/conversations/{id}/attachments": {
    post: {
      ...operation(
        "uploadConversationAttachment",
        "Upload a private JPEG, PNG or PDF",
        {
          parameters: [
            path("id"),
            {
              in: "header",
              name: "X-File-Name",
              required: true,
              schema: string,
            },
          ],
          description:
            "Raw binary body, not multipart. Maximum 10 MB; validates MIME and magic bytes. Up to 5 files per message. Best-effort quota 50 uploads / 100 MB per account daily. Unsent files expire after 24 hours. Returns attachment {id,name,type,size}. Signature validation does not provide malware scanning.",
        },
      ),
      requestBody: {
        required: true,
        content: Object.fromEntries(
          ["image/jpeg", "image/png", "application/pdf"].map((type) => [
            type,
            { schema: { type: "string", format: "binary" } },
          ]),
        ),
      },
    },
  },
  "/attachments/{id}": {
    get: operation(
      "downloadMessageAttachment",
      "Download a private attachment",
      {
        parameters: [path("id")],
        binary: true,
        description:
          "Authenticated uploader, or the conversation participant after a message containing the file is sent. No public storage URL is exposed.",
      },
    ),
  },
  "/buyer/{section}": {
    get: operation("getBuyerAccountSection", "Read a buyer account section", {
      parameters: [
        path("section", { type: "string", enum: sections }),
        query("page"),
        query("order"),
      ],
      description:
        "Customer only. Orders/tracking/quote/issue/reviews return owned orders (20/page), page and hasMore. Reviews also return the caller’s submitted reviews. Wishlist/recently-viewed/recommendations return products. Followed returns safe seller display data and two products per seller. Preferences return newsletter and cookies. No courier estimates or scans are fabricated.",
    }),
    patch: operation(
      "saveBuyerAccountSection",
      "Save a collection or account preference",
      {
        parameters: [
          path("section", {
            type: "string",
            enum: [
              "wishlist",
              "followed",
              "recently-viewed",
              "newsletter",
              "cookies",
            ],
          }),
        ],
        body: buyerBody,
        description:
          "Collections take id and optional remove. Limits: 100 wishlist/followed, 40 recent products. Newsletter requires newsletter boolean and consent:true to opt in. Cookies require all three boolean flags. Only listed fields are saved. This persists consent; it does not send newsletters or load tracking scripts.",
      },
    ),
    post: operation(
      "submitBuyerAction",
      "Submit a purchase review, quote request or issue report",
      {
        parameters: [
          path("section", {
            type: "string",
            enum: ["reviews", "quote", "issue"],
          }),
        ],
        body: buyerBody,
        description:
          "Requires owned orderId/productId. Reviews require delivered status, rating and text; one per order item. Quote: unitPrice, quantity, leadTime, optional notes. Issue: buyerName, quantity no greater than ordered, resolution, notes. Quote/issue require clientId and support attachmentIds; persist an idempotent request and send it to the order’s supplier inbox. Returns conversationId. Never modifies the order or payment.",
      },
    ),
  },
  "/reviews/{productId}": {
    get: operation(
      "listPurchaseReviews",
      "Read anonymous verified purchase reviews",
      {
        parameters: [path("productId"), query("page")],
        description:
          "Customer/vendor only. Published products only. Returns reviews (rating,text,createdAt) without buyer identities; 10/page and hasMore.",
      },
    ),
  },
};

export default paths;
