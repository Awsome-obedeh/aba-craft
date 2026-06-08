"use client"
import DashboardLayout from "@/components/layout/DashboardLayout";
import AISidePanel from "@/components/upload/AISidePanel";
import { GiCloudUpload } from "react-icons/gi";
import { FiCamera, FiUploadCloud, } from "react-icons/fi";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import axios from "axios";
import { CheckBox } from "@/components/CheckBox";
import { api } from "@/app/lib/axios";
import { useRouter } from "next/navigation";

export default function UploadProductPage() {
    const router= useRouter();

    const [loading, setLoading] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const [previewImages, setPreviewImages] = useState([]);
    const [featured, setFeatured] = useState(false);
    const [categories, setCategories] = useState([]);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch
    } = useForm({
        defaultValues: {
            isFeatured: false
        }
    });
    const isFeaturedActive = watch("isFeatured");
    // cloudinary upload
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);

        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ];

        const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

        setSelectedImages((prev) => [...prev, ...validFiles]);

        const imagePreviews = validFiles.map((file) =>
            URL.createObjectURL(file)
        );

        setPreviewImages((prev) => [...prev, ...imagePreviews]);
    };

    const removeImage = (index) => {
        const updatedFiles = [...selectedImages];
        updatedFiles.splice(index, 1);

        const updatedPreviews = [...previewImages];
        updatedPreviews.splice(index, 1);

        setSelectedImages(updatedFiles);
        setPreviewImages(updatedPreviews);
    };

    // CLOUDINARY UPLOAD STARTS HERE
    const uploadImagesToCloudinary = async () => {
        const uploadedImages = [];

        for (let image of selectedImages) {
            const formData = new FormData();

            formData.append("file", image);
            formData.append(
                "upload_preset",
                process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_NAME
            );

            const res = await axios.post(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
                formData
            );

            uploadedImages.push(res.data.secure_url);
        }

        return uploadedImages;
    };


    const onSubmit = async (data) => {

        setLoading(true);
        const uploadedImages = await uploadImagesToCloudinary();

        const payload = {
            ...data,
            productImages: uploadedImages,
            discountPrice: data.discountPrice || 0,
            discountPercentage: data.discountPercentage || 0,
            redirectWhatsapp: data.redirectWhatsApp || false,

        };

        console.log(payload);
        try {

            const res = await api.post('/products', payload)
            if (res.data.success) {
                toast.success("Product uploaded successfully");
                reset();
                setSelectedImages([]);
                setPreviewImages([]);
                router.push("inventory");


            }
        } catch (error) {
            console.error("Upload error:", error);

            // Axios server error
            if (error.response) {
                toast.error(
                    error.response.data.message ||
                    "Something went wrong"
                );
            }

            // Network error
            else if (error.request) {
                toast.error(
                    "Network error. Check your internet connection."
                );
            }

            // Unexpected error
            else {
                toast.error(
                    "Unexpected error occurred"
                );
            }
        } finally {
            setLoading(false);
        }
    }

    const fetchCategories = async () => {
        try {

            const res = await api.get('/category');
            if (res.data.success) {
                setCategories(res.data.categories);
            }
        }

        catch (error) {

            console.error("Error fetching categories:", error);
            // Axios server error
            if (error.response) {
                toast.error(
                    error.response.data.message ||
                    "Something went wrong"
                );
            }

            // Network error
            else if (error.request) {
                toast.error(
                    "Network error. Check your internet connection."
                );
            }

            // Unexpected error
            else {
                toast.error(
                    "Unexpected error occurred"
                );
            }
        }




    }
    useEffect(() => {
        fetchCategories();
    }, []);

    //  console.log("Categories:", categories);

    const role = "vendor"
    return (
        <DashboardLayout role={role}>

            <form className="flex flex-col xl:flex-row gap-6" onSubmit={handleSubmit(onSubmit)}>

                {/* Left */}
                <div className="flex-1 space-y-5">

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <p className="text-3xl font-bold">
                                Upload Product
                            </p>


                        </div>

                        <div className="flex gap-3">
                            <button type="submit" className="border px-5 py-2 rounded-lg bg-white">
                                Save Draft
                            </button>

                            <button type="submit" className="bg-black text-white px-5 py-2 rounded-lg">
                                Save Draft
                            </button>
                        </div>
                    </div>

                    <section className="bg-white border rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center">
                                1
                            </div>

                            <div>
                                <h2 className="font-bold text-lg">
                                    Product Information
                                </h2>

                                <p className="text-sm text-gray-500">
                                    Basic details about your product.
                                </p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-5">

                            <div>
                                <label className="text-sm font-medium">
                                    Product Name <span className="text-red-600 text-2xl font-bold">*</span>
                                </label>

                                <input
                                    type="text"
                                    placeholder="Classic Leather Boots"
                                    {...register("productName",
                                        { required: "Product name is required" }
                                    )}
                                    className="w-full mt-2 border rounded-lg p-3 outline-none"
                                />

                                {
                                    errors.productName && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {errors.productName.message}
                                        </p>
                                    )
                                }


                            </div>
                            <div>
                                <label className="text-sm font-medium">
                                    Brand Name <span className="text-red-600 text-2xl font-bold">*</span>
                                </label>

                                <input
                                    type="text"
                                    placeholder="Nike, adidas, etc"
                                    {...register("brand",
                                        { required: "Brand name is required" }
                                    )}
                                    className="w-full mt-2 border rounded-lg p-3 outline-none"
                                />

                                {
                                    errors.brand && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {errors.brand.message}
                                        </p>
                                    )
                                }


                            </div>
                            <div>
                                <label className="text-sm font-medium">
                                    Quantity in stock <span className="text-red-600 text-2xl font-bold">*</span>
                                </label>

                                <input
                                    type="number"
                                    placeholder="0"
                                    {...register("quantity", {
                                        required: "Quantity is required",
                                        min: {
                                            value: 0,
                                            message: "Quantity must be a positive number"
                                        }
                                    })}
                                    className="w-full mt-2 border rounded-lg p-3 outline-none"
                                />

                                {
                                    errors.quantity && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {errors.quantity.message}
                                        </p>
                                    )
                                }


                            </div>




                            <div>
                                <label className="text-sm font-medium">
                                    Category <span className="text-red-600 text-2xl font-bold">*</span>
                                </label>

                                <select className="w-full mt-2 border rounded-lg p-4 outline-none"
                                    {...register("category", {
                                        required: "Category is required"
                                    })}
                                >
                                    {categories?.map((category) => (
                                        <option key={category._id} value={category._id} className="capitalize">
                                            {category.categoryName}
                                        </option>
                                    ))}


                                </select>

                                {errors.category && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.category.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-medium">
                                    Price (NGN) <span className="text-red-600 text-2xl font-bold">*</span>
                                </label>

                                <input
                                    type="text"
                                    placeholder="0.00"
                                    {...register("price", {
                                        required: "Price is required"
                                    })}
                                    className="w-full mt-2 border rounded-lg p-3 outline-none"
                                />
                                {errors.price && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.price.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-medium">
                                    Product Description <span className="text-red-600 text-2xl font-bold">*</span>
                                </label>

                                <textarea
                                    rows={4}
                                    placeholder="Describe your product..."
                                    className="w-full mt-2 border rounded-lg p-3 outline-none"
                                    {...register("description", {
                                        required: "Description is required"
                                    })}
                                />

                                {
                                    errors.description && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {errors.description.message}
                                        </p>
                                    )
                                }
                            </div>

                            <div>
                                <label className="text-sm font-medium">
                                    Discount Percentage
                                </label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    {...register("discountPercentage", {
                                        min: 0,
                                        max: 100
                                    })}
                                    className="w-full mt-2 border rounded-lg p-3 outline-none"
                                />

                            </div>

                            <div>
                                <label className="text-sm font-medium">
                                    Discount Price (NGN)
                                </label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    {...register("discountPrice", {
                                        min: 0
                                    })}
                                    className="w-full mt-2 border rounded-lg p-3 outline-none"
                                />
                            </div>

                            <div>
                                <CheckBox
                                    label="Make Featured"
                                    description="Make this product a featured product to display it at the lop of listed products."
                                    checked={isFeaturedActive}

                                    {...register("isFeatured")}
                                />
                            </div>


                            
                        </div>
                    </section>


                    {/* media section */}
                    <section className="bg-white border rounded-2xl p-5">

                        <div className="flex items-center gap-3 mb-5">
                            <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center">
                                2
                            </div>

                            <div>
                                <h2 className="font-bold text-lg">
                                    Media Gallery <span className="text-red-600 text-2xl font-bold">*</span>
                                </h2>

                                <p className="text-sm text-gray-500">
                                    Upload clear photos of your product.
                                </p>
                            </div>
                        </div>

                        <label htmlFor="media-upload" className="cursor-pointer border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center">

                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImageChange}
                                className="w-full border p-3 rounded-lg cursor-pointer outline-none hidden"
                                id="media-upload"
                            />

                            <FiUploadCloud
                                className="text-gray-800 mb-4"
                                size={40}
                            />


                            <p className="text-gray-500">
                                Select Images
                            </p>


                        </label>

                        {/* Preview */}
                        {/* <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-6">
                            {[1, 2, 3, 4, 5].map((item) => (
                                <div
                                    key={item}
                                    className="h-24 rounded-xl bg-gray-200"
                                />
                            ))}
                        </div> */}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
                            {previewImages.map((image, index) => (
                                <div
                                    key={index}
                                    className="relative border rounded-lg overflow-hidden"
                                >
                                    <img
                                        src={image}
                                        alt="preview"
                                        className="w-full h-50 object-cover object-center"
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

                    </section>


                    {/* Sales Automation Section */}
                    <section className="bg-white border rounded-2xl p-5">

                        <div className="flex items-center gap-3 mb-5">
                            <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center">
                                3
                            </div>

                            <div>
                                <h2 className="font-bold text-lg">
                                    Sales Automation (AI & Messaging)
                                </h2>

                                <p className="text-sm text-gray-500">
                                    Setup automation to engage customers.
                                </p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-5">

                            <div>
                                <label className="text-sm font-medium">
                                    Trigger Keyword
                                </label>

                                <input
                                    type="text"
                                    placeholder="e.g BOOT"
                                    className="w-full mt-2 border rounded-lg p-3 outline-none"

                                />


                            </div>

                            <div>
                                <label className="text-sm font-medium">
                                    Auto-DM Message
                                </label>

                                <input
                                    type="text"
                                    placeholder="e.g Thanks for your interest..."
                                    className="w-full mt-2 border rounded-lg p-3 outline-none"

                                />


                            </div>
                        </div>

                        <div className="mt-5 flex items-center gap-3">
                            <input type="checkbox" {...register("redirectWhatsApp")} />

                            <div>
                                <p className="font-medium text-sm">
                                    Redirect customer to WhatsApp after DM
                                </p>

                                <p className="text-xs text-gray-500">
                                    Customers will continue conversation on WhatsApp.
                                </p>
                            </div>
                        </div>
                    </section>
                    <div className="flex ">

                        <button disabled={loading} type="submit" className={`flex gap-2 text-white mt-1 ${loading ? 'bg-gray-500' : 'bg-black'} px-5 py-2 rounded-lg text-sm`}>
                            <GiCloudUpload size={20} />
                            {loading ? "Uploading..." : "Upload Product"}
                        </button>
                    </div>
                </div>

                {/* Right */}
                <div className="w-full xl:w-[300px]">
                    <AISidePanel />


                </div>


            </form>
        </DashboardLayout>
    );
}