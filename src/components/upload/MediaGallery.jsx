import { FiCamera, FiUploadCloud } from "react-icons/fi";


export default function MediaGallery() {
  return (
    <section className="bg-white border rounded-2xl p-5">

      <div className="flex items-center gap-3 mb-5">
        <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center">
          2
        </div>

        <div>
          <h2 className="font-bold text-lg">
            Media Gallery
          </h2>

          <p className="text-sm text-gray-500">
            Upload clear photos of your product.
          </p>
        </div>
      </div>

      <div className="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center">
        
        <FiUploadCloud
          className="text-gray-400 mb-4"
          size={40}
        />

        <p className="text-gray-500">
          Drag & drop images here
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-5">
          <button className="border px-4 py-2 rounded-lg bg-white">
            Upload from device
          </button>

          <button className="border px-4 py-2 rounded-lg bg-white flex items-center gap-2">
            <FiCamera />
            Use Camera
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-6">
        {[1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="h-24 rounded-xl bg-gray-200"
          />
        ))}
      </div>
    </section>
  );
}