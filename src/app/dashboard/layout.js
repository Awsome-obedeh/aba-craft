
import AuthProvider from "@/components/AuthProvider";

// Nested route segment layout. The <html> and <body> tags live in the
// root app/layout.js — duplicating them here causes a hydration error
// because <html> ends up nested inside the root <body>.
export default function DashboardLayout({ children }) {
    return <AuthProvider>{children}</AuthProvider>;
}
