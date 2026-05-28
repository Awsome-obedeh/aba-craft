export default function StatsCard() {
  return (
    <div className="bg-black text-white rounded-xl p-5">

      <h2 className="font-bold mb-4">
        Cash Inflow
      </h2>

      <div className="space-y-4">

        <div className="bg-white text-black p-4 rounded">
          ₦75,000 Weekly
        </div>

        <div className="bg-white text-black p-4 rounded">
          ₦1,500,000 Monthly
        </div>

      </div>

    </div>
  );
}