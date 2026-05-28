export default function CategoryCard({ category }) {
  return (
    <div className="border-0 rounded-lg p-3 bg-gray-200 shadow-sm">

      <p className="font-semibold capitalize font-sm text-sm tracking-wide ">
        {category.categoryName}
      </p>

      <p className="text-gray-500">
        {category.productCount} Stocks
      </p>

    </div>
  );
}