"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({
  children,
  allowedRoles = [],
}) {
  const { user, loading, isAuthenticated } = useAuth();

  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Not logged in
      if (!isAuthenticated) {
        router.push("/login");
      }

      // Role authorization
      if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(user?.role)
      ) {
        router.push("/login");
      }
    }
  }, [loading, isAuthenticated, user, router, allowedRoles]);

  if (loading) {
    return <p>Loading...</p>;
  }

  // Prevent unauthorized render
  if (!isAuthenticated) {
    return null;
  }

  return children;
}