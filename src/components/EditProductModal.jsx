// src/components/EditProductModal.js
'use client';


import React, { useState, useEffect } from 'react';
import { MdCancel } from "react-icons/md";
import { CategoryList } from './CategoryCard';
import { api } from '@/app/lib/axios';

export default function EditProductModal({ isOpen, onClose, product, onSave, loading }) {
    // Form field states
    const [productName, setProductName] = useState('');
    const [brand, setBrand] = useState('');
    const [price, setPrice] = useState('');
    const [discountPrice, setDiscountPrice] = useState('');
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState([]);
    const [discountPercentage, setDiscountPercentage] = useState('');
    const [productImages, setProductImages] = useState([]);
    const [instock, setInstock] = useState(0);
    const [description, setDescription] = useState('');


  

    const fetchCategories = async () => {
        try {

            const res = await api.get('/category');
            if (res.data.success) {
                setCategories(res.data.categories);
            }
        }

        catch (error) {
            console.error("Error fetching categories:", error);
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

    // Pre-populate the form inputs whenever a new product is selected/loaded
    useEffect(() => {
        if (product) {
            setProductName(product.productName || '');
            setBrand(product.brand || '');
            setPrice(product.price || '');
            setDiscountPrice(product.discountPrice || 0);
            setProductImages(product.productImages || []);
            setInstock(product.quantity);
            setCategory(product.category || '');
            setDiscountPercentage(product.discountPercentage || 0);
            setDescription(product.description || '');

        }

        fetchCategories();
    }, [product]);

    console.log("Categories in Edit Modal:", categories, "Default category:", category);
      console.log("EDIT PRODUCT MODAL DATA:", product);
    console.log("CATEGORIES AVAILABLE:", categories);
    console.log("CURRENT CATEGORY SELECTION:", category)

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...product,
            productName,
            brand,
            price: parseFloat(price) || 0,
            discountPrice: discountPrice ? parseFloat(discountPrice) : null,
            category,
            discountPercentage: parseFloat(discountPercentage) || 0,
            quantity: parseInt(instock) || 0,
            description,

        });
    };

    return (
        <div className="fixed inset-0 z-50  flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm "
            onClick={onClose}
        >
            {/* Modal Body Frame */}
            <div className="bg-white text-black border py-5 border-black   max-w-md p-8 flex flex-col  justify-between animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="flex justify-between items-baseline border-b border-black pb-4 mb-6">
                    <h2 className="text-sm font-bold uppercase tracking-widest">Update Product Details</h2>
                    <button onClick={onClose} className="text-2xl  ">
                        <MdCancel size={25} />
                    </button>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5  text-neutral-400">Product Name</label>
                        <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} required
                            className="w-full mt-1 border border-black rounded-md p-3 outline-none focus:ring focus:ring-black" />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5  text-neutral-400"> Brand</label>
                        <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full mt-1 border border-black rounded-md p-3 outline-none focus:ring focus:ring-black" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5  text-neutral-400">Base Price (NGN)</label>
                            <input type="text" value={(price)} onChange={(e) => setPrice(e.target.value)} required className="w-full mt-1 border border-black rounded-md p-3 outline-none focus:ring focus:ring-black" />
                        </div>
                        <div>

                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5  text-neutral-400">Stock Quantity</label>
                            <input type="number" value={instock} onChange={(e) => setInstock(e.target.value)} required className="w-full mt-1 border border-black rounded-md p-3 outline-none focus:ring focus:ring-black" />
                        </div>

                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5  text-neutral-400">Category</label>

                        <select value={category} onChange={(e) => setCategory(e.target.value)}
                            className="w-full mt-1 border border-black rounded-md p-3 outline-none focus:ring focus:ring-black">

                            {/* <option value={category} >{category}</option> */}
                            {categories.map((cat) => (

                                <CategoryList category={cat} key={cat.categoryName} />

                            ))}
                        </select>
                    </div>

                    <div>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Product Description" className="w-full mt-1 border border-black rounded-md p-3 outline-none focus:ring focus:ring-black" rows={4} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5  text-neutral-400">Discount Price</label>

                            <input type="text" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} placeholder="OPTIONAL" className="w-full mt-1 border border-black rounded-md p-3 outline-none focus:ring focus:ring-black placeholder:text-neutral-300" />

                        </div>

                        <div>

                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5  text-neutral-400">Percentage Discount</label>
                            <input type="number" value={discountPercentage} onChange={(e) => setDiscountPercentage(e.target.value)} placeholder="OPTIONAL" className="w-full mt-1 border border-black rounded-md p-3 outline-none focus:ring focus:ring-black placeholder:text-neutral-300" />
                        </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-col gap-2 pt-4">
                        <button type="submit" className=" bg-black w-full text-white py-3 rounded-md font-medium hover:opacity-90 transition">
                          {loading ? "Updating..." : "Update Product"}
                        </button>

                    </div>
                </form>
            </div>
        </div>
    );
}