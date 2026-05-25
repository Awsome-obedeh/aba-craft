"use client";
import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function LayoutWrapper({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <div className="flex-1 md:ml-60">
        <Navbar setIsOpen={setIsOpen} />
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}