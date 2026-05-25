export default function AISidePanel() {
  return (
    <div className="space-y-4">

      {[
        {
          title: "AI assistant",
          text: "Smart suggestions for your product",
        },
        {
          title: "Auto-tagging suggestion",
          text: "Confidence: 92%",
        },
        {
          title: "Image Quality Check",
          text: "All images look good",
        },
        {
          title: "Caption Suggestion",
          text: "Premium leather boots with durable sole.",
        },
      ].map((card, index) => (
        <div
          key={index}
          className="bg-white border rounded-2xl p-5"
        >
          <h3 className="font-semibold">
            {card.title}
          </h3>

          <p className="text-sm text-gray-500 mt-2">
            {card.text}
          </p>

          <button className="mt-4 border rounded-lg px-4 py-2 text-sm">
            Use this option
          </button>
        </div>
      ))}
    </div>
  );
}