import test from "node:test";
import assert from "node:assert/strict";
import {
  validateMessage,
  objectId,
  parseCursor,
  makeCursor,
  readMessageIds,
} from "../src/app/lib/messaging/validation.js";

const id = "507f1f77bcf86cd799439011";
const clientId = "a05a269f-3bab-4405-a152-1994332a8e22";

test("messages trim whitespace while treating markup as plain text", () => {
  assert.deepEqual(
    validateMessage({
      text: "  <script>hello</script> \n",
      clientId,
      senderId: "forged",
    }),
    { text: "<script>hello</script>", clientId },
  );
});

test("empty, oversized and non-string messages fail validation", () => {
  for (const text of [null, {}, " \n\t ", "a".repeat(2001)])
    assert.throws(() => validateMessage({ text, clientId }));
  assert.equal(
    validateMessage({ text: "a".repeat(2000), clientId }).text.length,
    2000,
  );
  assert.throws(() => validateMessage({ text: "Hello", clientId: "bad" }));
});

test("object IDs cannot carry MongoDB operators or URL paths", () => {
  for (const value of [null, { $ne: null }, "../../auth", "not-an-id"])
    assert.throws(() => objectId(value));
  assert.equal(objectId(id.toUpperCase()), id);
});

test("pagination round trips and rejects malformed dates and identifiers", () => {
  const date = new Date("2026-10-05T12:00:00.000Z");
  assert.deepEqual(parseCursor(makeCursor({ _id: id, createdAt: date })), {
    date,
    id,
  });
  for (const value of [
    "bad",
    `2026-10-05_${id}`,
    `${date.toISOString()}_${id}_extra`,
  ])
    assert.throws(() => parseCursor(value));
});

test("read acknowledgements are bounded and deduplicated", () => {
  assert.deepEqual(readMessageIds({ messageIds: [id, id] }), [id]);
  for (const messageIds of [[], ["bad"], new Array(41).fill(id)])
    assert.throws(() => readMessageIds({ messageIds }));
});
