"use client"
import { formatPrice } from "@/utils/priceFormater";
import EditProductModal from "./EditProductModal";
import { useState } from "react";
import { api } from "@/app/lib/axios";
import { toast } from "react-toastify";

export default function ProductCard({ product, role }) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <div className="border rounded-xl p-4">

      <img
        src={product.productImages[0]}
        className="w-full h-44 object-cover rounded"
      />

      <h3 className="font-bold mt-3">
        {product.productName.length > 25 ? product.productName.slice(0, 25) + "....." : product.productName}
      </h3>

      <div className="mt-8 flex items-baseline gap-2 font-mono">
        {product.discountPrice > 0 ? (
          <div className="flex flex-col lg:flex-row gap-4 items-center flex-wrap">

            <span className="text-base font-black text-black">{formatPrice(product.price - product.discountPrice)}</span>
            <span className="text-xs text-neutral-500 line-through">{formatPrice(product.price)}</span>
          </div>

        ) : product.discountPercentage > 0 ? (
          <>

          <div className="flex flex-col lg:flex-row gap-4 items-center flex-wrap">

            <span className=" text-base font-black text-black">{formatPrice(((product.price - (product.discountPercentage / 100) * product.price)))}</span>
            <span className="text-xs text-neutral-500 line-through">{formatPrice(product.price)}</span>
          </div>

            <span className="text-xs bg-green-200 p-1 text-center rounded-sm text-green-600 font-semibold ml-auto">{product.discountPercentage}% OFF</span>

          </>
        ) :
          (<span className="text-base font-black text-black">{formatPrice(product.price)}</span>)


        }



      </div>

      <p className="font-thin text-gray-500 text-sm my-3">
        {product.quantity} in stock
      </p>

      <span
        className={`px-3 py-1 rounded-full text-sm ${product.status === "approved"
          ? "bg-green-100 text-green-700"
          : "bg-yellow-100 text-yellow-700"

          }`}
      >
        {product.status}
      </span>

      <div className="flex gap-2 mt-4">

        <button className="border flex-1 py-2 rounded">
          Delete
        </button>

        <button className="bg-black text-white flex-1 rounded"
          onClick={() => setIsEditModalOpen(true)}
        >
          Edit
        </button>

      </div>
      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        product={product}
        onSave={async (fields) => {
          try {
            setLoading(true);
            const res = await api.put(`/products/${product.slug}`, fields);
            if (res.data.success) {
              setLoading(false);
              toast.success("Product updated successfully!");
              setIsEditModalOpen(false);
            }
          } catch (err) {
            console.error(err);
            setLoading(false);
          }
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

        }}
        // take role to decide admin having more update features than regular users in the future, such as modifying product status, featured flag, and publish visibility
        role={role}
        loading={loading}

      />

    </div>


  );
}