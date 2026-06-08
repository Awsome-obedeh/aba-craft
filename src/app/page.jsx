'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSubMenu, setMobileSubMenu] = useState(null);

  const toggleMobileSub = (id) => {
    setMobileSubMenu(mobileSubMenu === id ? null : id);
  };

  return (
    <>
      {/* TOPBAR */}
      <div className="bg-forest h-10 flex items-center justify-between px-[5%] text-[12.5px] text-[#A8C4B4] relative z-[200]">
        <div className="flex items-center gap-5">
          <span>🇳🇬 Made in Aba, Delivered Nationwide</span>
          <div className="w-[1px] h-4 bg-white/15 hidden sm:block"></div>
          <Link href="tel:+2348100000000" className="text-xs flex items-center gap-[5px] hover:text-gold transition-colors">
            📞 +234 810 000 0000
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <Link href="https://wa.me/2348100000000" target="_blank" className="text-xs hover:text-gold transition-colors">💬 WhatsApp</Link>
          <div className="w-[1px] h-4 bg-white/15"></div>
          <Link href="/contact" className="text-xs hover:text-gold transition-colors">✉️ Contact Us</Link>
          <div className="w-[1px] h-4 bg-white/15"></div>
          <Link href="#" className="text-xs hover:text-gold transition-colors">▶ YouTube</Link>
          <Link href="#" className="text-xs hover:text-gold transition-colors">📷 Instagram</Link>
        </div>
      </div>

      {/* MAIN NAV */}
      <nav className="bg-white h-[68px] border-b border-brandBorder sticky top-0 z-[150] flex items-center px-[5%] justify-between">
        <Link href="/" className="flex items-center gap-[11px] shrink-0 mr-10">
         
          <div>
            <div className="font-serif text-xl font-bold text-dark leading-tight">Aba Craft</div>
            <div className="text-[10px] text-muted tracking-wider uppercase">Handmade in Aba</div>
          </div>
        </Link>

        {/* Desktop Menu */}
        <ul className="hidden lg:flex items-center gap-1 flex-1">
          <li className="relative group">
            <Link href="/" className="flex items-center gap-[5px] px-[14px] py-2 text-sm font-medium rounded-md bg-clay-light text-clay">Home</Link>
          </li>
          
          {/* Mega Dropdown menu */}
          <li className="relative group">
            <div className="flex items-center gap-[5px] px-[14px] py-2 text-sm font-medium rounded-md hover:bg-clay-light hover:text-clay transition-all cursor-pointer">
              Products
              <svg className="w-[14px] h-[14px] transition-transform duration-200 group-hover:rotate-180" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div className="absolute top-[calc(100%+8px)] -left-[60px] bg-white border border-brandBorder rounded-xl shadow-brand-lg w-[560px] p-6 grid grid-cols-2 gap-6 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transform translateY(8px) group-hover:translate-y-0 transition-all duration-200 z-[300]">
              <div className="flex flex-col gap-3">
                <h6 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">By Category</h6>
                <Link href="/products#footwear" className="flex gap-3 p-2 rounded-lg hover:bg-clay-light transition-colors group/item">
                  <span className="text-xl">👟</span>
                  <div>
                    <div className="text-[13.5px] font-semibold text-dark group-hover/item:text-clay">Footwear</div>
                    <div className="text-xs text-muted">Leather shoes & sandals</div>
                  </div>
                </Link>
                <Link href="/products#bags" className="flex gap-3 p-2 rounded-lg hover:bg-clay-light transition-colors group/item">
                  <span className="text-xl">👜</span>
                  <div>
                    <div className="text-[13.5px] font-semibold text-dark group-hover/item:text-clay">Bags & Leather</div>
                    <div className="text-xs text-muted">Handstitched goods</div>
                  </div>
                </Link>
                <Link href="/products#fashion" className="flex gap-3 p-2 rounded-lg hover:bg-clay-light transition-colors group/item">
                  <span className="text-xl">👘</span>
                  <div>
                    <div className="text-[13.5px] font-semibold text-dark group-hover/item:text-clay">Fashion & Garments</div>
                    <div className="text-xs text-muted">Tailored & Ankara wear</div>
                  </div>
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                <h6 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">By Type</h6>
                <Link href="/products#furniture" className="flex gap-3 p-2 rounded-lg hover:bg-clay-light transition-colors group/item">
                  <span className="text-xl">🪑</span>
                  <div>
                    <div className="text-[13.5px] font-semibold text-dark group-hover/item:text-clay">Furniture & Décor</div>
                    <div className="text-xs text-muted">Wood & rattan craft</div>
                  </div>
                </Link>
                <Link href="/products#wholesale" className="flex gap-3 p-2 rounded-lg hover:bg-clay-light transition-colors group/item">
                  <span className="text-xl">🏭</span>
                  <div>
                    <div className="text-[13.5px] font-semibold text-dark group-hover/item:text-clay">Wholesale Orders</div>
                    <div className="text-xs text-muted">Bulk & B2B supply</div>
                  </div>
                </Link>
                <Link href="/products#export" className="flex gap-3 p-2 rounded-lg hover:bg-clay-light transition-colors group/item">
                  <span className="text-xl">🌍</span>
                  <div>
                    <div className="text-[13.5px] font-semibold text-dark group-hover/item:text-clay">Diaspora & Export</div>
                    <div className="text-xs text-muted">International shipping</div>
                  </div>
                </Link>
              </div>
            </div>
          </li>

          {/* Standard Dropdown */}
          <li className="relative group">
            <div className="flex items-center gap-[5px] px-[14px] py-2 text-sm font-medium rounded-md hover:bg-clay-light hover:text-clay transition-all cursor-pointer">
              How It Works
              <svg className="w-[14px] h-[14px] transition-transform duration-200 group-hover:rotate-180" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div className="absolute top-[calc(100%+8px)] left-0 bg-white border border-brandBorder rounded-xl shadow-brand-lg min-w-[220px] py-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transform translateY(8px) group-hover:translate-y-0 transition-all duration-200 z-[300]">
              <Link href="/how-it-works#buying" className="flex items-center gap-[10px] px-[18px] py-[10px] text-[13.5px] hover:bg-clay-light hover:text-clay transition-colors"><span>🛒</span> Buying Guide</Link>
              <Link href="/how-it-works#selling" className="flex items-center gap-[10px] px-[18px] py-[10px] text-[13.5px] hover:bg-clay-light hover:text-clay transition-colors"><span>🏪</span> Become an Artisan</Link>
              <Link href="/how-it-works#delivery" className="flex items-center gap-[10px] px-[18px] py-[10px] text-[13.5px] hover:bg-clay-light hover:text-clay transition-colors"><span>🚚</span> Delivery & Shipping</Link>
              <Link href="/how-it-works#returns" className="flex items-center gap-[10px] px-[18px] py-[10px] text-[13.5px] hover:bg-clay-light hover:text-clay transition-colors"><span>🔄</span> Returns Policy</Link>
            </div>
          </li>

          <li><Link href="/about" className="flex items-center px-[14px] py-2 text-sm font-medium rounded-md hover:bg-clay-light hover:text-clay transition-all">Our Story</Link></li>
          <li><Link href="/news" className="flex items-center px-[14px] py-2 text-sm font-medium rounded-md hover:bg-clay-light hover:text-clay transition-all">News & Blog</Link></li>
          <li><Link href="/faq" className="flex items-center px-[14px] py-2 text-sm font-medium rounded-md hover:bg-clay-light hover:text-clay transition-all">FAQ</Link></li>
        </ul>

        {/* CTA Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          <Link href="/auth/sign-up" className="border border-clay text-clay text-[13.5px] font-semibold px-5 py-[10px] rounded-lg hover:bg-clay hover:text-white transition-all">Sell on Aba Crafts</Link>
          <Link href="/products" className="bg-clay text-white text-[13.5px] font-semibold px-5 py-[10px] rounded-lg hover:bg-clay-dark transition-all">Shop Now →</Link>
        </div>

        {/* Hamburger Button */}
        <button 
          className="lg:hidden flex flex-col justify-between w-6 h-[18px] relative z-[210]" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
        >
          <span className={`w-full h-[2px] bg-dark transition-transform duration-300 origin-left ${mobileMenuOpen ? 'rotate-45 translate-x-[2px] -translate-y-[1px]' : ''}`}></span>
          <span className={`w-full h-[2px] bg-dark transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
          <span className={`w-full h-[2px] bg-dark transition-transform duration-300 origin-left ${mobileMenuOpen ? '-rotate-45 translate-x-[2px] translate-y-[1px]' : ''}`}></span>
        </button>
      </nav>

      {/* MOBILE DRAWER OVERLAY */}
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[180] lg:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setMobileMenuOpen(false)}></div>

      {/* MOBILE DRAWER */}
      <div className={`fixed top-[68px] right-0 bottom-0 w-[300px] bg-white border-l border-brandBorder p-6 flex flex-col gap-2 z-[190] lg:hidden overflow-y-auto transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="mb-4">
          <input type="text" placeholder="Search products, categories…" className="w-full bg-cream border border-brandBorder rounded-lg px-4 py-[10px] text-sm focus:outline-none focus:border-clay" />
        </div>
        <Link href="/" className="py-[10px] border-b border-brandBorder text-[15px] font-medium text-dark">Home</Link>
        
        <div>
          <div className="py-[10px] border-b border-brandBorder text-[15px] font-medium text-dark flex justify-between items-center cursor-pointer" onClick={() => toggleMobileSub('products')}>
            Products <span className={`transition-transform ${mobileSubMenu === 'products' ? 'rotate-90' : ''}`}>›</span>
          </div>
          <div className={`flex flex-col gap-2 pl-4 overflow-hidden transition-all duration-300 ${mobileSubMenu === 'products' ? 'max-h-[300px] mt-2' : 'max-h-0'}`}>
            <Link href="/products#footwear" className="py-2 text-sm text-muted">👟 Footwear</Link>
            <Link href="/products#bags" className="py-2 text-sm text-muted">👜 Bags & Leather</Link>
            <Link href="/products#fashion" className="py-2 text-sm text-muted">👘 Fashion & Garments</Link>
            <Link href="/products#furniture" className="py-2 text-sm text-muted">🪑 Furniture & Décor</Link>
            <Link href="/products#wholesale" className="py-2 text-sm text-muted">🏭 Wholesale</Link>
          </div>
        </div>

        <div>
          <div className="py-[10px] border-b border-brandBorder text-[15px] font-medium text-dark flex justify-between items-center cursor-pointer" onClick={() => toggleMobileSub('how-it-works')}>
            How It Works <span className={`transition-transform ${mobileSubMenu === 'how-it-works' ? 'rotate-90' : ''}`}>›</span>
          </div>
          <div className={`flex flex-col gap-2 pl-4 overflow-hidden transition-all duration-300 ${mobileSubMenu === 'how-it-works' ? 'max-h-[250px] mt-2' : 'max-h-0'}`}>
            <Link href="/how-it-works#buying" className="py-2 text-sm text-muted">🛒 Buying Guide</Link>
            <Link href="/how-it-works#selling" className="py-2 text-sm text-muted">🏪 Become an Artisan</Link>
            <Link href="/how-it-works#delivery" className="py-2 text-sm text-muted">🚚 Delivery & Shipping</Link>
            <Link href="/how-it-works#returns" className="py-2 text-sm text-muted">🔄 Returns Policy</Link>
          </div>
        </div>

        <Link href="/about" className="py-[10px] border-b border-brandBorder text-[15px] font-medium text-dark">Our Story</Link>
        <Link href="/news" className="py-[10px] border-b border-brandBorder text-[15px] font-medium text-dark">News & Blog</Link>
        <Link href="/faq" className="py-[10px] border-b border-brandBorder text-[15px] font-medium text-dark">FAQ</Link>
        
        <div className="flex flex-col gap-3 mt-6">
          <Link href="/contact" className="border border-clay text-clay text-center py-3 rounded-lg font-semibold text-sm">Contact Us</Link>
          <Link href="/products" className="bg-clay text-white text-center py-3 rounded-lg font-semibold text-sm">Shop Now →</Link>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-cream py-16 md:py-24 px-[5%]">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(#C4572A_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
          <div>
            <div className="inline-block bg-clay-light text-clay text-sm font-semibold px-4 py-1.5 rounded-full mb-5">
              🇳🇬 Proudly Made in Aba, Nigeria
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-black text-dark leading-[1.1] mb-6">
              Africa&apos;s Finest<br />
              <span className="text-clay italic">Handcrafted</span><br />
              Products
            </h1>
            <p className="text-base sm:text-lg text-muted max-w-xl leading-relaxed mb-8">
              Discover authentic leather shoes, bags, fashion and more — made by Aba&apos;s skilled artisans. Quality you can feel. Prices you&apos;ll love. Delivered to your door.
            </p>
            <div className="flex flex-wrap gap-4 mb-12">
              <Link href="/products" className="bg-clay text-white font-semibold px-7 py-4 rounded-xl hover:bg-clay-dark shadow-md transition-all">Shop All Products →</Link>
              <Link href="/about" className="border border-brandBorder bg-white/50 backdrop-blur-sm font-semibold px-7 py-4 rounded-xl hover:bg-white transition-all text-dark">Our Story</Link>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-brandBorder">
              <div>
                <div className="font-serif text-2xl sm:text-3xl font-black text-dark">500+</div>
                <div className="text-xs text-muted mt-1">Verified Artisans</div>
              </div>
              <div>
                <div className="font-serif text-2xl sm:text-3xl font-black text-dark">3,200+</div>
                <div className="text-xs text-muted mt-1">Products Listed</div>
              </div>
              <div>
                <div className="font-serif text-2xl sm:text-3xl font-black text-dark">15K+</div>
                <div className="text-xs text-muted mt-1">Orders Delivered</div>
              </div>
              <div>
                <div className="font-serif text-2xl sm:text-3xl font-black text-dark">4.8★</div>
                <div className="text-xs text-muted mt-1">Customer Rating</div>
              </div>
            </div>
          </div>

          <div className="relative h-[350px] sm:h-[480px] w-full max-w-[520px] mx-auto lg:mr-0">
            <div className="absolute top-6 left-6 bg-gold text-dark p-4 rounded-xl font-bold shadow-lg z-30 text-xs sm:text-sm flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-black block text-dark">98%</span>
              <span className="text-center text-[11px] leading-tight mt-1 font-medium">Delivery<br />Success Rate</span>
            </div>
            <div className="absolute right-4 bottom-4 w-[75%] h-[85%] rounded-2xl overflow-hidden shadow-brand-lg z-10 border-4 border-white">
              <Image 
                src="https://images.unsplash.com/photo-1605812830455-2fadc55bc4ba?w=800&q=80" 
                alt="Aba leather craftsman at work" 
                fill 
                priority
                className="object-cover"
              />
            </div>
            <div className="absolute left-0 bottom-12 w-[45%] h-[45%] rounded-2xl overflow-hidden shadow-brand-lg z-20 border-4 border-white">
              <Image 
                src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80" 
                alt="Handcrafted Aba shoes" 
                fill 
                priority
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="bg-forest border-y border-white/10 py-5 overflow-x-auto whitespace-nowrap scrollbar-none">
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-between min-w-[900px] gap-8">
          <div className="text-white text-sm font-medium flex items-center gap-2"><span className="text-lg">✅</span> 100% Verified Artisans</div>
          <div className="text-white text-sm font-medium flex items-center gap-2"><span className="text-lg">🚚</span> Nationwide Delivery</div>
          <div className="text-white text-sm font-medium flex items-center gap-2"><span className="text-lg">🔄</span> Easy Returns & Refunds</div>
          <div className="text-white text-sm font-medium flex items-center gap-2"><span className="text-lg">🔒</span> Secure Payments</div>
          <div className="text-white text-sm font-medium flex items-center gap-2"><span className="text-lg">💬</span> 24/7 WhatsApp Support</div>
        </div>
      </div>

      {/* SHOP BY CATEGORY */}
      <section className="py-20 bg-white px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <div className="text-clay text-sm font-bold tracking-wider uppercase mb-2">Browse</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-black text-dark mb-4">Shop by Category</h2>
            <p className="text-muted">From iconic Aba leather shoes to hand-woven baskets — find it all here.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {[
              { id: 'footwear', label: '👟 Footwear', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=75' },
              { id: 'bags', label: '👜 Bags', img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&q=75' },
              { id: 'fashion', label: '👘 Fashion', img: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=300&q=75' },
              { id: 'furniture', label: '🪑 Furniture', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&q=75' },
              { id: 'wholesale', label: '🏭 Wholesale', img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300&q=75' },
              { id: 'export', label: '🌍 Export', img: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=300&q=75' },
            ].map((cat, idx) => (
              <Link href={`/products#${cat.id}`} key={idx} className="group relative h-48 rounded-xl overflow-hidden shadow-sm flex flex-col justify-end p-4 border border-brandBorder">
                <Image src={cat.img} alt={cat.label} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="relative z-10 text-white font-semibold text-sm bg-black/30 backdrop-blur-[2px] py-1.5 px-3 rounded-lg text-center w-full">{cat.label}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="py-20 bg-cream px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
            <div>
              <div className="text-clay text-sm font-bold tracking-wider uppercase mb-2">Featured</div>
              <h2 className="font-serif text-3xl sm:text-4xl font-black text-dark mb-3">Our Best Sellers</h2>
              <p className="text-muted">Top-rated products from Aba&apos;s most trusted artisans.</p>
            </div>
            <Link href="/products" className="text-clay font-bold text-sm hover:underline shrink-0 flex items-center">View All Products →</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Classic Aba Leather Oxford", cat: "Footwear", price: "₦18,500", desc: "Hand-stitched genuine leather, durable sole. Available in all sizes. A staple from Aba's master cobblers.", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80" },
              { title: "Executive Leather Briefcase", cat: "Bags", price: "₦32,000", desc: "Full-grain leather briefcase with laptop compartment. Handcrafted by Aba's leather artisans for professionals.", img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80" },
              { title: "Bespoke Ankara Senator Suit", cat: "Fashion", price: "₦25,000", desc: "Tailor-made Ankara senator outfit. Pick your fabric, send your measurements. 7-day turnaround from Aba.", img: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80" },
              { title: "Artisan Leather Sandals", cat: "Footwear", price: "₦9,500", desc: "Lightweight, breathable sandals hand-carved from premium cowhide. Comfortable for all-day wear.", img: "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=600&q=80" },
              { title: "Leather Backpack — Explorer", cat: "Bags", price: "₦27,500", desc: "Rugged yet elegant leather backpack. Perfect for students, travelers, and everyday professionals. Built to last years.", img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80" },
              { title: "Rattan Lounge Chair", cat: "Furniture", price: "₦55,000", desc: "Handwoven rattan chair with cushion. Brings natural warmth to any living room. Fully customisable finish.", img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80" }
            ].map((prod, idx) => (
              <div key={idx} className="bg-white border border-brandBorder rounded-2xl overflow-hidden shadow-sm flex flex-col group">
                <div className="relative h-64 w-full bg-cream">
                  <Image src={prod.img} alt={prod.title} fill className="object-cover group-hover:scale-102 transition-transform duration-300" />
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <span className="inline-block bg-clay-light text-clay text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md self-start mb-3">{prod.cat}</span>
                  <h3 className="text-xl font-bold text-dark mb-2 leading-snug">{prod.title}</h3>
                  <p className="text-sm text-muted leading-relaxed mb-6 flex-grow">{prod.desc}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-brandBorder mt-auto">
                    <div className="text-xl font-black text-dark">{prod.price}</div>
                    <Link href="/products" className="text-clay text-sm font-bold flex items-center gap-1 hover:text-clay-dark">Order Now →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY ABA CRAFT */}
      <section className="py-20 bg-dark text-white px-[5%]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-gold text-sm font-bold tracking-wider uppercase mb-2">Why Aba Craft</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-black leading-tight text-white mb-4">Why Thousands Trust<br />Aba Craft</h2>
            <p className="text-white/70 max-w-lg leading-relaxed">We don&apos;t just sell products. We connect you directly to the craftsmen who make them — with full quality assurance, fair pricing, and nationwide delivery.</p>
            <div className="mt-8">
              <Link href="/about" className="inline-block bg-clay text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-clay-dark transition-all text-sm">Learn Our Story →</Link>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {[
              { icon: "✅", title: "Verified Artisans", desc: "Every craftsman is vetted for quality before listing. No middlemen, no fakes." },
              { icon: "🚚", title: "Nationwide Delivery", desc: "We deliver to all 36 states. Fast, tracked, and insured shipments." },
              { icon: "🛡️", title: "Buyer Protection", desc: "Not happy? Full refund or replacement — no questions asked within 7 days." },
              { icon: "💬", title: "WhatsApp Support", desc: "Chat with our team 24/7. Custom orders, bulk pricing, and more." }
            ].map((f, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 shrink-0 flex items-center justify-center text-xl">{f.icon}</div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1.5">{f.title}</h4>
                  <p className="text-sm text-white/60 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-white px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <div className="text-clay text-sm font-bold tracking-wider uppercase mb-2">Simple Process</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-black text-dark mb-4">How It Works</h2>
            <p className="text-muted">Four easy steps from browse to doorstep.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {[
              { step: "1", title: "Browse & Choose", desc: "Explore our full catalogue of verified handmade products across all categories." },
              { step: "2", title: "Place Your Order", desc: "Select size, colour, and quantity. Pay securely — online or on delivery." },
              { step: "3", title: "Artisan Crafts It", desc: "Your item is made fresh in Aba and quality-checked before packaging." },
              { step: "4", title: "Fast Delivery", desc: "We dispatch via trusted couriers. Track your order every step of the way." }
            ].map((s, idx) => (
              <div key={idx} className="bg-cream rounded-2xl p-6 border border-brandBorder relative group">
                <div className="w-10 h-10 rounded-xl bg-clay text-white flex items-center justify-center font-bold text-sm mb-5 shadow-sm">{s.step}</div>
                <h4 className="text-lg font-bold text-dark mb-2">{s.title}</h4>
                <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/how-it-works" className="text-clay font-bold text-sm hover:underline">Full Process Details →</Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 bg-cream px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <div className="text-clay text-sm font-bold tracking-wider uppercase mb-2">Reviews</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-black text-dark mb-4">What Our Customers Say</h2>
            <p className="text-muted">Real stories from buyers across Nigeria and the diaspora.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Emeka Okonkwo", loc: "Lagos State • Footwear Buyer", initial: "EO", bg: "bg-clay", color: "text-white", text: "I ordered custom leather shoes for my wedding and they were absolutely perfect — rivals anything from Lagos boutiques, at half the price. Aba Craft is something special." },
              { name: "Fatima Danladi", loc: "Abuja • Wholesale Buyer", initial: "FD", bg: "bg-forest", color: "text-white", text: "As a retailer in Abuja, finding consistent quality from Aba was always a challenge. Aba Craft solved that completely. My wholesale orders arrive on time, every time." },
              { name: "Chukwuemeka Nwosu", loc: "London, UK • Diaspora Customer", initial: "CN", bg: "bg-gold", color: "text-dark", text: "Being in London and wanting authentic Nigerian-made goods has always been hard. Aba Craft ships internationally and the packaging is beautiful. I am now a regular customer." }
            ].map((t, idx) => (
              <div key={idx} className="bg-white border border-brandBorder p-8 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <div className="text-gold mb-4 text-sm tracking-wide">★★★★★</div>
                  <p className="text-[14.5px] text-brandText leading-relaxed italic mb-6">&ldquo;{t.text}&rdquo;</p>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-brandBorder">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${t.bg} ${t.color}`}>{t.initial}</div>
                  <div>
                    <div className="text-sm font-bold text-dark">{t.name}</div>
                    <div className="text-xs text-muted mt-0.5">{t.loc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="bg-clay text-white py-16 px-[5%] text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="font-serif text-3xl sm:text-4xl font-black mb-4">Ready to Experience Aba&apos;s Best?</h2>
          <p className="text-white/80 text-sm sm:text-base leading-relaxed mb-8 max-w-xl mx-auto">Join over 15,000 happy customers. Browse our catalogue, place your order, and receive authentic Nigerian craftsmanship at your doorstep.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/products" className="bg-white text-clay font-bold px-7 py-3.5 rounded-xl hover:bg-cream transition-all text-sm">Shop Now</Link>
            <Link href="https://wa.me/2348100000000" className="border border-white/40 bg-white/10 backdrop-blur-sm text-white font-bold px-7 py-3.5 rounded-xl hover:bg-white/20 transition-all text-sm">💬 Chat on WhatsApp</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-dark text-white pt-16 pb-8 px-[5%] border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 pb-12 border-b border-white/10">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-clay rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 2V22M3 7L21 17M21 7L3 17" stroke="white" strokeWidth="1" strokeOpacity="0.5"/></svg>
              </div>
              <span className="font-serif text-lg font-bold text-white">Aba Craft</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-sm">Connecting Aba&apos;s finest artisans with buyers across Nigeria and the world. Handmade with pride. Delivered with care.</p>
          </div>
          
          {/* Columns */}
          {["Products", "Company", "Support"].map((title, colIdx) => (
            <div key={colIdx}>
              <h5 className="text-sm font-bold text-white uppercase tracking-wider mb-4">{title}</h5>
              <ul className="flex flex-col gap-3 text-sm text-white/50">
                {title === "Products" && <>
                  <li><Link href="/products#footwear" className="hover:text-white transition-colors">Footwear</Link></li>
                  <li><Link href="/products#bags" className="hover:text-white transition-colors">Bags & Leather</Link></li>
                  <li><Link href="/products#fashion" className="hover:text-white transition-colors">Fashion</Link></li>
                  <li><Link href="/products#furniture" className="hover:text-white transition-colors">Furniture</Link></li>
                </>}
                {title === "Company" && <>
                  <li><Link href="/about" className="hover:text-white transition-colors">Our Story</Link></li>
                  <li><Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
                  <li><Link href="/news" className="hover:text-white transition-colors">News & Blog</Link></li>
                  <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                </>}
                {title === "Support" && <>
                  <li><Link href="/how-it-works#buying" className="hover:text-white transition-colors">Buying Guide</Link></li>
                  <li><Link href="/how-it-works#delivery" className="hover:text-white transition-colors">Track Your Order</Link></li>
                  <li><Link href="/how-it-works#returns" className="hover:text-white transition-colors">Returns Policy</Link></li>
                  <li><Link href="/contact" className="hover:text-white transition-colors">Raise a Complaint</Link></li>
                </>}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-white/40 gap-4">
          <span>© 2026 Aba Craft. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="#" className="hover:underline">Privacy Policy</Link>
            <Link href="#" className="hover:underline">Terms of Use</Link>
          </div>
        </div>
      </footer>
    </>
  );
}