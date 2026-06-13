import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Business from "@/models/Business";
import User from "@/models/User";
import { NextResponse } from "next/server";


export const GET = async (req) => {
    const auth = await verifyAuth(req, ["vendor", "admin"]);

    // If authentication or authorization fails, i
    if (!auth.isValid) {
        return NextResponse.json({
            success: false,
            message: auth.message
        },

            { status: auth.status });
    };

    try {
        let vendorId;
        await connectDB();
        const { searchParams } = new URL(req.url);
        if(searchParams.get('vendorId')){
            vendorId=searchParams.get('userId')
            console.log("SEARC PARAM ID",searchParams.get('VendorId'));
        }
        else{

            vendorId = auth.user.id;
        }

        // const vendorProfile = await User.findOne({ _id: vendorId }).select('-password').lean();

        const item = await Business.findOne({ ownerId: vendorId })
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


export const PATCH = async (req) => {
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

        // const body = await req.json();
        await connectDB();
        const{businessInfo, vendorInfo}=await req.json();
        const vendorId = auth.user.id;

        console.log("BODY", businessInfo, vendorInfo)

        // console.log('Received Payload: ', body,
        //     "vendorId", vendorId
        // );

        // const bankingDetails = {
        //     bankName: body.businessInfo.bankName || null,
        //     accountNumber: body.businessInfo.accountNumber || null,
        //     accountName: body.businessInfo.accountName || null,
        //     bvn: body.businessInfo.bvn || null,
        //     accountType: body.businessInfo.accountType || null
        // };

        const updatedVendor = await User.findByIdAndUpdate(
            vendorId,
            {
                $set: {
                    ...vendorInfo,
                    onBoardingStatus: "completed"
                }
            },
            { returnDocument: "after" }).select("-password -verificationNumber").lean();

        const business = await Business.create(

              { ...businessInfo,
               ownerId:updatedVendor._id}
            );

        return NextResponse.json({
            success: true,
            message: "Vendor profile updated successfully",
            data: { updatedVendor, business }
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