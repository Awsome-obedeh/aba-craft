import DashboardLayout from "@/components/layout/DashboardLayout";
import ProductInfo from "@/components/upload/ProductInfo";
import MediaGallery from "@/components/upload/MediaGallery";
import SalesAutomation from "@/components/upload/SalesAutomation";
import AISidePanel from "@/components/upload/AISidePanel";

export default function UploadProductPage() {
    const role="admin"
  return (
    <DashboardLayout role={role}>

      <div className="flex flex-col xl:flex-row gap-6">

        {/* Left */}
        <div className="flex-1 space-y-5">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                Upload Product
              </h1>

              <p className="text-gray-500 mt-1">
                Add your product details, upload media and publish.
              </p>
            </div>

            <div className="flex gap-3">
              <button className="border px-5 py-2 rounded-lg bg-white">
                Save Draft
              </button>

              <button className="bg-black text-white px-5 py-2 rounded-lg">
                Save Draft
              </button>
            </div>
          </div>

          <ProductInfo />

          <MediaGallery />

          <SalesAutomation />
        </div>

        {/* Right */}
        <div className="w-full xl:w-[300px] bg-red-600">
          <AISidePanel />
        </div>
      </div>
    </DashboardLayout>
  );
}