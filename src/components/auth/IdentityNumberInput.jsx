"use client";

import { useState } from "react";

export default function IdentityNumberInput({ label, value, onChange, digits, error }) {
  const [editing, setEditing] = useState(true);
  const complete = new RegExp(`^\\d{${digits}}$`).test(value);
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          aria-label={label}
          aria-invalid={Boolean(error)}
          type="text"
          inputMode={editing ? "numeric" : "text"}
          autoComplete="off"
          readOnly={!editing}
          maxLength={editing ? digits : undefined}
          value={editing ? value : `${"\u2022".repeat(digits - 4)} ${value.slice(-4)}`}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, digits))}
          placeholder={`Enter your ${digits}-digit ${label}`}
          className={`h-9 w-full max-w-sm rounded border bg-white px-3 text-sm outline-none focus:border-[#bd9627] ${error ? "border-red-500" : "border-[#cfcfcf]"}`}
        />
        {complete && <button type="button" onClick={() => setEditing(!editing)} className="text-xs underline">{editing ? "Hide number" : "Edit"}</button>}
      </div>
      {complete && <p className="mt-1 text-xs text-gray-500">Number entered. Verification is pending.</p>}
      {error && <p role="alert" className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
