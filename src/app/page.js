"use client"
import React from 'react'
import Link from 'next/link';
import ProductPagination from '@/components/ProductPagination';

const pagination = {
  currentPage: 1,
  totalPages: 5,
  totalItems: 100
};

export default function page() {
  return (

    <>
    <Link href="/auth/sign-up">
      Sell on thirveabia

    </Link>
      <ProductPagination pagination={pagination} />
    </>
  )
}
