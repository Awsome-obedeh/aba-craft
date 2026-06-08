"use client";
import React from 'react';
import Link from 'next/link';
import ProductPagination from '@/components/ProductPagination';

const pagination = {
  currentPage: 1,
  totalPages: 5,
  totalItems: 100,
};

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F4F4] px-4 text-center">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight">AbaCraft</h1>
      <p className="text-gray-500 mt-3 max-w-md">
        Handcrafted leather goods from Aba artisans. Buy from independent makers or open your own shop.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <Link
          href="/auth/customer-signup"
          className="flex-1 bg-black text-white py-3 rounded-md font-medium hover:opacity-90 transition"
        >
          I want to buy
        </Link>
        <Link
          href="/auth/sign-up"
          className="flex-1 border border-black py-3 rounded-md font-medium hover:bg-black hover:text-white transition"
        >
          I want to sell
        </Link>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="underline">
          Sign in
        </Link>
      </p>

      {/* Hidden to preserve existing import path; useful for future product previews */}
      <div className="hidden">
        <ProductPagination pagination={pagination} />
      </div>
    </div>
  );
}
