"use client";

import { useRef, useState } from "react";
import { api } from "@/app/lib/axios";
import { messageError } from "@/app/lib/messaging/client";
import { DesignIcon } from "@/components/buyer/BuyerShell";

export function AttachmentPicker({
  conversationId,
  getConversationId,
  files,
  onChange,
  disabled,
  onBusy,
  compact = false,
}) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(event) {
    const selected = [...event.target.files];
    event.target.value = "";
    if (!selected.length) return;
    if (files.length + selected.length > 5) {
      setError("Attach up to five files.");
      return;
    }
    if (
      selected.some(
        (file) =>
          !["image/jpeg", "image/png", "application/pdf"].includes(file.type) ||
          file.size > 10 * 1024 * 1024,
      )
    ) {
      setError("Use JPG, PNG or PDF files, up to 10 MB each.");
      return;
    }
    setBusy(true);
    onBusy?.(true);
    setError("");
    const uploaded = [...files];
    try {
      const id = conversationId || (await getConversationId());
      for (const file of selected) {
        const { data } = await api.post(
          `/conversations/${id}/attachments`,
          file,
          {
            baseURL: "/api",
            timeout: 60_000,
            headers: {
              "Content-Type": file.type,
              "X-File-Name": encodeURIComponent(file.name),
            },
          },
        );
        uploaded.push(data.attachment);
        onChange([...uploaded]);
      }
    } catch (error) {
      setError(messageError(error));
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }

  return (
    <div className={compact ? "" : "buyer-upload"}>
      <input
        ref={input}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        multiple
        onChange={upload}
        disabled={disabled || busy}
        aria-label="Attach JPEG, PNG or PDF files"
      />
      <button
        type="button"
        disabled={disabled || busy || files.length === 5}
        onClick={() => input.current?.click()}
        className={compact ? "buyer-text-button" : "buyer-button secondary"}
      >
        <DesignIcon name="imgIcon1" size={18} />
        {busy ? "Uploading…" : "Attach files"}
      </button>
      {!compact && (
        <p className="mt-3">
          JPG, PNG, PDF · Up to 10 MB each · Maximum 5 files
        </p>
      )}
      {error && (
        <p role="alert" className="buyer-error">
          {error}
        </p>
      )}
      <ul className="buyer-files mt-3">
        {files.map((file) => (
          <li key={file.id}>
            <span>
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </span>
            <button
              type="button"
              aria-label={`Remove ${file.name}`}
              disabled={disabled || busy}
              onClick={() =>
                onChange(files.filter((item) => item.id !== file.id))
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AttachmentDownload({ file }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.get(`/attachments/${file.id}`, {
        baseURL: "/api",
        responseType: "blob",
        timeout: 60_000,
      });
      const url = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Could not download this file. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="buyer-attachment-link"
        disabled={busy}
        onClick={download}
      >
        <DesignIcon name="imgIcon1" size={16} />
        {busy ? "Downloading…" : file.name}
      </button>
      {error && (
        <p role="alert" className="buyer-error">
          {error}
        </p>
      )}
    </>
  );
}
