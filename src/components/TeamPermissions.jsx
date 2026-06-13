export default function TeamPermissions() {
  const team = [
    {
      name: "Edet Udo",
      role: "Admin",
      edit: true,
    },
    {
      name: "Dapo U.G",
      role: "Editor",
      edit: false,
    },
    {
      name: "Igwe Eze",
      role: "Admin",
      edit: true,
    },
  ];

  return (
    <div className="rounded-xl border bg-white p-5">
      <h3 className="text-xl font-semibold">
        Account Settings
      </h3>

      <p className="mt-1 text-sm text-gray-500">
        Manage team member roles and dashboard
        permissions.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm">
              <th>Name</th>
              <th>Role</th>
              <th>Edit</th>
            </tr>
          </thead>

          <tbody>
            {team.map((member) => (
              <tr key={member.name}>
                <td className="py-3">{member.name}</td>

                <td>
                  <select className="rounded border px-2 py-1">
                    <option>{member.role}</option>
                  </select>
                </td>

                <td>
                  <input
                    type="checkbox"
                    checked={member.edit}
                    readOnly
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="mt-5 w-full rounded-lg border py-2 hover:bg-gray-50">
        Manage Permissions
      </button>
    </div>
  );
}