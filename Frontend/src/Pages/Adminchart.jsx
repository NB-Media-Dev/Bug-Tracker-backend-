import { PieChart } from '@mui/x-charts/PieChart';

export default function AdminPieChart({ bugs = [] }) {
  const openCount = bugs.filter(b => (b.testerStatus || b.status) === "Open" && b.devStatus !== 'Resolved').length;
  const inProgressCount = bugs.filter(b => b.devStatus === "In Progress" && (b.testerStatus || b.status) !== "Closed").length;
  const resolvedCount = bugs.filter(b => (b.devStatus === "Resolved" || b.devStatus === "Fixed") && (b.testerStatus || b.status) !== "Closed").length;
  const closedCount = bugs.filter(b => (b.testerStatus || b.status) === "Closed").length;

  return (
    <div>
      <p className='font-semibold text-sm mb-2'>Bug status Overview</p>
      <PieChart
        series={[
          {
            data: [
              { id: 0, value: openCount, label: 'Open' },
              { id: 1, value: inProgressCount, label: 'In Progress' },
              { id: 2, value: resolvedCount, label: 'Resolved' },
              { id: 3, value: closedCount, label: 'Closed' }
            ],
          },
        ]}
        width={200}
        height={180}
      />
    </div>
  );
}
