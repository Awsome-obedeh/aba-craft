export default function FlowInsight() {
  return (
    <div className="bg-white p-5 rounded-xl">

      <h3 className="font-semibold mb-5">
        Flow Insights
      </h3>

      <div className="space-y-4">

        <div className="h-32 bg-gray-200 rounded" />

        <div className="flex gap-3 text-sm">

          <span className="text-green-500">
            ● Live
          </span>

          <span className="text-yellow-500">
            ● Review
          </span>

          <span className="text-red-500">
            ● Sold Out
          </span>

        </div>

      </div>

    </div>
  );
}