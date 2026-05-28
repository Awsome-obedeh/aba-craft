export default function OrdersTable() {
  return (
    <div className="bg-white p-5 rounded-xl mt-6">

      <h2 className="font-semibold mb-4">
        Orders
      </h2>

      <table className="w-full">

        <thead>

          <tr className="text-left border-b">

            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Status</th>

          </tr>

        </thead>

        <tbody>

          <tr className="border-b">

            <td>Ethan Cole</td>
            <td>Shoe</td>
            <td>₦2,500</td>

            <td>

              <span className="bg-green-100 px-3 py-1 rounded-full">
                Live
              </span>

            </td>

          </tr>

        </tbody>

      </table>

    </div>
  );
}