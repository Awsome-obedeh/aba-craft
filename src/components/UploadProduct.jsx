import React from 'react';

const UploadProduct = () => {
  return (
    <div className="bg-brandBg antialiased text-gray-900">

    <div class="flex min-h-screen">
        <aside class="w-64 bg-sidebarBg text-white flex flex-col fixed h-full z-30">
            <div class="p-8 pb-10 text-2xl font-bold tracking-tight">AbaCraft</div>
            <nav class="flex-1 px-4 space-y-1">
                <a href="#" class="flex items-center px-4 py-3 text-[11px] font-medium text-white/60 hover:text-white transition">
                    Dashboard Overview
                </a>
                <a href="/upload" class="flex items-center px-4 py-3 text-[11px] font-medium text-white/60 hover:text-white transition">
                    Upload Product
                </a>
                <a href="/product" class="flex items-center px-4 py-3 text-[11px] font-bold text-black bg-white rounded-lg shadow-sm">
                    My Inventory
                </a>
                <a href="#" class="flex items-center px-4 py-3 text-[11px] font-medium text-white/60 hover:text-white transition">
                    Orders & Leads
                </a>
                <a href="#" class="flex items-center px-4 py-3 text-[11px] font-medium text-white/60 hover:text-white transition">
                    Sales Automation
                </a>
                <a href="#" class="flex items-center px-4 py-3 text-[11px] font-medium text-white/60 hover:text-white transition">
                    Profile & Verification
                </a>
                <div class="pt-10 border-t border-white/10 mt-10 space-y-1">
                    <a href="#" class="block px-4 py-2 text-[11px] text-white/40 hover:text-white transition">Settings</a>
                    <a href="#" class="block px-4 py-2 text-[11px] text-white/40 hover:text-white transition">Logout</a>
                </div>
            </nav>
        </aside>

        <main class="flex-1 ml-64">
            <header class="h-16 bg-brandBg border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
                <div class="relative w-80">
                    <input type="text" placeholder="Search" class="w-full bg-white border border-gray-100 rounded-full py-2 pl-11 pr-4 text-[12px] outline-none" />
                </div>
                <div class="flex items-center space-x-6">
                    <div class="flex items-center space-x-3 pl-4">
                        <div class="leading-none text-right">
                            <p class="text-[11px] font-bold">Sandra Ejiofor</p>
                            <p class="text-[9px] text-gray-400 mt-0.5 tracking-tight">Vendor</p>
                        </div>
                        <div class="w-8 h-8 rounded-full overflow-hidden border border-white">
                            <img src="https://i.pravatar.cc/150?u=sandra" class="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            </header>

            <div class="p-10 max-w-4xl mx-auto">
                <h1 class="text-[24px] font-bold text-gray-900">Upload Product</h1>
                <p class="text-[12px] text-gray-400 mt-0.5 font-medium">Add you product details, upload media and publish to the marketplace.</p>

                <div class="mt-8 bg-white rounded-xl border border-gray-100 p-8 shadow-sm mb-6">
                    <div class="flex items-start space-x-4 mb-8">
                        <div class="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">1</div>
                        <div>
                            <h2 class="text-base font-bold">Product Information</h2>
                            <p class="text-[11px] text-gray-400 font-medium">Basic details about your product.</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-x-12 gap-y-6">
                        <div class="space-y-1.5">
                            <label class="text-[11px] font-bold text-gray-800">Product Name</label>
                            <input type="text" placeholder="e.g. Classic Leather Boots" class="w-full bg-inputBg border border-gray-100 rounded-lg p-2.5 text-xs outline-none" />
                        </div>
                        <div class="space-y-1.5">
                            <label class="text-[11px] font-bold text-gray-800">Category</label>
                            <select class="w-full bg-inputBg border border-gray-100 rounded-lg p-2.5 text-xs text-gray-400 outline-none">
                                <option>Select category</option>
                            </select>
                        </div>
                        <div class="space-y-1.5">
                            <label class="text-[11px] font-bold text-gray-800">Price (NGN)</label>
                            <div class="flex items-center bg-inputBg border border-gray-100 rounded-lg overflow-hidden">
                                <span class="px-3 font-bold text-gray-800 border-r border-gray-200 text-xs">₦</span>
                                <input type="text" placeholder="0.00" class="w-full bg-transparent p-2.5 text-xs outline-none" />
                            </div>
                        </div>
                        <div class="space-y-1.5">
                            <label class="text-[11px] font-bold text-gray-800">Product Description</label>
                            <textarea placeholder="Describe your product..." class="w-full bg-inputBg border border-gray-100 rounded-lg p-3 text-xs min-h-[100px] outline-none resize-none"></textarea>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-xl border border-gray-100 p-8 shadow-sm mb-6">
                    <div class="flex items-start space-x-4 mb-6">
                        <div class="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">2</div>
                        <div>
                            <h2 class="text-base font-bold">Media Gallery</h2>
                            <p class="text-[11px] text-gray-400 font-medium">Upload clear photos of your product</p>
                        </div>
                    </div>

                    <div class="border-2 border-dashed border-gray-200 bg-gray-100/50 rounded-xl p-10 flex flex-col items-center mb-8">
                        <p class="text-[14px] font-bold text-gray-700">Drag & drop images here</p>
                        <div class="flex space-x-3 mt-4">
                            <button class="bg-white border border-gray-200 rounded-md px-4 py-2 text-[10px] font-bold shadow-sm">Upload from device</button>
                            <button class="bg-white border border-gray-200 rounded-md px-4 py-2 text-[10px] font-bold shadow-sm">Use Camera</button>
                        </div>
                    </div>

                    <div>
                        <p class="text-[10px] font-bold text-gray-400 mb-4 tracking-tight">IMAGE PREVIEW <span class="font-normal">(Max 6 images)</span></p>
                        <div class="grid grid-cols-6 gap-4">
                            <div class="relative aspect-square rounded-lg purple-border bg-white p-1">
                                <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=150" class="w-full h-full object-cover rounded-md" />
                            </div>
                            <div class="aspect-square rounded-lg border border-gray-200 bg-white"></div>
                            <div class="aspect-square rounded-lg border border-gray-200 bg-white p-1">
                                <img src="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=150" class="w-full h-full object-cover rounded-md" />
                            </div>
                            <div class="aspect-square rounded-lg border border-gray-200 bg-white p-1">
                                <img src="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=150" class="w-full h-full object-cover rounded-md" />
                            </div>
                            <div class="aspect-square rounded-lg border border-gray-200 bg-white"></div>
                            <div class="aspect-square rounded-lg border border-gray-200 bg-white"></div>
                        </div>
                    </div>
                </div>
                
                <div class="w-7 h-7 rounded-full border border-gray-400 text-gray-500 flex items-center justify-center font-bold text-xs mt-4">3</div>
            </div>
        </main>
    </div>
    </div>
  );
}

export default UploadProduct;