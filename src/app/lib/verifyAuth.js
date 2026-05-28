
import { jwtVerify } from "jose"; 

/**
 * Verifies the JWT and checks user roles
 * @param {Request} request - The incoming Next.js request object
 * @param {Array<string>} allowedRoles - Optional array of roles permitted to access the route
 */
export async function verifyAuth(request, allowedRoles = []) {
    try {
       
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return { isValid: false, status: 401, message: "Authentication token missing or invalid format." };
        }

        const token = authHeader.split(" ")[1];

        
        const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
        const { payload } = await jwtVerify(token, secret);

        // Authorization Check (Role verification)
        if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
            return { 
                isValid: false, 
                status: 403, 
                message: `Forbidden: You do not have the required permissions (${allowedRoles.join(", ")}).` 
            };
        }

        // Return the decoded payload (contains userId, role, etc.)
        return { isValid: true, user: payload };

    } catch (error) {
        console.error("JWT Verification Security Error:", error.message);
        
        // Differentiate between expired tokens and bad signatures so the Axios Interceptor knows when to refresh
        if (error.name === "JWTExpired") {
            return { isValid: false, status: 401, message: "Token expired" };
        }
        
        return { isValid: false, status: 401, message: "Invalid signature or malformed token." };
    }
}