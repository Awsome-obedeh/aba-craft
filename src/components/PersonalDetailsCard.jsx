import Image from "next/image";
import { MapPin } from "lucide-react";
import { SkeletonCard } from "./skeletons/SkeletonCard";

export default function PersonalDetailsCard({ vendor, loading }) {
  return (


    <section>

      {
        loading ?
          <>

            <h2 className="mb-4 text-xl font-semibold">
              Personal Details
            </h2>

            <div className="rounded-xl border bg-white">
              <div className="border-b p-6">
                <div className="flex items-center gap-4">


                  <div>

                    {
                      // vendor && (vendor?.verificationStatus == "pending" ?
                      //   (
                      //     <span className="rounded-full badge-review px-4 py-2 text-sm ">
                      //       Verifictaion: {vendor?.verificationStatus || "unvirified"}
                      //     </span>
                      //   ) : <span className="rounded-full badge-approved px-4 py-2 text-sm ">
                      //     Verifictaion: {vendor?.verificationStatus}
                      //   </span>)
                    }


                    {/* <div className="mt-2 flex items-center gap-2 text-gray-500">
                      <MapPin size={14} />
                      {vendor.location}
                    </div> */}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-6">
                <InputField label="Name" value={vendor?.fullName|| ''} />
                <InputField label="Email" value={vendor?.email || ''} />

                <div className="grid md:grid-cols-2 gap-4">
                  <InputField label="Phone" value={vendor?.phoneNumber || ''} />
                  <InputField label="Sex" value={vendor?.sex || ''} />
                </div>
              </div>
            </div>

          </>
          : (<SkeletonCard />)
      }

    </section>
  );
}

function InputField({ label, value }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-gray-500">
        {label}
      </label>

      <input
        readOnly
        value={value}
        className="w-full rounded-lg border bg-gray-50 px-4 py-3"
      />
    </div>
  );
}