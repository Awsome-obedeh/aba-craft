import mongoose from "mongoose";
import connectDB from "@/app/lib/connect";
import { verifyAuth } from "@/app/lib/verifyAuth";
import User from "@/models/User";
import Business from "@/models/Business";
import Product from "@/models/Products";
import Order from "@/models/Order";

export async function GET(request) {
  const auth = await verifyAuth(request, ["vendor"]);
  if (!auth.isValid) return Response.json({ success: false, message: auth.message }, { status: auth.status });

  try {
    await connectDB();
    const vendorId = new mongoose.Types.ObjectId(auth.user.id);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [user, business, productCount, lowStockCount, orderCount, pendingOrders, recentOrders, sales, monthlySales, topProducts] = await Promise.all([
      User.findById(vendorId).select("fullName email verificationStatus onBoardingStatus").lean(),
      Business.findOne({ ownerId: vendorId }).select("businessName verificationStatus").lean(),
      Product.countDocuments({ createdBy: vendorId, isActive: true }),
      Product.countDocuments({ createdBy: vendorId, isActive: true, quantity: { $lte: 5 } }),
      Order.countDocuments({ "items.vendor": vendorId }),
      Order.countDocuments({ "items.vendor": vendorId, status: { $in: ["paid", "processing"] } }),
      Order.find({ "items.vendor": vendorId }).sort({ createdAt: -1 }).limit(5).select("items status paymentStatus createdAt customer").populate("customer", "fullName email").lean(),
      Order.aggregate([
        { $match: { "items.vendor": vendorId, paymentStatus: "paid" } },
        { $unwind: "$items" }, { $match: { "items.vendor": vendorId } },
        { $group: { _id: null, revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } }, units: { $sum: "$items.quantity" } } },
      ]),
      Order.aggregate([
        { $match: { "items.vendor": vendorId, paymentStatus: "paid", createdAt: { $gte: sixMonthsAgo } } },
        { $unwind: "$items" }, { $match: { "items.vendor": vendorId } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Order.aggregate([
        { $match: { "items.vendor": vendorId, paymentStatus: "paid" } },
        { $unwind: "$items" }, { $match: { "items.vendor": vendorId } },
        { $group: { _id: "$items.product", name: { $first: "$items.productName" }, units: { $sum: "$items.quantity" } } },
        { $sort: { units: -1 } }, { $limit: 5 },
      ]),
    ]);

    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + index, 1);
      const found = monthlySales.find(entry => entry._id.year === date.getFullYear() && entry._id.month === date.getMonth() + 1);
      return { label: date.toLocaleString("en-NG", { month: "short" }), revenue: found?.revenue || 0 };
    });

    return Response.json({ success: true, data: {
      vendor: { name: user?.fullName || user?.email?.split("@")[0] || "Vendor", verificationStatus: user?.verificationStatus || "pending", onboardingStatus: user?.onBoardingStatus || "in_progress", businessName: business?.businessName || null, businessVerificationStatus: business?.verificationStatus || "pending" },
      metrics: { productCount, lowStockCount, orderCount, pendingOrders, revenue: sales[0]?.revenue || 0, unitsSold: sales[0]?.units || 0 },
      monthlySales: months,
      topProducts: topProducts.map(item => ({ id: String(item._id), name: item.name, units: item.units })),
      recentOrders: recentOrders.map(order => ({ id: String(order._id), customer: order.customer?.fullName || order.customer?.email || "Buyer", items: order.items.filter(item => String(item.vendor) === String(vendorId)).map(item => ({ name: item.productName, quantity: item.quantity, total: item.unitPrice * item.quantity })), status: order.status, paymentStatus: order.paymentStatus, createdAt: order.createdAt })),
    } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Vendor dashboard error", error);
    return Response.json({ success: false, message: "Could not load the dashboard." }, { status: 500 });
  }
}
