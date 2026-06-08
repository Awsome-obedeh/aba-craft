"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FiGrid,
  FiUpload,
  FiBox,
  FiShoppingBag,
  FiSettings,
  FiLogOut,
  FiUser,
  FiMenu,
  FiX,
} from "react-icons/fi";

const sidebarLinks = {
  vendor: [
    {
      name: "Dashboard Overview",
      href: "/dashboard",
      icon: FiGrid,
    },
    {
      name: "Upload Product",
      href: "/dashboard/vendor/upload-product",
      icon: FiUpload,
    },
    {
      name: "My Inventory",
      href: "/dashboard/vendor/inventory",
      icon: FiBox,
    },

     {
      name: "My Products",
      href: "/dashboard/products",
      icon: FiShoppingBag,
    },
    
    {
      name: "Orders & Leads",
      href: "/dashboard/vendor/orders",
      icon: FiShoppingBag,
    },
    {
      name: "Sales Automation",
      href: "/dashboard/vendor/sales",
      icon: FiGrid,
    },
    {
      name: "Profile & Verification",
      href: "/dashboard/vendor/profile",
      icon: FiUser,

      
    },
   
  ],

  buyer: [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: FiGrid,
    },
    {
      name: "My Orders",
      href: "/dashboard/orders",
      icon: FiShoppingBag,
    },
  ],

  admin: [
    {
      name: "Dashboard",
      href: "/dashboard/admin/",
      icon: FiGrid,
    },
    {
      name: "Manage Users",
      href: "/dashboard/admin/users",
      icon: FiUser,
    },
    {
      name: "Approve Products",
      href: "/dashboard/admin/publish-products",
      icon: FiShoppingBag,
    }
  ],
};

export default function Sidebar({ role}) {
  const [open, setOpen] = useState(false);

 

  const links = sidebarLinks[role];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-black text-white p-2 rounded-md"
      >
        <FiMenu />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen w-[250px] bg-black text-white z-50 transform transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h1 className="text-xl font-bold">Aba Crafts</h1>

          <button
            onClick={() => setOpen(false)}
            className="lg:hidden"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="flex flex-col justify-between h-[90%]">
          <div className="space-y-2 px-3 py-5">
            {links?.map((link, index) => {
              const Icon = link.icon;

              return (
                <Link
                  key={index}
                  href={link.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white hover:text-black transition"
                >
                  <Icon size={18} />
                  <span className="text-sm">{link.name}</span>
                </Link>
              );
            }) || <p className="text-sm text-gray-500">No links available</p>}
          </div>

          <div className="px-3 pb-5 space-y-2">
            <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-white hover:text-black transition">
              <FiSettings />
              Settings
            </button>

            <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-red-500 transition">
              <FiLogOut />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}