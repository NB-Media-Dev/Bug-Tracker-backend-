import React, { useState, useEffect } from "react";
import { History, Download, Eye } from "lucide-react";
import { API_BASE, authFetch } from "../../lib/api";
import { downloadFile, escapeCSV, formatDateStandard, getProjectAcronym } from "../../lib/utils";

function DeveloperHistory({ developer }) {
  const [historyLogs, setHistoryLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("All");
  const [viewingHistory, setViewingHistory] = useState(null);

  const devName = developer?.name || "Vasanthan";
  const devId =
    developer?.employee_id ||
    (developer?.id ? `DEV${String(developer.id).padStart(3, "0")}` : "DEV001");
  const formattedDevId = devId.toLowerCase();

  const loadHistory = async () => {
    let devSentSubmissions = [];
    let devResolvedBugs = [];

    try {
      const subsRes = await authFetch(`${API_BASE}/api/bugs/submissions/`);
      if (subsRes.ok) {
        const subs = await subsRes.json();
        devSentSubmissions = subs.filter(
          (item) =>
            (item.developerName || item.developer_name || "")
              .toLowerCase()
              .includes(devName.toLowerCase()) ||
            (item.developerName || item.developer_name || "").includes(devId) ||
            (item.developer_id || "").includes(devId),
        );
      }

      const bugsRes = await authFetch(`${API_BASE}/api/bugs/`);
      if (bugsRes.ok) {
        const bugsData = await bugsRes.json();
        devResolvedBugs = bugsData.filter(
          (b) =>
            ((b.developerName || b.developer_name || "")
              .toLowerCase()
              .includes(devName.toLowerCase()) ||
              (b.developerId || "").includes(devId)) &&
            (b.status === "Closed" || b.testerStatus === "Closed"),
        );
      }
    } catch (e) {
      console.error("error in loadhistory", e);
    }

    const rawCombined = [
      ...devSentSubmissions.map((s) => {
        const startDate = formatDateStandard(s.date_submitted || s.date);
        const endDate = formatDateStandard(s.date_submitted || s.date);
        return {
          rawId: s.id,
          module: s.projectName || s.project_name || "General",
          title:
            s.subject || `${s.projectName || s.project_name} Build Submission`,
          description: `Project Link: ${s.projectLink || s.project_link || s.zipFileName || "No link"}`,
          assignedOn: startDate,
          dueDate: endDate,
          testerName: s.claimedBy || s.claimed_by || "Unclaimed",
          testerId: s.claimedById || s.claimed_by_id || "",
          devStatus: "Sent Build",
          testerStatus:
            s.claimedBy || s.claimed_by
              ? `Accepted by ${s.claimedBy || s.claimed_by}`
              : "Sent to Testers",
          projectLink: s.projectLink || s.project_link,
          type: "project_build",
        };
      }),
      ...devResolvedBugs.map((b) => {
        const startDate = formatDateStandard(
          b.assignedOn || b.assigned_on || b.created_at,
        );
        const endDate = formatDateStandard(
          b.dueDate || b.due_date || b.updated_at || b.assigned_on || b.created_at,
        );
        return {
          rawId: b.bugId || `BUG-${b.id}`,
          module: b.module || "General",
          title: b.title,
          description: b.description,
          assignedOn: startDate,
          dueDate: endDate,
          testerName: b.testerName || "Kamatchi",
          devStatus: b.devStatus || "Resolved",
          testerStatus: b.testerStatus || b.status || "Closed",
          systemNotes: b.systemNotes || "",
          files: b.files || [],
          type: "bug_report",
        };
      }),
    ];

    const chronological = [...rawCombined].sort((a, b) => {
      const numA = typeof a.rawId === 'number' ? a.rawId : (parseInt(String(a.rawId).replace(/\D/g, ''), 10) || 0);
      const numB = typeof b.rawId === 'number' ? b.rawId : (parseInt(String(b.rawId).replace(/\D/g, ''), 10) || 0);
      if (numA !== numB) return numA - numB;
      const dateA = new Date(a.assignedOn || 0).getTime();
      const dateB = new Date(b.assignedOn || 0).getTime();
      return dateA - dateB;
    });

    const projectBugCounts = {};
    const bugIdMap = new Map();

    chronological.forEach((item) => {
      const projAcronym = getProjectAcronym(item.module);
      projectBugCounts[projAcronym] = (projectBugCounts[projAcronym] || 0) + 1;
      const sequenceNum = String(projectBugCounts[projAcronym]).padStart(3, "0");
      const customBugId = `${projAcronym}-${sequenceNum}`;
      const key = item.rawId;
      bugIdMap.set(key, customBugId);
    });

    const combined = rawCombined
      .map((item) => {
        const key = item.rawId;
        const customBugId = bugIdMap.get(key) || item.rawId;
        return {
          ...item,
          id: item.rawId || customBugId,
          bugId: customBugId,
          originalBugId: item.rawId,
        };
      })
      .sort((a, b) => {
        const numA = typeof a.rawId === 'number' ? a.rawId : (parseInt(String(a.rawId).replace(/\D/g, ''), 10) || 0);
        const numB = typeof b.rawId === 'number' ? b.rawId : (parseInt(String(b.rawId).replace(/\D/g, ''), 10) || 0);
        if (numA !== numB) return numA - numB;
        const dateA = new Date(a.assignedOn || 0).getTime();
        const dateB = new Date(b.assignedOn || 0).getTime();
        return dateA - dateB;
      });

    setHistoryLogs(combined);
  };

  useEffect(() => {
    loadHistory();
  }, [devName, devId]);

  const projectsList = [
    "All",
    ...new Set(historyLogs.map((b) => b.module || "General")),
  ];

  const filteredLogs = historyLogs.filter((log) => {
    const search = searchTerm.toLowerCase();
    const bugId = (log.bugId || "").toLowerCase();
    const origId = (log.originalBugId || "").toLowerCase();
    const title = (log.title || "").toLowerCase();
    const project = (log.module || "").toLowerCase();
    const tester = (log.testerName || "Kamatchi").toLowerCase();

    const matchesSearch =
      bugId.includes(search) ||
      origId.includes(search) ||
      title.includes(search) ||
      project.includes(search) ||
      tester.includes(search);

    const matchesProject =
      projectFilter === "All" || log.module === projectFilter;

    return matchesSearch && matchesProject;
  });

  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      alert("No resolved history tasks available to export.");
      return;
    }

    const headers = [
      "Bug ID",
      "Project Name",
      "Bug Title",
      "Description",
      "Severity",
      "Tester Name",
      "Assigned Developer",
      "Developer ID",
      "Start Date",
      "End Date",
      "Tester Status",
      "Developer Status",
    ];

    const rows = filteredLogs.map((log) => [
      escapeCSV(log.bugId),
      escapeCSV(log.module || "General"),
      escapeCSV(log.title),
      escapeCSV(log.description),
      escapeCSV(log.severity),
      escapeCSV(
        log.testerName
          ? `${log.testerName} (${log.testerId || "TST201"})`
          : "Kamatchi (TST201)",
      ),
      escapeCSV(log.developerName || log.develper || devName),
      escapeCSV(log.developerId || devId),
      escapeCSV(log.assignedOn || "N/A"),
      escapeCSV(log.dueDate || "N/A"),
      escapeCSV(log.testerStatus || log.status || "Open"),
      escapeCSV(log.devStatus || "Resolved"),
    ]);

    downloadFile(
      encodeURI("data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")),
      `Developer_Resolved_History_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const getTesterStatusStyle = (status) => {
    switch (status) {
      case "Open":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Reopen":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans text-gray-800 antialiased">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Developer Task History
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Audit log of all resolved and completed bug resolution tasks.
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <Download size={14} /> Export History CSV
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-2xs border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="searchterm"
            className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5"
          >
            Search History
          </label>
          <div className="relative">
            <input
              type="text"
              id="searchterm"
              name="searchterm"
              placeholder="Search by ID, Title, Project, Tester..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="projectfilter"
            className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5"
          >
            Filter by Project
          </label>
          <select
            value={projectFilter}
            id="projectfilter"
            name="projectfilter"
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          >
            {projectsList.map((proj) => (
              <option key={proj} value={proj}>
                {proj === "All" ? "All Projects" : proj}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="p-4 w-28">Bug ID</th>
                <th className="p-4">Project Name</th>
                <th className="p-4">Tester Name</th>
                <th className="p-4 w-28">Start Date</th>
                <th className="p-4 w-28">End Date</th>
                <th className="p-4 w-32">Developer Status</th>
                <th className="p-4 w-32">Tester Status</th>
                <th className="p-4 w-32 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    <td className="p-4 font-mono font-bold text-gray-900">
                      {log.bugId}
                    </td>
                    <td className="p-4">
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-xs border border-blue-200 font-bold uppercase tracking-wider">
                        {log.module || "General"}
                      </span>
                    </td>
                    <td className="p-4 text-gray-800 font-semibold uppercase">
                      {log.testerName || "Unclaimed"}
                      {log.testerId && log.testerName !== "Unclaimed" ? (
                        <span className="text-[10px] text-gray-400 font-normal ml-1">
                          ({log.testerId})
                        </span>
                      ) : null}
                    </td>
                    <td className="p-4 text-gray-600 font-mono">
                      {log.assignedOn || "N/A"}
                    </td>
                    <td className="p-4 text-gray-600 font-mono">
                      {log.dueDate || "N/A"}
                    </td>

                    <td className="p-4">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-bold inline-block">
                        {log.devStatus || "Resolved"}
                      </span>
                    </td>

                 
                    <td className="p-4">
                      {(() => {
                        const currentStatus =
                          log.testerStatus || log.status || "Open";
                        return (
                          <span
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border inline-block ${getTesterStatusStyle(currentStatus)}`}
                          >
                            {currentStatus}
                          </span>
                        );
                      })()}
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => setViewingHistory(log)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs transition-colors cursor-pointer"
                      >
                        <Eye size={13} /> View Log
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="8"
                    className="p-8 text-center text-gray-450 bg-gray-50/50 italic text-xs"
                  >
                    <p className="font-semibold text-sm text-gray-700">
                      No resolved task history available.
                    </p>
                    <p className="mt-1">
                      When tasks are resolved, they will be archived here.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingHistory && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto flex flex-col border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-150 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold uppercase">
                  {viewingHistory.module || "General"}
                </span>
                <h3 className="font-bold text-gray-900 text-sm truncate uppercase tracking-wider">
                  {viewingHistory.bugId} - Resolved Log
                </h3>
              </div>
              <button
                onClick={() => setViewingHistory(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Bug Title
                </h4>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {viewingHistory.title}
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Description
                </h4>
                <p className="text-gray-700 mt-1 bg-gray-50 p-2.5 rounded border border-gray-200 whitespace-pre-wrap">
                  {viewingHistory.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide font-semibold">
                    Reported By & Developer
                  </h4>
                  <p className="text-gray-800 mt-1.5 font-medium">
                    Tester:{" "}
                    <strong className="text-blue-700 uppercase">
                      {viewingHistory.testerName || "Kamatchi"}
                    </strong>
                  </p>
                  <p className="text-gray-800 mt-1 font-medium">
                    Developer:{" "}
                    <strong className="text-gray-800 uppercase">
                      {devName} ({devId})
                    </strong>
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide font-semibold">
                    Workflow Statuses
                  </h4>
                  <p className="text-gray-800 mt-1.5 font-medium">
                    Tester Status:{" "}
                    <strong className="text-blue-700">
                      {viewingHistory.testerStatus ||
                        viewingHistory.status ||
                        "Open"}
                    </strong>
                  </p>
                  <p className="text-gray-800 mt-1 font-medium">
                    Developer Status:{" "}
                    <strong className="text-emerald-700">
                      {viewingHistory.devStatus || "Resolved"}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Start Date
                  </h4>
                  <p className="text-gray-900 font-mono mt-1 font-semibold">
                    {viewingHistory.assignedOn || "N/A"}
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    End Date
                  </h4>
                  <p className="text-gray-900 font-mono mt-1 font-semibold">
                    {viewingHistory.dueDate || "N/A"}
                  </p>
                </div>
              </div>

              {viewingHistory.files?.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 font-semibold text-gray-650">
                    Attached Screenshots
                  </h4>
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {viewingHistory.files.map((file) => (
                      <div
                        key={file.id}
                        className="relative rounded border border-gray-250 overflow-hidden bg-gray-100 h-16 w-16 shrink-0 shadow-2xs"
                      >
                        {file.preview ? (
                          <a
                            href={file.preview}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={file.preview}
                              alt={file.name || "Screenshot"}
                              className="w-full h-full object-cover hover:scale-105 transition-transform"
                            />
                          </a>
                        ) : (
                          <span className="text-[9px] text-gray-400 p-1 flex items-center justify-center h-full text-center truncate">
                            {file.name || "File"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-150 flex justify-end bg-gray-50/50">
              <button
                onClick={() => setViewingHistory(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeveloperHistory;
