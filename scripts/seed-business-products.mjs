import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Product from '../src/models/Products.js';

const createdBy = '6a2d064916d353b1882a972c';
const businessId = '6a2d069bd2b7e95d2c5fac91';
const images = [
  'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1000&q=85',
];
// Prices are in naira; weight is in kg and dimensions are in cm.
const definitions = [
  ['Classic Leather Oxford Shoes', 'Footwear', 'Oxford shoes', 45000, 12, 0.9, '32 x 20 x 12', '6403', 'Polished brown leather lace-up shoes with cushioned insoles and durable rubber soles.'],
  ['Handcrafted Leather Loafers', 'Footwear', 'Loafers', 38000, 18, 0.8, '32 x 20 x 12', '6403', 'Slip-on leather loafers with hand-stitched detailing and a flexible sole for everyday wear.'],
  ['Premium Leather Sandals', 'Footwear', 'Sandals', 22000, 25, 0.6, '30 x 18 x 10', '6403', 'Open-toe leather sandals with adjustable straps and a cushioned footbed.'],
  ['Everyday Leather Slides', 'Footwear', 'Slides', 18000, 30, 0.5, '30 x 18 x 10', '6403', 'Easy-wear leather slides with a broad upper strap and textured rubber outsole.'],
  ['Executive Leather Briefcase', 'Bags & Accessories', 'Briefcase', 65000, 8, 1.4, '40 x 10 x 30', '4202', 'Structured leather briefcase with a padded laptop compartment, document pockets and detachable shoulder strap.'],
  ['Classic Leather Tote Bag', 'Bags & Accessories', 'Tote bag', 42000, 15, 0.9, '35 x 12 x 32', '4202', 'Spacious leather tote with reinforced handles, an internal zip pocket and a secure top closure.'],
  ['Compact Leather Crossbody Bag', 'Bags & Accessories', 'Crossbody bag', 28000, 20, 0.5, '24 x 8 x 18', '4202', 'Compact leather crossbody bag with an adjustable strap and separate compartments for daily essentials.'],
  ['Weekend Leather Duffle Bag', 'Bags & Accessories', 'Duffle bag', 78000, 6, 1.8, '50 x 24 x 28', '4202', 'Roomy leather travel bag with reinforced carry handles, a detachable strap and a zipped interior pocket.'],
  ['Slim Leather Bifold Wallet', 'Wallets', 'Bifold wallet', 12000, 40, 0.12, '11 x 2 x 9', '4202', 'Slim leather bifold wallet with six card slots, two note compartments and neat stitched edges.'],
  ['Leather Card Holder', 'Wallets', 'Card holder', 8000, 50, 0.06, '10 x 1 x 7', '4202', 'Minimal leather card holder with four card slots and a central pocket for folded notes.'],
];

try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const imageResults = await Promise.all(images.map(async url => {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
    assert(response.ok && response.headers.get('content-type')?.startsWith('image/'), `Invalid Unsplash image: ${url}`);
    return response.status;
  }));
  console.log(JSON.stringify({ database: db.databaseName, verifiedUnsplashImages: imageResults.length }));
  assert(await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(createdBy) }), 'Creator does not exist');
  assert(await db.collection('businesses').findOne({ _id: new mongoose.Types.ObjectId(businessId), ownerId: new mongoose.Types.ObjectId(createdBy) }), 'Business or owner mismatch');
  const categories = await db.collection('categories').find({ isActive: { $ne: false } }).toArray();
  const documents = definitions.map(([productName, categoryName, productType, price, quantity, weight, dimensions, hsn, description], index) => {
    const category = categories.find(item => item.categoryName === categoryName);
    assert(category, `Missing category ${categoryName}`);
    const slug = `elie-wonders-${businessId}-${productName.toLowerCase().replace(/\s+/g, '-')}`;
    return new Product({
      productName, description, price, discountPrice: price * 0.9, discountPercentage: 10,
      quantity, inStock: true,
      productImages: [images[index < 4 ? 0 : index < 8 ? 1 : 2]],
      category: category._id, brand: 'Elie wonders', shortDescription: description.slice(0, 150),
      productType, sku: `ELIE-LEATHER-${String(index + 1).padStart(3, '0')}`, hsn,
      compareAtPrice: price, weight, dimensions, stockAlert: 5,
      notes: 'Sample catalog product. Weight in kg; dimensions in cm; prices in NGN.',
      isActive: true, createdBy, businessId, redirectToWhatsapp: false,
      status: 'approved', rejectionReason: '', featured: index === 0 || index === 4,
      slug, isPublished: true,
    });
  });
  // Validate the entire batch before writing anything. Re-runs do not duplicate products.
  await Promise.all(documents.map(document => document.validate()));
  for (const document of documents) {
    const existing = await Product.findOne({ slug: document.slug });
    if (existing) {
      assert.equal(String(existing.createdBy), createdBy);
      assert.equal(String(existing.businessId), businessId);
      continue;
    }
    await document.save();
  }
  const stored = await Product.find({ slug: { $in: documents.map(document => document.slug) } }).select('+notes').lean();
  assert.equal(stored.length, 10);
  for (const document of stored) {
    assert.equal(document.status, 'approved');
    assert.equal(String(document.createdBy), createdBy);
    assert.equal(String(document.businessId), businessId);
    assert(document.productImages.every(url => new URL(url).hostname === 'images.unsplash.com'));
    for (const field of Object.keys(Product.schema.paths)) assert(field in document, `Missing field: ${field}`);
  }
  console.log(JSON.stringify({ verified: stored.length, products: stored.map(({ _id, productName, status }) => ({ _id, productName, status })) }, null, 2));
} catch (error) {
  console.error(error.name, error.code || '', error instanceof assert.AssertionError ? error.message : 'Product seed failed');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
