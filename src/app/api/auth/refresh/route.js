import { generateAccessToken, verifyRefreshToken } from "@/app/lib/jwt";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";



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

        const user={
            id: decoded.id,
            role: decoded.role,
            email: decoded.email
        }

        const accessToken = generateAccessToken({
            id: decoded.id,
            role: decoded.role,
            email: decoded.email

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