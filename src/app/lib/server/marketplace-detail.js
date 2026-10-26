import connect from "../connect.js";
import Product from "../../../models/Products.js";
import User from "../../../models/User.js";
import Business from "../../../models/Business.js";
import Category from "../../../models/Category.js";
import Review from "../../../models/BuyerReview.js";
import Comment from "../../../models/ProductComment.js";
import Order from "../../../models/Order.js";
import { createMarketplaceDetailService } from "./marketplace-detail-service.js";

export const marketplaceDetail = createMarketplaceDetailService({
  connect: async () => { await connect(); await Comment.init(); },
  Product, User, Business, Category, Review, Comment, Order,
});
