"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function UploadPage() {
    const [productName, setProductName] = useState("");
    const [price, setPrice] = useState("");
    const [selectedImages, setSelectedImages] = useState([]);
    const [previewImages, setPreviewImages] = useState([]);
    const [loading, setLoading] = useState(false);

    // Handle Image Selection
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);

        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ];

        const MAX_FILE_SIZE = 5 * 1024 * 1024;

        // Max 7 images
        if (files.length + selectedImages.length > 7) {
            toast.error("Maximum of 7 images allowed");
            return;
        }

        const validFiles = [];

        for (const file of files) {
            // Validate type
            if (!allowedTypes.includes(file.type)) {
                toast.error(
                    `${file.name} is not a supported format`
                );
                continue;
            }

            // Validate size
            if (file.size > MAX_FILE_SIZE) {
                toast.error(
                    `${file.name} exceeds 5MB limit`
                );
                continue;
            }

            validFiles.push(file);
        }

        if (validFiles.length === 0) return;

        // Save images
        setSelectedImages((prev) => [
            ...prev,
            ...validFiles,
        ]);

        // Create previews
        const previews = validFiles.map((file) =>
            URL.createObjectURL(file)
        );

        setPreviewImages((prev) => [
            ...prev,
            ...previews,
        ]);

        toast.success("Images selected successfully");
    };

    // Remove Image
    const removeImage = (index) => {
        const updatedImages = [...selectedImages];
        const updatedPreviews = [...previewImages];

        updatedImages.splice(index, 1);
        updatedPreviews.splice(index, 1);

        setSelectedImages(updatedImages);
        setPreviewImages(updatedPreviews);

        toast.success("Image removed");
    };

    // Upload Images To Cloudinary
   const uploadImages = async () => {
    try {
        setLoading(true);

        if (!productName || !price) {
            toast.error(
                "Please fill all required fields"
            );
            return;
        }

        if (selectedImages.length === 0) {
            toast.error("Please select images");
            return;
        }

        // Generate timestamp
        const timestamp = Math.round(
            new Date().getTime() / 1000
        );

        const folder= "thrive-abi-test";

        // Request signature from backend
        const signatureRes = await axios.post(
            "/api/sign-cloudinary",
            {
                timestamp,
                folder
            }
        );

        const {
            signature,
            apiKey,
            cloudName,
        } = signatureRes.data;

        // Concurrent uploads
        const uploadedImages = await Promise.all(
            selectedImages.map(async (image) => {
                const formData = new FormData();

                formData.append("file", image);
                formData.append("api_key", apiKey);
                formData.append("timestamp", timestamp);
                formData.append("signature", signature );
                // Optional folder
                formData.append("folder", "thrive-abi-test");

                const cloudinaryRes =
                    await axios.post(
                        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                        formData
                    );

                return cloudinaryRes.data.secure_url;
            })
        );

        // Product Data
        const productData = {
            productName,
            price,
            images: uploadedImages,
        };

        console.log(productData);

        toast.success(
            "Product uploaded successfully"
        );

        // Reset form
        setProductName("");
        setPrice("");
        setSelectedImages([]);
        setPreviewImages([]);
    } catch (error) {
        console.error(error);

        toast.error("Upload failed");
    } finally {
        setLoading(false);
    }
};
    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">
                Upload Product
            </h1>

            <div className="space-y-5">
                {/* Product Name */}
                <div>
                    <label className="block mb-2 font-medium">
                        Product Name
                    </label>

                    <input
                        type="text"
                        placeholder="Enter product name"
                        value={productName}
                        onChange={(e) =>
                            setProductName(e.target.value)
                        }
                        className="w-full border p-3 rounded-lg"
                    />
                </div>

                {/* Price */}
                <div>
                    <label className="block mb-2 font-medium">
                        Price
                    </label>

                    <input
                        type="number"
                        placeholder="100000"
                        value={price}
                        onChange={(e) =>
                            setPrice(e.target.value)
                        }
                        className="w-full border p-3 rounded-lg"
                    />
                </div>

                {/* Image Upload */}
                <div>
                    <label className="block mb-2 font-medium">
                        Gallery Images
                    </label>

                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full border p-3 rounded-lg"
                    />
                </div>

                {/* Preview Images */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {previewImages.map((image, index) => (
                        <div
                            key={index}
                            className="relative border rounded-lg overflow-hidden"
                        >
                            <img
                                src={image}
                                alt="preview"
                                className="w-full h-40 object-cover"
                            />

                            <button
                                onClick={() =>
                                    removeImage(index)
                                }
                                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded"
                            >
                                X
                            </button>
                        </div>
                    ))}
                </div>

                {/* Submit */}
                <button
                    onClick={uploadImages}
                    disabled={loading}
                    className="bg-black text-white px-6 py-3 rounded-lg"
                >
                    {loading
                        ? "Uploading..."
                        : "Upload Product"}
                </button>
            </div>
        </div>
    );
}