"use client";

export default function Navbar({ setIsOpen }) {
  return (
    <header className="flex items-center justify-between bg-gray-100 p-4 w-screen">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOpen(true)}
          className="md:hidden text-xl"
        >
          ☰
        </button>

        <input
          type="text"
          placeholder="Search..."
          className="hidden sm:block w-64 md:w-80 px-4 py-2 rounded-full border outline-none"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <span className="cursor-pointer">🔔</span>

        <div className="hidden sm:flex items-center gap-1 cursor-pointer">
          <span>🇬🇧</span>
          <span>English</span>
        </div>

        <div className="flex items-center gap-2 cursor-pointer">
          <img
            src="https://i.pravatar.cc/30"
            alt="user"
            className="w-8 h-8 rounded-full"
          />
          <div className="hidden md:block">
            <p className="text-sm font-semibold">Sandra Ejiofor</p>
            <span className="text-xs text-gray-500">Vendor</span>
          </div>
        </div>
      </div>
    </header>
  );
}