/**
 * StatusFilterSelect
 * A reusable <select> for filtering bugs by status.
 * Replaces 8× copy-pasted status dropdown markup across Pages.
 *
 * Props:
 *   value      – current selected value
 *   onChange   – (e) => void  handler
 *   id         – html id attribute (for label association)
 *   label      – visible label text (default: "Filter by Status")
 *   className  – extra class for the wrapper <div>
 */
export default function StatusFilterSelect({
  value,
  onChange,
  id = "statusfilter",
  label = "Filter by Status",
  className = "",
}) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
      >
        <option value="All">All Workflow States</option>
        <option value="Open">Open</option>
        <option value="Closed">Closed</option>
        <option value="In Progress">In Progress</option>
        <option value="Pending">Pending</option>
        <option value="Resolved">Resolved</option>
        <option value="Not Fixed">Not Fixed</option>
      </select>
    </div>
  );
}
