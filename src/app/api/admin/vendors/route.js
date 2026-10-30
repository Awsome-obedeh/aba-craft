import connectDB from '@/app/lib/connect';
import { verifyAuth } from '@/app/lib/verifyAuth';
import { vendorListOptions, vendorListMatch, vendorsCsv } from '@/app/lib/admin-vendors';
import User from '@/models/User';
import Business from '@/models/Business';
import Product from '@/models/Products';
import VendorVerification from '@/models/VendorVerification';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const auth = await verifyAuth(req, ['admin']);
  if (!auth.isValid) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  try {
    await connectDB();
    const options = vendorListOptions(new URL(req.url).searchParams);
    const pipeline = [
      { $match: { role: 'vendor' } },
      { $lookup: { from: Business.collection.name, localField: '_id', foreignField: 'ownerId', pipeline: [{ $sort: { createdAt: -1, _id: -1 } }, { $limit: 1 }, { $project: { businessName: 1, sellerRole: 1, isActive: 1, bannedStatus: 1 } }], as: 'businesses' } },
      { $lookup: { from: VendorVerification.collection.name, localField: '_id', foreignField: 'ownerId', pipeline: [{ $sort: { createdAt: -1, _id: -1 } }, { $limit: 1 }, { $project: { status: 1 } }], as: 'verifications' } },
      { $lookup: { from: Product.collection.name, localField: '_id', foreignField: 'createdBy', pipeline: [{ $group: { _id: null, total: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ['$status', 'under_review'] }, 1, 0] } }, verified: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } } } }], as: 'products' } },
      { $set: { business: { $arrayElemAt: ['$businesses', 0] }, verification: { $arrayElemAt: ['$verifications', 0] }, productCounts: { $arrayElemAt: ['$products', 0] } } },
      { $set: {
        name: { $ifNull: ['$business.businessName', { $ifNull: ['$fullName', '$email'] }] },
        vendorType: { $switch: { branches: [{ case: { $eq: ['$business.sellerRole', 'wholesaler_producer'] }, then: 'Wholesaler' }, { case: { $eq: ['$business.sellerRole', 'retailer'] }, then: 'Retailer' }], default: 'Vendor' } },
        status: { $cond: [{ $or: [{ $eq: ['$business.isActive', false] }, { $eq: ['$business.bannedStatus', 'banned'] }, { $eq: ['$isActive', false] }] }, 'suspended', { $ifNull: ['$verification.status', { $ifNull: ['$verificationStatus', 'pending'] }] }] },
        totalProducts: { $ifNull: ['$productCounts.total', 0] },
        pendingProducts: { $ifNull: ['$productCounts.pending', 0] },
        verifiedProducts: { $ifNull: ['$productCounts.verified', 0] },
      } },
      { $project: { name: 1, fullName: 1, email: 1, profilePicture: 1, vendorType: 1, status: 1, verificationStatus: 1, onBoardingStatus: 1, totalProducts: 1, pendingProducts: 1, verifiedProducts: 1, createdAt: 1 } },
    ];
    const match = vendorListMatch(options);
    if (options.exporting) {
      const vendors = await User.aggregate([...pipeline, { $match: match }, { $sort: { createdAt: -1, _id: -1 } }]);
      return new Response(vendorsCsv(vendors), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="vendors.csv"', 'Cache-Control': 'no-store' } });
    }
    const [result] = await User.aggregate([...pipeline, { $facet: {
      stats: [{ $group: {
        _id: null, totalVendors: { $sum: 1 },
        activeVendors: { $sum: { $cond: [{ $ne: ['$status', 'suspended'] }, 1, 0] } },
        pendingVendors: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        approvedVendors: { $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } },
        archivedVendors: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
        pendingProducts: { $sum: '$pendingProducts' }, verifiedProducts: { $sum: '$verifiedProducts' },
      } }],
      count: [{ $match: match }, { $count: 'total' }],
      vendors: [{ $match: match }, { $sort: { createdAt: -1, _id: -1 } }, { $skip: (options.page - 1) * options.limit }, { $limit: options.limit }],
    } }]);
    const stats = result.stats[0] || { totalVendors: 0, activeVendors: 0, pendingVendors: 0, approvedVendors: 0, archivedVendors: 0, pendingProducts: 0, verifiedProducts: 0 };
    delete stats._id;
    const total = result.count[0]?.total || 0;
    return NextResponse.json({ success: true, ...stats, vendors: result.vendors.map(v => ({ ...v, id: String(v._id), _id: String(v._id) })), pagination: { page: options.page, limit: options.limit, total, pages: Math.ceil(total / options.limit) } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error fetching admin vendors:', error);
    return NextResponse.json({ success: false, message: 'Unable to load vendors. Please try again.' }, { status: 500 });
  }
}
