"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Decode JWT payload
      const payload = JSON.parse(atob(token.split(".")[1]));

      // Check token expiration
      const currentTime = Date.now() / 1000;

      if (payload.exp < currentTime) {
        localStorage.removeItem("token");
        setUser(null);
      } else {
        setUser(payload);
      }
    } catch (error) {
      console.log("Invalid token", error);
      localStorage.removeItem("token");
      setUser(null);
    }

    setLoading(false);
  }, []);

  // Login function
  const login = (token) => {
    localStorage.setItem("token", token);

    const payload = JSON.parse(atob(token.split(".")[1]));

    setUser(payload);
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);

    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);



// dashbaord or protected page
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "vendor"]}>
      <div>
        <h1>Dashboard</h1>
      </div>
    </ProtectedRoute>
  );
}