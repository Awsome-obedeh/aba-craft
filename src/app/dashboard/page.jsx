"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/store/authStore";

export default function DashboardIndexPage() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);

    useEffect(() => {
        if (!user) {
            router.replace("/auth/sign-in");
            return;
        }
        // Send each role to its most useful starting page
        switch (user.role) {
            case "vendor":
                router.replace("/dashboard/vendor/upload-product");
                break;
            case "customer":
                router.replace("/dashboard/products");
                break;
            case "admin":
                router.replace("/dashboard/admin");
                break;
            default:
                router.replace("/auth/sign-in");
        }
    }, [user, router]);

    return (
        <div className="min-h-screen flex items-center justify-center text-sm text-gray-400 animate-pulse">
            Loading your dashboard…
        </div>
    );
}
