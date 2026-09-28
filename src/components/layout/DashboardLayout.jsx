"use client";

import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";

export default function DashboardLayout({ children, role,email }) {
  return (
    <div className="dashboard-shell flex min-h-screen bg-cream">
      
      {/* Sidebar */}
      <Sidebar role={role} />

      {/* Main Section */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-[244px]">
        <TopNavbar email={email} role={role} />

        <main className="min-w-0 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
