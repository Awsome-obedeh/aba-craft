import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },

    description: {
      type: String,
      default: "",
      required: false,
    },

    image: {
      type: String, 
      required: false,
    },

    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
      default: null, // allows subcategories
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, 
    },
  },
  {
    timestamps: true,
  },

);

categorySchema.pre("save", function () {
  if (!this.slug) {
    this.slug = this.categoryName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-") // spaces → hyphens
      .replace(/[^\w\-]+/g, ""); // remove special characters
  }


});
const Category = mongoose.models.Category ||
 mongoose.model("Category", categorySchema);

export default Category;