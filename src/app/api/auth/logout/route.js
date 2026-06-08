// POST /api/auth/logout
// Clears the httpOnly refresh-token cookie. Idempotent — safe to call
// even if the user is already logged out (the cookie just isn't there).

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const POST = async () => {
    try {
        const cookieStore = await cookies();
        cookieStore.delete("refreshToken");
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("LOGOUT ERROR:", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
};
