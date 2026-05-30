import React from 'react'
import { BiReset } from "react-icons/bi";

export default function ProductsFilterControl({handleApplyFilters, handleClearFilters, search, setSearch, category, setCategory, brand, setBrand, minPrice, setMinPrice, maxPrice, setMaxPrice, hasDiscount, setHasDiscount, hasPercentageDiscount, setHasPercentageDiscount}) {
  return (
     <form onSubmit={handleApplyFilters} className="border-b lg:border-b-0 lg:border-r border-black p-8 space-y-8 bg-white">
                       <div className="flex justify-between items-center">
                           <h2 className="text-sm font-bold uppercase tracking-widest">Filter Products</h2>
                           <button type="button" onClick={handleClearFilters} className="text-xs uppercase  tracking-wider  px-2 py-2 cursor-pointer rounded-md  text-white bg-black hover:opacity-100 active:rotate-45 transition-transform duration-300">
                            <BiReset size={30}/>
                           </button>
                       </div>
   
                       <div className="space-y-6">
                           <div>
                               <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 font-mono text-neutral-400">Search</label>
                               <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Product name" className="w-full bg-white text-black border border-black px-3 py-2 text-xs font-mono tracking-wider focus:outline-none placeholder:text-neutral-300 rounded-md" />
                           </div>
   
                           <div>
                               <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 font-mono text-neutral-400">Category</label>
                               <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder=" Category name" className="w-full bg-white text-black border border-black px-3 py-2 text-xs font-mono tracking-wider focus:outline-none placeholder:text-neutral-300 rounded-md" />
                           </div>
   
                           <div>
                               <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 font-mono text-neutral-400">Brand Label</label>
                               <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand Name" className="w-full bg-white text-black border border-black px-3 py-2 text-xs font-mono tracking-wider focus:outline-none placeholder:text-neutral-300 rounded-md" />
                           </div>
   
                           <div>
                               <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 font-mono text-neutral-400">Price Range</label>
                               <div className="flex gap-2">
                                   <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="MIN" className="w-1/2 bg-white text-black border border-black px-3 py-2 text-xs font-mono text-center focus:outline-none placeholder:text-neutral-300 rounded-md" />
                                   <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="MAX" className="w-1/2 bg-white text-black border border-black px-3 py-2 text-xs font-mono text-center focus:outline-none placeholder:text-neutral-300 rounded-md" />
                               </div>
                           </div>
   
                           <div className="flex items-center space-x-3 pt-2">
                               <input type="checkbox" id="discount" checked={hasDiscount} onChange={(e) => setHasDiscount(e.target.checked)} className="accent-black h-4 w-4 rounded-none border-black cursor-pointer" />
                               <label htmlFor="discount" className="text-xs font-bold uppercase tracking-wider cursor-pointer select-none">Check Discount Price</label>
                           </div>
   
                           <div className="flex items-center space-x-3 pt-2">
                               <input type="checkbox" id="percentageDiscount" checked={hasPercentageDiscount} onChange={(e) => setHasPercentageDiscount(e.target.checked)} className="accent-black h-4 w-4 rounded-none border-black cursor-pointer" />
                               <label htmlFor="percentageDiscount" className="text-xs font-bold uppercase tracking-wider cursor-pointer select-none">Check Percentage Discount</label>
                           </div>
                       </div>
   
                       <button type="submit" className="w-full bg-black text-white py-3 rounded-md font-medium hover:opacity-90 transition">Apply </button>
                   </form>
   
  )
}
