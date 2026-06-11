"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/store/authStore";

export default function ProtectedRoute({
  children,
  allowedRoles = [],
}) {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Not logged in - check for access token existence
    const token = useAuthStore.getState().accessToken;
    if (!token || !user) {
      router.push("/auth/sign-in");
      return;
    }

    // Role authorization
    if (
      allowedRoles.length > 0 &&
      user?.role &&
      !allowedRoles.includes(user.role)
    ) {
      router.push("/auth/sign-in");
    }
  }, [user, router, allowedRoles]);

  // Show loading while checking
  const token = typeof window !== "undefined" ? useAuthStore.getState().accessToken : null;
  if (!token || !user) {
    return <p>Loading...</p>;
  }

  return children;
}