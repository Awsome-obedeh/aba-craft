"use client";

import { useEffect, useId, useRef } from "react";
import { CircleCheck, CircleX, X } from "lucide-react";

export default function ProductUpdateResult({ success, message, onDismiss }) {
  const dialog = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const element = dialog.current;
    const focused = document.activeElement;
    element.showModal();
    return () => { element.close(); if (focused?.isConnected) focused.focus(); };
  }, []);
  const Icon = success ? CircleCheck : CircleX;
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); onDismiss(); }} aria-labelledby={titleId} aria-describedby={descriptionId} className="m-auto w-[calc(100%_-_2rem)] max-w-[460px] rounded-xl border-0 bg-white p-0 text-stone-800 shadow-2xl backdrop:bg-black/40">
    <div className="relative flex flex-col items-center px-7 py-10 text-center">
      <button type="button" onClick={onDismiss} aria-label="Close update message" className="absolute right-3 top-3 rounded-md p-2 text-stone-400 hover:bg-stone-100"><X size={17} /></button>
      <span className={`mb-5 flex h-12 w-12 items-center justify-center rounded-full ${success ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"}`}><Icon size={27} /></span>
      <h2 id={titleId} className={`text-lg font-semibold ${success ? "text-[#a17b1f]" : "text-red-700"}`}>{success ? "Product updated successfully" : "Failed to update product"}</h2>
      <p id={descriptionId} className="mt-3 max-w-sm break-words text-sm leading-6 text-stone-500">{message || (success ? "Your changes have been saved." : "Your changes have not been saved. Please try again.")}</p>
      <button type="button" autoFocus onClick={onDismiss} className="mt-6 min-w-28 rounded-md bg-[#b59127] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#98771d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b59127]">{success ? "Done" : "Back to editing"}</button>
    </div>
  </dialog>;
}
