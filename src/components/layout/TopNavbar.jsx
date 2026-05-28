"use client";

import {
    FiBell,
    FiChevronDown,
    FiSearch,
} from "react-icons/fi";

export default function TopNavbar({email,role}) {
    return (
        <header className=" sticky top-0 z-30 bg-white border-b border-gray-200 px-4 md:px-8 py-4">
            <div className="flex items-center justify-between gap-4">

                {/* Search */}
                <div className="hidden md:flex items-center bg-[#F5F5F5] px-4 py-2 rounded-full w-[350px]">
                    <FiSearch className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search"
                        className="bg-transparent outline-none ml-2 w-full text-sm"
                    />
                </div>

                {/* Right */}
                <div className="flex items-center gap-4 ml-auto">

                    {/* Notification */}
                    <div className="relative">
                        <FiBell size={22} />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] h-4 w-4 rounded-full flex items-center justify-center">
                            3
                        </span>
                    </div>

                    {/* Language */}
                    <div className="hidden md:flex items-center gap-2">
                        <img
                            src="https://flagcdn.com/w40/gb.png"
                            alt="flag"
                            className="w-6 h-4 object-cover"
                        />
                        <span className="text-sm">English</span>
                        <FiChevronDown />
                    </div>

                    {/* Profile */}
                    <div className="flex items-center gap-3">
                        <img
                            src="https://i.pravatar.cc/40"
                            alt="user"
                            className="w-10 h-10 rounded-full"
                        />

                        <div className="hidden md:block">
                            <h4 className="text-sm font-semibold">
                                {email}
                            </h4>
                            <p className="text-xs text-gray-500">
                                {role}
                            </p>
                        </div>

                        <FiChevronDown />
                    </div>
                </div>
            </div>
        </header>
    );
}