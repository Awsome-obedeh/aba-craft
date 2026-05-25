export default function ProductInfo() {
  return (
    <section className="bg-white border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center">
          1
        </div>

        <div>
          <h2 className="font-bold text-lg">
            Product Information
          </h2>

          <p className="text-sm text-gray-500">
            Basic details about your product.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">

        <div>
          <label className="text-sm font-medium">
            Product Name
          </label>

          <input
            type="text"
            placeholder="e.g Classic Leather Boots"
            className="w-full mt-2 border rounded-lg p-3 outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            Category
          </label>

          <select className="w-full mt-2 border rounded-lg p-3 outline-none">
            <option>Select category</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">
            Price (NGN)
          </label>

          <input
            type="number"
            placeholder="0.00"
            className="w-full mt-2 border rounded-lg p-3 outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            Product Description
          </label>

          <textarea
            rows={4}
            placeholder="Describe your product..."
            className="w-full mt-2 border rounded-lg p-3 outline-none"
          />
        </div>
      </div>
    </section>
  );
}