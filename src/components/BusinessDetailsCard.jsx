export default function BusinessDetailsCard({
  business,
}) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">
        Business Details
      </h2>

      <div className="rounded-xl border bg-white p-6 space-y-4">
          <label className="mb-1 block text-sm text-gray-500">Business Description</label>
        <div className="rounded-lg border p-4 text-sm text-gray-600">
          {business.businessDescription}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <InputField
            label="Business Name"
            value={business.businessName}
          />

          <InputField
            label="Category"
            value={business.businessType}
          />
        </div>

        <InputField
          label="Address"
          value={business.address}
        />

        <InputField
          label="Type"
          value={business.businessType}
        />
      </div>
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