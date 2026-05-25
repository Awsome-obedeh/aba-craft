import React from 'react';
import { MoreVertical, Search, Bell, Globe } from 'lucide-react';

const InventoryPage = () => {
  const categories = ["All", "Boots", "Belts", "Bags", "Wallets"];
  
  const stats = [
    { label: "Total Items", count: 25 },
    { label: "Live", count: 18 },
    { label: "Under Review", count: 12 },
    { label: "Sold Out", count: 1 }
  ];

  // Prices converted at ~₦1,373.00 per $1
  const products = [
    {
      id: 1,
      name: "Ariaria Oxford",
      price: 164760, // $120
      tag: "#aba_made_leather",
      status: "Live",
      image: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=500&auto=format&fit=crop"
    },
    {
      id: 2,
      name: "Aba Sovereign Belt",
      price: 61785, // $45
      tag: "#artisan_craft",
      status: "Live",
      image: "https://images.unsplash.com/photo-1624222247344-550fb8ecf7c4?q=80&w=500&auto=format&fit=crop"
    },
    {
      id: 3,
      name: "Enyimba Wallet",
      price: 41190, // $30
      tag: "#aba_made_leather",
      status: "Live",
      image: "https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=500&auto=format&fit=crop"
    },
    {
      id: 4,
      name: "Nnamdi Executive Bag",
      price: 288330, // $210
      tag: "#premium_hide",
      status: "Live",
      image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=500&auto=format&fit=crop"
    }
  ];

  // Helper function to format Naira currency
  const formatNaira = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex min-h-screen bg-[#F3E8FF]">
      {/* Sidebar - Hidden on mobile */}
      <aside className="hidden lg:flex w-64 bg-[#1A1A1A] text-gray-400 flex-col p-6 space-y-8">
        <h1 className="text-white font-bold text-xl px-2">AbaCraft</h1>
        <nav className="space-y-2">
          {["Dashboard Overview", "Upload Product", "My Inventory", "Orders & Leads", "Sales Automation", "Profile & Verification"].map((item) => (
            <div 
              key={item} 
              className={`p-3 rounded-lg cursor-pointer text-sm transition ${item === "My Inventory" ? "bg-white text-black font-semibold" : "hover:bg-gray-800"}`}
            >
              {item}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full pl-10 pr-4 py-2 rounded-full border-none bg-white shadow-sm focus:ring-2 focus:ring-purple-300 outline-none"
            />
          </div>
          <div className="flex items-center gap-4 self-end">
            <Bell className="text-blue-500 h-6 w-6 cursor-pointer" />
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold leading-tight">Sandra Ejeilor</p>
                <p className="text-xs text-gray-500">Vendor</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-300 border-2 border-white overflow-hidden">
                <img src="https://i.pravatar.cc/150?u=sandra" alt="Profile" />
              </div>
            </div>
          </div>
        </header>

        {/* Title & Filter */}
        <section className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">My Inventory</h2>
          <p className="text-gray-600 mb-6">Manage listings and monitor your stock levels</p>
          
          <div className="bg-white/50 p-6 rounded-2xl shadow-sm border border-white">
            <h3 className="font-semibold mb-4">Filter by Category</h3>
            <div className="flex flex-wrap gap-3">
              {categories.map(cat => (
                <button 
                  key={cat} 
                  className={`px-6 py-2 rounded-full text-sm font-medium transition ${cat === "All" ? "bg-black text-white" : "bg-white text-gray-600 shadow-sm"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Stat Boxes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map(stat => (
            <div key={stat.label} className="bg-[#D1D1D1] p-4 rounded-xl text-center shadow-inner">
              <p className="text-sm text-gray-700 font-medium">{stat.label} : {stat.count}</p>
            </div>
          ))}
        </div>

        {/* Product Grid */}
        <h3 className="text-xl font-bold mb-6">Product Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-3xl overflow-hidden shadow-md border border-gray-100">
              <div className="p-4 flex justify-between items-center bg-gray-50/50">
                <span className="font-bold text-gray-800 text-sm">{product.name}</span>
                <MoreVertical className="h-4 w-4 text-gray-400 cursor-pointer" />
              </div>
              
              <div className="aspect-square bg-gray-100">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>

              <div className="p-5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xl font-black text-gray-900">{formatNaira(product.price)}</span>
                  <span className="bg-[#C1F9D2] text-[#1E5631] text-[10px] px-3 py-1 rounded-full font-bold">
                    {product.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-4">{product.tag}</p>
                
                <div className="flex gap-2">
                  <button className="flex-1 py-2 text-[10px] font-bold border border-gray-200 rounded-lg">
                    Delete Product
                  </button>
                  <button className="flex-1 py-2 text-[10px] font-bold bg-[#1A1A1A] text-white rounded-lg">
                    Edit Product
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default InventoryPage;