// src/components/EditProductModal.js
'use client';

import React, { useState, useEffect } from 'react';

export default function EditProductModal({ isOpen, onClose, product, onSave }) {
    // Form field states
    const [productName, setProductName] = useState('');
    const [brand, setBrand] = useState('');
    const [price, setPrice] = useState('');
    const [discountPrice, setDiscountPrice] = useState('');
    const [category, setCategory] = useState('');
    const [discountPercentage, setDiscountPercentage] = useState('');
    const [productImages, setProductImages] = useState([]);
    const [instock, setInstock] = useState(0);
    const [description, setDescription] = useState('');
    

    console.log("EDIT PRODUCT MODAL DATA:", product);

    // Pre-populate the form inputs whenever a new product is selected/loaded
    useEffect(() => {
        if (product) {
            setProductName(product.productName || '');
            setBrand(product.brand || '');
            setPrice(product.price || '');
            setDiscountPrice(product.discountPrice || '');
            setProductImages(product.productImages || []);
            setInstock(product.quantity);
            setCategory(product.category || '');
            setDiscountPercentage(product.discountPercentage || '');
            setDescription(product.description || '');

        }
    }, [product]);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            {/* Modal Body Frame */}
            <div className="bg-white text-black border border-black w-full max-w-md p-8 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex justify-between items-baseline border-b border-black pb-4 mb-6">
                    <h2 className="text-sm font-bold uppercase tracking-widest">Modify Index Entry</h2>
                    <button onClick={onClose} className="text-xs uppercase  tracking-wider opacity-50 hover:opacity-100 transition-opacity">
                        [ ESC ]
                    </button>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5  text-neutral-400">Object Name</label>
                        <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} required className="w-full bg-white text-black border border-black px-3 py-2 text-xs  tracking-wider focus:outline-none" />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5  text-neutral-400">Manufacturer / BrandLabel</label>
                        <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full bg-white text-black border border-black px-3 py-2 text-xs  tracking-wider focus:outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5  text-neutral-400">Base Price (NGN)</label>
                            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full bg-white text-black border border-black px-3 py-2 text-xs  tracking-wider focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5  text-neutral-400">Reduction Price</label>
                            <input type="number" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} placeholder="OPTIONAL" className="w-full bg-white text-black border border-black px-3 py-2 text-xs  tracking-wider focus:outline-none placeholder:text-neutral-300" />
                        </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-col gap-2 pt-4">
                        <button type="submit" className="w-full bg-black text-white text-xs font-bold uppercase tracking-widest py-3 hover:bg-neutral-800 transition-colors">
                            Commit Changes
                        </button>
                        <button type="button" onClick={onClose} className="w-full bg-white text-black border border-black text-xs font-bold uppercase tracking-widest py-3 hover:bg-neutral-50 transition-colors">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}