import { useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import Link from "next/link";
export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      id:1,
      name:"Dashboard Overview",
      url:"/dashboard-overview"
    },
   
    {
      id:2,
      name:"Upload Product",
      url:"/upload-product"
    },
   
    {
      id:3,
      name:"My Inventory",
      url:"/my-inventory"
    },
    {
      id:4,
      name:"Orders & Leads",
      url:"/orders-leads"
    },
    {
      id:5,
      name:"Sales Automation",
      url:"/sales-automation"
    },
    {
      id:6,
      name:"Profile & Verification",
      url:"/profile-verification"
    }
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="md:hidden p-4">
        <button onClick={() => setIsOpen(true)}>
          <FiMenu size={24} />
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={` top-0 left-0 h-screen w-74 bg-black text-white z-50 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 md:translate-x-0 md:static`}
      >
        {/* Close button (mobile) */}
        <div className="flex justify-between items-center p-4 md:hidden">
          <h2 className="text-lg font-bold">AbaCraft</h2>
          <FiX size={24} onClick={() => setIsOpen(false)} />
        </div>

        {/* Logo */}
        <div className="hidden md:block p-6 text-xl font-bold border-b border-gray-700">
          AbaCraft
        </div>

        {/* Menu */}
        <ul className="p-4 space-y-3">
          {menuItems.map((item, index) => (
            <li
              key={item.id}
              className={`p-2 rounded cursor-pointer hover:bg-purple-600 ${
                index === 0 ? "bg-gray-800" : ""
              }`}
            >
              <Link href={item.url} className="block">
                {item.name}
              </Link>
            </li>
          ))}
        </ul>

        {/* Bottom Section */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-700">
          <p className="mb-2 cursor-pointer hover:text-purple-400">Settings</p>
          <p className="cursor-pointer hover:text-red-400">Logout</p>
        </div>
      </div>
    </>
  );
}