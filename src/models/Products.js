

import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        // who owns the product
        // vendor: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "User",
        //     required: true,
        // },

        productName: {
            type: String,
            required: [true, "Product name is required"],
            trim: true,
            minlength: 3,
            maxlength: 200,
        },


        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true,
            maxlength: 5000,
        },


        price: {
            type: Number,
            required: [true, "Price is required"],
            min: 0,
        },

        discountPrice: {
            type: Number,
            min: 0,
            validate: {
                validator: function (value) {
                    // Discount price should be less than the original price
                    return value < this.price;
                },
                message: "Discount price must be less than the original price"
            }
        },

        discountPercentage: {
            type: Number,
            min: 0,
            max: 100,
        },

        quantity: {
            type: Number,
            required: [true, "Quantity is required"],
            default: 1,
            min: 0,
        },


        inStock: {
            type: Boolean,
            default: true,
        },

        // Product Images
        productImages: [
            {
                type: String,
                required: true,
            },
        ],


        category: {
            type: String,
            required: true,
            trim: true,
        },


        brand: {
            type: String,
            trim: true,
            default: "",
        },

        redirectToWhatsapp: {
            type: Boolean,

            default: false,
        },

        // Product Status
        // Admin controls this
        status: {
            type: String,
            enum: [
                "under_review",
                "approved",
                "rejected",
            ],
            default: "under_review",
        },

        // Optional Admin Feedback
        rejectionReason: {
            type: String,
            default: "",
        },

        // Featured Product
        featured: {
            type: Boolean,
            default: false,
        },

        // Product Slug
        slug: {
            type: String,
            unique: true,
            lowercase: true,
            trim: true,
        },

        // Product Visibility
        isPublished: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Auto-update stock status
productSchema.pre("save", function () {
    this.inStock = this.quantity > 0;
  
});

const Product =
    mongoose.models.Product ||
    mongoose.model("Product", productSchema);

export default Product;