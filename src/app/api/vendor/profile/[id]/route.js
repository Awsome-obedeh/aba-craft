import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Business from "@/models/Business";
import User from "@/models/User";
import { NextResponse } from "next/server";


export const GET = async (req,{params}) => {
    const auth = await verifyAuth(req, ["admin"]);

    // If authentication or authorization fails, i
    if (!auth.isValid) {
        return NextResponse.json({
            success: false,
            message: auth.message
        },

            { status: auth.status });
    };

    try {
    
        const {id}=await params
        await connectDB();
       

       

        const item = await Business.findOne({ ownerId: id })
            .select('businessName businessType businessDescription supportingDocuments verificationStatus country state lga address,bankDetails')
            .populate('ownerId', 'fullName sex phoneNumber email role verificationStatus createdAt updatedAt')

        const formattedResponse = {
           vendorInfo: item?.ownerId?{
                id: item.ownerId._id.toString(),
                fullName: item.ownerId.fullName,
                email: item.ownerId.email,
                role: item.ownerId.role,
                sex:item.ownerId.sex,
                verificationStatus:item.ownerId.verificationStatus,
                phoneNumber:item.ownerId.phoneNumber,
                joinedDate: new Date(item.ownerId.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                }),
                lastUpdated:new Date(item.ownerId.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                }),
            }: null,

            businessInfo: item ? {
                id: item._id.toString(),
                businessName: item.businessName,
                businessDescription: item.businessDescription,
                businessType:item.businessType,
                veificationStatus:item.verificationStatus,
                country:item.country,
                lga:item.lga,
                address:item.address,
                state:item.state,


                logo: item.logo,
                bankDetails: item.bankDetails || null
                // totalProducts: item.totalProducts || 0
            } : null
        };
    

        return NextResponse.json({
        status: true,
        message: "Vendor profile details",
        formattedResponse
    })
}

    catch (error) {
    console.error('Error updating vendor profile:', error);

    return NextResponse.json(
        {
            success: false,
            message: "Something went wrong",
            error: error.message || null
        },
        { status: 500 }
    );
}
    
}


export const PATCH = async (req, {params}) => {
    const auth = await verifyAuth(req, ["vendor", "admin"]);

    // If authentication or authorization fails, i
    if (!auth.isValid) {
        return NextResponse.json({
            success: false,
            message: auth.message
        },

            { status: auth.status });
    }

    try {

   
        await connectDB();
        const {id} = await params

      

        const updatedVendor = await User.findByIdAndUpdate(
            id,
            {
                $set: {
                   
                    verificationStatus: "verified"
                }
            },
            { returnDocument: "after" }).select("-password -verificationNumber").lean();

       
        return NextResponse.json({
            success: true,
            message: "Vendor profile updated successfully",
            data: { updatedVendor }
        },
            {
                status: 200
            });


    }

    catch (error) {
        console.error('Error updating vendor profile:', error);

        return NextResponse.json(
            {
                success: false,
                message: "Something went wrong",
                error: error.message || null
            },
            { status: 500 }
        );

    }
}