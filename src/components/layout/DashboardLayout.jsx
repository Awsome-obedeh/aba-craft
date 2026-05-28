"use client";

import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";

export default function DashboardLayout({ children, role,email }) {
  return (
    <div className="flex min-h-screen bg-[#F4F4F4]">
      
      {/* Sidebar */}
      <Sidebar role={role} />

      {/* Main Section */}
      <div className="flex-1 flex flex-col lg:ml-[250px]">
        <TopNavbar email={email} role={role} />

        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}