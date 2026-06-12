import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import User from "@/models/User";
import { NextResponse } from "next/server";

export const GET = async (req) => {
    const auth = await verifyAuth(req, ["admin"]);

    // If authentication or authorization fails
    if (!auth.isValid) {
        return NextResponse.json({
            success: false,
            message: auth.message
        },
        { status: auth.status });
    }

    try {
        connectDB();

        // Fetch all users with basic information
        const users = await User.find({})
            .select('_id name email role avatar businessName isActive createdAt')
            .sort({ createdAt: -1 });

        // Format users for frontend consumption
        const formattedUsers = users.map(user => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            businessName: user.businessName,
            isActive: user.isActive,
            joinedDate: user.createdAt.toLocaleDateString()
        }));

        return NextResponse.json({
            success: true,
            users: formattedUsers
        }, { status: 200 });
    } catch (error) {
        console.log("ERROR FETCHING USERS:", error);
        return NextResponse.json({
            success: false,
            message: "Error fetching users",
            error: error.message
        }, { status: 500 });
    }
};

// Handle DELETE requests
export const DELETE = async (req) => {
    const auth = await verifyAuth(req, ["admin"]);

    if (!auth.isValid) {
        return NextResponse.json({
            success: false,
            message: auth.message
        }, { status: auth.status });
    }

    try {
        connectDB();
        
        // Check if it's a bulk delete (with body) or individual delete (with URL param)
        const contentType = req.headers.get('content-type') || '';
        const isBulkDelete = contentType.includes('application/json');
        
        if (isBulkDelete) {
            // Bulk delete: expect { ids: [...] } in body
            const { ids } = await req.json();

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return NextResponse.json({
                    success: false,
                    message: "No user IDs provided"
                }, { status: 400 });
            }

            // Delete users
            const result = await User.deleteMany({ _id: { $in: ids } });

            return NextResponse.json({
                success: true,
                message: `${result.deletedCount} user(s) deleted successfully`,
                deletedCount: result.deletedCount
            }, { status: 200 });
        } else {
            // Individual delete: expect /admin/users/{id} in URL
            const url = new URL(req.url);
            const pathname = url.pathname; // e.g., /api/admin/users/123 or /api/admin/users
            
            // Remove trailing slash if present for consistent matching
            const cleanPathname = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
            
            // Split path into segments and filter out empty strings
            const pathSegments = cleanPathname.split('/').filter(segment => segment !== '');
            
            // Expected base path segments: ['api', 'admin', 'users'] (length 3)
            // If we have more than 3 segments, the extra segment(s) form the user ID
            // For simplicity, we'll assume the format is exactly /api/admin/users/{id}
            // so we expect exactly 4 segments: ['api', 'admin', 'users', {id}]
            let userId = null;
            
            if (pathSegments.length === 4 && 
                pathSegments[0] === 'api' && 
                pathSegments[1] === 'admin' && 
                pathSegments[2] === 'users') {
                // Format: /api/admin/users/{id}
                userId = pathSegments[3];
            } else {
                // Try to get ID from query parameters as fallback
                const searchParams = url.searchParams;
                userId = searchParams.get('id');
            }

            if (!userId) {
                return NextResponse.json({
                    success: false,
                    message: "User ID is required"
                }, { status: 400 });
            }

            // Validate userId is not empty
            if (!userId.trim()) {
                return NextResponse.json({
                    success: false,
                    message: "User ID is required"
                }, { status: 400 });
            }

            // Delete user
            const result = await User.deleteOne({ _id: userId });

            if (result.deletedCount === 0) {
                return NextResponse.json({
                    success: false,
                    message: "User not found"
                }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                message: "User deleted successfully"
            }, { status: 200 });
        }
    } catch (error) {
        console.log("ERROR DELETING USERS:", error);
        return NextResponse.json({
            success: false,
            message: "Error deleting users",
            error: error.message
        }, { status: 500 });
    }
};
