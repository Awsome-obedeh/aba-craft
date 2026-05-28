import { formatPrice } from "@/utils/priceFormater";

export default function ProductCard({ product }) {
  return (
    <div className="border rounded-xl p-4">

      <img
        src={product.productImages[0]}
        className="w-full h-44 object-cover rounded"
      />

      <h3 className="font-bold mt-3">
        {product.productName.slice(0,25)}.....
      </h3>

      <p className="font-bold text-lg">
        {formatPrice(product.price)}
      </p>

      <p className="font-thin text-gray-500 text-sm my-3">
        {product.quantity} in stock
      </p>

      <span
        className={`px-3 py-1 rounded-full text-sm ${
          product.status === "approved"
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

        <button className="bg-black text-white flex-1 rounded">
          Edit
        </button>

      </div>

    </div>
  );
}