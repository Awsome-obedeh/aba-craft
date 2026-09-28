import { generateAccessToken, verifyRefreshToken } from "@/app/lib/jwt";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import connectDB from "@/app/lib/connect";
import User from "@/models/User";



export async function POST() {

    try {

        const cookieStore = await cookies();

        const refreshToken = cookieStore.get("refreshToken")?.value;

        if (!refreshToken) {

            return NextResponse.json(
                { message: "Unauthorized" },
               
                {
                    status: 401
                }
            );

        }

        const decoded = verifyRefreshToken(refreshToken);
        await connectDB();
        const currentUser = await User.findById(decoded.id);
        if (!currentUser || (currentUser.sessionVersion || 0) !== (decoded.sessionVersion || 0)) {
            return NextResponse.json({ message: "Session expired" }, { status: 401 });
        }

        const user={
            id: decoded.id,
            role: decoded.role,
            email: decoded.email,
            sessionVersion: currentUser.sessionVersion || 0
        }

        const accessToken = generateAccessToken({
            id: decoded.id,
            role: decoded.role,
            email: decoded.email,
            sessionVersion: currentUser.sessionVersion || 0

        });

        return NextResponse.json({ accessToken, user });

    } catch {

        return NextResponse.json(
            { message: "Invalid refresh" },
            {
                status: 401
            }
        );

    }

}
