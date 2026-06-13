import {
  BadgeCheck,
  Clock3,
  Eye,
} from "lucide-react";

const verifications = [
  {
    name: "ID Verification",
    type: "BVN",
    status: "review",
  },
  {
    name: "Business Registration",
    type: "CAC Certificate",
    status: "verified",
  },
  {
    name: "Address Proof",
    type: "Utility Bill",
    status: "verified",
  },
];

export default function VerificationTable({}) {
  return (
    <div className="rounded-xl border bg-white">
      <div className="border-b p-5">
        <h3 className="text-xl font-semibold">
          Verification Status
        </h3>
      </div>

      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-4 text-left">Name</th>
            <th className="p-4 text-left">Type</th>
            <th className="p-4 text-left">Status</th>
          </tr>
        </thead>

        <tbody>
          {verifications.map((item) => (
            <tr
              key={item.name}
              className="border-t"
            >
              <td className="p-4">{item.name}</td>

              <td className="p-4">{item.type}</td>

              <td className="p-4">
                {item.status === "verified" ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                    <BadgeCheck size={14} />
                    Verified
                  </span>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-700">
                      <Clock3 size={14} />
                      Under Review
                    </span>

                    <button className="text-blue-600">
                      <Eye size={16} />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}