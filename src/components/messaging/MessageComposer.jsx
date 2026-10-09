"use client";

import { useRef, useState } from "react";
import { MAX_MESSAGE_LENGTH } from "@/app/lib/messaging/validation";
import {
  messagingApi,
  messageError,
  notifyInbox,
} from "@/app/lib/messaging/client";
import { useMessageDraftStore } from "@/app/store/messageDraftStore";
import { DesignIcon } from "@/components/buyer/BuyerShell";
import { AttachmentPicker } from "./Attachments";

export default function MessageComposer({ conversationId, userId, onSent }) {
  const draftKey = `${userId}:${conversationId}`;
  const draft = useMessageDraftStore((state) => state.drafts[draftKey]);
  const { setDraft, clearDraft } = useMessageDraftStore.getState();
  const text = draft?.text || "";
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emoji, setEmoji] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const input = useRef(null);
  const inFlight = useRef(false);

  function changeText(value) {
    setDraft(draftKey, { text: value, clientId: null });
    setError("");
    setNotice("");
  }

  async function send(event) {
    event.preventDefault();
    if (inFlight.current || uploading) return;
    if (!text.trim() && !files.length) {
      setError("Write a message before sending.");
      input.current?.focus();
      return;
    }
    if (text.length > MAX_MESSAGE_LENGTH) {
      setError(`Keep your message within ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }
    const clientId = draft?.clientId || crypto.randomUUID();
    setDraft(draftKey, { text, clientId });
    setSending(true);
    inFlight.current = true;
    setError("");
    setNotice("");
    try {
      const { data } = await messagingApi.post(`/${conversationId}/messages`, {
        text: text.trim() || "Shared attachments",
        clientId,
        attachmentIds: files.map((file) => file.id),
      });
      onSent(data.message);
      clearDraft(draftKey, clientId);
      setFiles([]);
      setNotice("Message sent.");
      notifyInbox(conversationId);
    } catch (error) {
      setError(
        `${messageError(error)} Your draft is kept. Send again to retry.`,
      );
    } finally {
      inFlight.current = false;
      setSending(false);
      input.current?.focus();
    }
  }

  return (
    <form
      onSubmit={send}
      className="buyer-composer shrink-0 max-h-[50vh] overflow-y-auto"
    >
      <div className="buyer-toolbar">
        <button
          type="button"
          aria-label="Insert emoji"
          aria-expanded={emoji}
          onClick={() => setEmoji((value) => !value)}
        >
          <DesignIcon name="imgIcFluentEmojiSad24Regular" size={20} />
        </button>
        <AttachmentPicker
          compact
          conversationId={conversationId}
          files={files}
          onChange={(value) => {
            setFiles(value);
            setDraft(draftKey, { text, clientId: null });
          }}
          disabled={sending}
          onBusy={setUploading}
        />
      </div>
      {emoji && (
        <div className="buyer-emoji" aria-label="Choose an emoji">
          {["👋", "😊", "👍", "🙏", "❤️"].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`Insert ${value}`}
              onClick={() => {
                changeText((text + value).slice(0, MAX_MESSAGE_LENGTH));
                setEmoji(false);
                input.current?.focus();
              }}
            >
              {value}
            </button>
          ))}
        </div>
      )}
      <label htmlFor="message-text" className="sr-only">
        Your message
      </label>
      <textarea
        ref={input}
        id="message-text"
        value={text}
        disabled={sending}
        maxLength={MAX_MESSAGE_LENGTH}
        rows={2}
        onChange={(event) => changeText(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "message-error message-help" : "message-help"}
        placeholder="Please type your message here.."
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            event.currentTarget.form.requestSubmit();
          }
        }}
      />
      <div className="buyer-composer-bottom">
        <span id="message-help">
          Quick send ‘Enter’ / Start a new line ‘Shift + Enter’
          <span className="block">
            {text.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </span>
        <button
          type="submit"
          disabled={sending || uploading || (!text.trim() && !files.length)}
          className="buyer-button"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
      {error && (
        <p id="message-error" role="alert" className="buyer-error">
          {error}
        </p>
      )}
      <span role="status" className="sr-only">
        {notice}
      </span>
    </form>
  );
}
