import { useAuthStore } from "@/app/store/authStore";
import { api } from "@/app/lib/axios";

/**
 * Logs the user out: clears the in-memory access token via Zustand,
 * hits the backend to clear the httpOnly refresh cookie, and redirects
 * to the sign-in page.
 *
 * Note: `api` is imported lazily inside the function so this module can
 * be imported from server components without dragging axios in.
 *
 * @param {object} router - Next.js router (e.g. from useRouter())
 */
export const logout = async (router) => {
    try {
        await api.post("/auth/logout");
    } catch (error) {
        // Cookie may already be gone — clear local state regardless.
        console.error("Logout request failed:", error?.message);
    } finally {
        useAuthStore.getState().clearAuth();
        if (router?.push) {
            router.push("/auth/sign-in");
        } else if (typeof window !== "undefined") {
            window.location.href = "/auth/sign-in";
        }
    }
};
