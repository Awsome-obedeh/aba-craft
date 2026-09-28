import SwaggerDocs from "./SwaggerDocs";

export const metadata = {
  title: "Abacrafts API Documentation",
  description: "Interactive Swagger documentation for the Abacrafts API.",
};

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-white pb-12">
      <header className="border-b border-gray-200 bg-slate-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Abacrafts developer documentation</h1>
          <a href="/api/openapi" download="abacrafts-openapi.json" className="rounded border border-slate-500 px-4 py-2 text-sm hover:bg-slate-800">Download OpenAPI JSON</a>
        </div>
      </header>
      <SwaggerDocs />
    </main>
  );
}
