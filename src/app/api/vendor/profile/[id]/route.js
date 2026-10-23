import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import Business from "@/models/Business";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const GET = async (req, { params }) => {
  const auth = await verifyAuth(req, ["admin"]);

  if (!auth.isValid) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  try {
    const { id } = await params;
    await connectDB();

    const item = await Business.findOne({ ownerId: id })
      .select("businessName businessType businessDescription verificationStatus country state lga address logo")
      .populate("ownerId", "fullName sex phoneNumber email role verificationStatus createdAt updatedAt");

    if (!item) {
      return NextResponse.json(
        { success: false, message: "Vendor profile not found." },
        { status: 404 }
      );
    }

    const formattedResponse = {
      vendorInfo: item?.ownerId
        ? {
            id: item.ownerId._id.toString(),
            fullName: item.ownerId.fullName,
            email: item.ownerId.email,
            role: item.ownerId.role,
            sex: item.ownerId.sex,
            verificationStatus: item.ownerId.verificationStatus,
            phoneNumber: item.ownerId.phoneNumber,
            joinedDate: new Date(item.ownerId.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            lastUpdated: new Date(item.ownerId.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
          }
        : null,

      businessInfo: item
        ? {
            id: item._id.toString(),
            businessName: item.businessName,
            businessDescription: item.businessDescription,
            businessType: item.businessType,
            verificationStatus: item.verificationStatus,
            country: item.country,
            lga: item.lga,
            address: item.address,
            state: item.state,
            logo: item.logo,
          }
        : null,
    };

    return NextResponse.json({
      status: true,
      message: "Vendor profile details",
      formattedResponse,
    });
  } catch (error) {
    console.error("Error fetching vendor profile:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
        error: error?.message || null,
      },
      { status: 500 }
    );
  }
};
