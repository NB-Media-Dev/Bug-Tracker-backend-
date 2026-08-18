import React from "react";

export default function Bugstatus({ bugs = [] }) {
  const openCount = bugs.filter(b => b.status === "Open").length;
  const inProgressCount = bugs.filter(b => b.status === "In Progress").length;
  const pendingCount = bugs.filter(b => b.status === "Pending").length;
  const resolvedCount = bugs.filter(b => b.status === "Resolved" || b.status === "Not Fixed").length;
  const closedCount = bugs.filter(b => b.status === "Closed").length;

  const bugData = [
    {id:1, status: 'Open Bug', count: openCount, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    {id:2, status: 'In Progress Bug', count: inProgressCount, color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
    {id:3, status: 'Pending Bug', count: pendingCount, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    {id:4, status: 'Resolved Bug', count: resolvedCount, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    {id:5, status: 'Closed Bug', count: closedCount, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  ];

  return (
    <div className="flex h-[200px] w-full flex-col justify-between rounded-xl border border-border bg-card p-3 shadow-sm">
      <h3 className="px-1 text-sm font-semibold text-foreground">Bug Status Overview</h3>
      
      <div className="mt-2 flex-1 overflow-y-auto pr-1">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10 border-b border-border bg-card text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="pb-2 pl-1 font-semibold">Status</th>
              <th className="pb-2 pr-1 text-right font-semibold">Count</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {bugData.map((row) => (
              <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                <td className="py-1.5 pl-1 font-medium">
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${row.color}`}>
                    {row.status}
                  </span>
                </td>
                <td className="py-1.5 pr-1 text-right font-bold text-foreground">
                  {row.count}
                </td>
              </tr>
            ))} 
          </tbody>
        </table>
      </div>
    </div>
  );
}