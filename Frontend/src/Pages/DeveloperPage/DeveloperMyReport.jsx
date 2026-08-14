import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Eye,
  Bug,
  Clock,
  CheckCircle2,
  UploadCloud,
  FileArchive,
  Send,
  FolderGit2,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { API_BASE } from "../../lib/api";
import { normalizeBug } from "../../lib/utils";
import StatusFilterSelect from "../../components/shared/StatusFilterSelect";

function DeveloperMyReport({ developer }) {
  const [bugs, setBugs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewingBug, setViewingBug] = useState(null);
  const [resolvingProject, setResolvingProject] = useState(null);
  const [resolveProjectLink, setResolveProjectLink] = useState("");
  const [resolveNotes, setResolveNotes] = useState("");
  const [showResolveToast, setShowResolveToast] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState({});

console.log(viewingBug);


  const devName = developer?.name || "Vasanthan";
  const devId =
    developer?.employee_id ||
    (developer?.id ? `DEV${String(developer.id).padStart(3, "0")}` : "DEV001");

  const toggleProjectExpand = (projName) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projName]: !prev[projName],
    }));
  };

  const loadBugs = async () => {
    let allTasks = [];
    try {
      const response = await fetch(`${API_BASE}/api/bugs/`);
      if (response.ok) {
        const data = await response.json();
        const devBugs = data.filter((b) => {
          const bDevId = b.developerId || b.developer_id || "";
          const bDevName = b.developerName || b.developer_name || "";
          return (
            (bDevId && devId && bDevId.toUpperCase() === devId.toUpperCase()) ||
            (bDevName && devName && bDevName.toLowerCase().includes(devName.toLowerCase()))
          );
        });
        const mapped = devBugs.map((b) => ({
          ...normalizeBug(b),
          testerEdited: b.testerEdited || b.tester_edited || false,
        }));
        allTasks.push(...mapped);
      }
      setBugs(allTasks);
    } catch (e) {
      console.error("Error loading tasks from API", e);
    }
  };

  useEffect(() => {
    loadBugs();
    window.addEventListener("notifications_updated", loadBugs);
    return () => {
      window.removeEventListener("notifications_updated", loadBugs);
    };
  }, []);

  const handleOpenDetails = async (bug) => {
    setViewingBug(bug);
    if (bug.testerEdited) {
      try {
        await fetch(`${API_BASE}/api/bugs/${bug.rawId || bug.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testerEdited: false, tester_edited: false }),
        });
        setBugs((prev) =>
          prev.map((b) =>
            b.rawId === bug.rawId
              ? { ...b, testerEdited: false, tester_edited: false }
              : b,
          ),
        );
      } catch (err) {
        console.error("Error clearing testerEdited flag", err);
      }
    }
  };

  const handleDevStatusChange = async (rawId, newStatus) => {
    const targetBug = bugs.find((b) => b.rawId === rawId);
    if (!targetBug) return;

    const updatedBugs = bugs.map((b) => {
      if (b.rawId === rawId) {
        return { ...b, status: newStatus, devStatus: newStatus };
      }
      return b;
    });
    setBugs(updatedBugs);

    try {
      const res = await fetch(`${API_BASE}/api/bugs/${rawId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          testerStatus: newStatus,
          devStatus: newStatus,
          dev_status: newStatus,
        }),
      });
      if (res.ok) {
        window.dispatchEvent(new Event("notifications_updated"));
        window.dispatchEvent(new Event("bugs_updated"));
      }
    } catch (e) {
      console.error("Error updating status on backend API", e);
    }

    if (newStatus === "Resolved" || newStatus === "Fixed") {
      const projName = targetBug.module || "General";
      const projBugs = updatedBugs.filter(
        (b) => (b.module || "General") === projName,
      );
      const allResolved =
        projBugs.length > 0 &&
        projBugs.every((b) => b.status === "Resolved" || b.status === "Fixed");

      if (allResolved) {
        setResolvingProject({
          name: projName,
          bugsCount: projBugs.length,
          testerName: targetBug.testerName || "Kamatchi",
          testerId: targetBug.testerId || "TST001",
          testerEmail: targetBug.testerEmail || "",
        });
        setResolveNotes(
          `All ${projBugs.length} bugs resolved for project "${projName}". Uploading resolved build archive.`,
        );
      }
    }
  };

 
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Open":
        return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
      case "In Progress":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100";
      case "Pending":
        return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
      case "Resolved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
      case "Not Fixed":
        return "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100";
    }
  };

 
  const getSeverityBadgeStyle = (severity) => {
    switch (severity) {
      case "Critical":
      case "Blocker":
        return "bg-red-50 text-red-700 border border-red-200";
      case "High":
        return "bg-orange-50 text-orange-700 border border-orange-200";
      case "Medium":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      default:
        return "bg-blue-50 text-blue-700 border border-blue-200";
    }
  };

  const handleResolveBuildSubmit = async (e) => {
    e.preventDefault();
    if (!resolvingProject) return;
    if (!resolveProjectLink.trim()) {
      alert(
        "Please enter a resolved project Link / URL to send to the tester!",
      );
      return;
    }

    const subId = `FIX-${Date.now().toString().slice(-6)}`;
    const fullDevName = `${devName} (${devId})`;

    try {
      await fetch(`${API_BASE}/api/bugs/submissions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: subId,
          project_name: resolvingProject.name,
          developer_name: fullDevName,
          developer_id: devId,
          subject: resolveNotes ||`Resolved Project Build for ${resolvingProject.name}`,
          project_link: resolveProjectLink.trim(),
          projectLink: resolveProjectLink.trim(),
          status: "Accepted",
          claimed_by: resolvingProject.testerName,
          claimed_by_id: resolvingProject.testerId,
          claimedBy: resolvingProject.testerName,
          claimedById: resolvingProject.testerId,
          downloaded: false,
        }),
      });
    } catch (err) {
      console.error("Error creating project submission", err);
    }

    try {
      await fetch(`${API_BASE}/api/bugs/notifications/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_email: resolvingProject.testerEmail || "",
          recipient_name: resolvingProject.testerName || "Tester",
          recipient_role: "Tester",
          recipient_id: resolvingProject.testerId || "TST001",
          notification_type: "build_submitted",
          message: `Developer ${fullDevName} resolved ALL ${resolvingProject.bugsCount} bugs for project "${resolvingProject.name}" and shared project link: ${resolveProjectLink.trim()}`,
        }),
      });
    } catch (err) {
      console.error("error in handle resolved report", err);
    }

    setResolvingProject(null);
    setResolveProjectLink("");
    setResolveNotes("");
    setShowResolveToast(true);
    setTimeout(() => setShowResolveToast(false), 4000);
  };

  const filteredBugs = bugs.filter((bug) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      bug.id.toLowerCase().includes(search) ||
      bug.title.toLowerCase().includes(search) ||
      bug.module.toLowerCase().includes(search) ||
      bug.testerName.toLowerCase().includes(search);

    const matchesStatus = statusFilter === "All" || bug.status === statusFilter;

    const isDevMatch =
      (bug.developerId &&
        devId &&
        bug.developerId.toLowerCase().includes(devId.toLowerCase())) ||
      (bug.developer &&
        devName &&
        bug.developer.toLowerCase().includes(devName.toLowerCase())) ||
      (!bug.developerId && (!bug.developer || bug.developer === "Unassigned"));

    const isNotClosed =
      bug.status !== "Closed" && bug.testerStatus !== "Closed";

    return matchesSearch && matchesStatus && isDevMatch && isNotClosed;
  });

  const groupedProjects = filteredBugs.reduce((acc, bug) => {
    const projName = (bug.module || "General").trim().toUpperCase();
    if (!acc[projName]) {
      acc[projName] = [];
    }
    acc[projName].push(bug);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans text-gray-800 antialiased">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bug className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              My Report Tasks
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and update status for all bug tasks assigned to you, grouped
            by project.
          </p>
        </div>

        <button
          onClick={loadBugs}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw size={14} /> Refresh Tasks
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-2xs border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="searchterm"
            className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5"
          >
            Search Tasks
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

        <StatusFilterSelect
          id="statusfilter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
      </div>

      {Object.keys(groupedProjects).length > 0 ? (
        Object.entries(groupedProjects).map(([projName, projBugs]) => {
          const isExpanded = expandedProjects[projName] !== false; 
          const activeBugsCount = projBugs.length;
          const resolvedCount = projBugs.filter(
            (b) => b.status === "Resolved" || b.status === "Fixed",
          ).length;
          const allResolved =
            activeBugsCount > 0 &&
            projBugs.every(
              (b) => b.status === "Resolved" || b.status === "Fixed",
            );
          const latestDate = projBugs[0]?.Assgined_Date || "Recently";
          const firstBug = projBugs[0];

          return (
            <div
              key={projName}
              className="bg-white rounded-2xl shadow-2xs border border-gray-200 overflow-hidden transition-all"
            >
              <div className="p-4 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                    <FolderGit2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2 uppercase">
                      {projName}
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                        {activeBugsCount}{" "}
                        {activeBugsCount === 1 ? "Task" : "Tasks"}
                      </span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                      <Clock size={12} className="text-gray-400" />
                      Reporting Date:{" "}
                      <strong className="text-gray-700">{latestDate}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-auto md:ml-0 flex-wrap">
                  <div className="hidden sm:flex items-center gap-2 text-xs">
                    {allResolved ? (
                      <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-bold border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={13} /> All {activeBugsCount} Bugs
                        Resolved!
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg font-bold border border-gray-200">
                        Resolved {resolvedCount}/{activeBugsCount} Bugs
                      </span>
                    )}
                  </div>

                  {allResolved && (
                    <button
                      onClick={() => {
                        setResolvingProject({
                          name: projName,
                          bugsCount: activeBugsCount,
                          testerName: firstBug?.testerName || "Kamatchi",
                          testerId: firstBug?.testerId || "TST001",
                          testerEmail: firstBug?.testerEmail || "",
                        });
                        setResolveNotes(
                          `All ${activeBugsCount} bugs resolved for project "${projName}". Uploading resolved build archive.`,
                        );
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer animate-pulse"
                    >
                      <UploadCloud size={14} /> Send Resolved Build
                    </button>
                  )}

                  <button
                    onClick={() => toggleProjectExpand(projName)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Eye size={14} />
                    {isExpanded ? "Hide Report" : "View Report"}
                    {isExpanded ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="p-4 w-24">Bug ID</th>
                        <th className="p-4 w-60">Description</th>
                        <th className="p-4 w-28 text-center">Severity</th>
                        <th className="p-4 w-32">Bug Type</th>

                        <th className="p-4 w-44">Status</th>
                        <th className="p-4 w-32">Due Date</th>
                        <th className="p-4 w-36">Tester By</th>
                        <th className="p-4 w-28 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
                      {projBugs.map((bug) => (
                        <tr
                          key={bug.id}
                          onClick={(e) => {
                            if (
                              e.target.tagName !== "SELECT" &&
                              e.target.tagName !== "OPTION"
                            ) {
                              handleOpenDetails(bug);
                            }
                          }}
                          className={`cursor-pointer transition-all duration-300 ${
                            bug.testerEdited
                              ? "bg-amber-50/80 hover:bg-amber-100/95 shadow-[0_0_12px_rgba(245,158,11,0.45)] border-l-4 border-l-amber-500 font-medium"
                              : "hover:bg-blue-50/30"
                          }`}
                        >
                          <td className="p-4 font-mono font-bold text-gray-900">
                            {bug.id}
                          </td>
                          <td className="p-4 max-w-[240px] whitespace-pre-wrap break-words leading-relaxed text-gray-700">
                            <div className="font-bold text-gray-900 mb-1">
                              {bug.title}
                            </div>
                            <div className="text-xs text-gray-500 leading-normal">
                              {bug.description}
                            </div>
                          </td>                       
                          <td className="p-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityBadgeStyle(bug.severity)}`}
                            >
                              {bug.severity}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-gray-800 uppercase tracking-wide">
                            {bug.bugType}
                          </td>
                          <td className="p-4">
                            <select
                              value={
                                bug.devStatus || bug.status || "In Progress"
                              }
                              onChange={(e) =>
                                handleDevStatusChange(bug.rawId, e.target.value)
                              }
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer outline-none ${getStatusBadgeStyle(
                                bug.devStatus || bug.status,
                              )}`}
                            >
                              {(bug.status === "Open" ||
                                bug.status === "Closed" ||
                                bug.status === "Not Fixed") && (
                                <option value={bug.status}>{bug.status}</option>
                              )}
                              <option value="In Progress">In Progress</option>
                              <option value="Pending">Pending</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                          </td>
                          <td className="p-4 text-gray-650 font-mono whitespace-nowrap">
                            {bug.endDate}
                          </td>
                          <td className="p-4 text-gray-800 font-semibold uppercase whitespace-nowrap">
                            {bug.testerName || "Kamatchi"}
                            <span className="text-[10px] text-gray-455 font-normal block font-mono mt-0.5">
                              ({bug.testerId || "TST201"})
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleOpenDetails(bug)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                              title="View full details"
                            >
                              <Eye size={12} /> Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="bg-white rounded-2xl shadow-2xs border border-gray-200 p-12 text-center text-gray-400">
          <Bug size={48} className="mx-auto text-gray-300 stroke-1 mb-2" />
          <p className="font-semibold text-sm text-gray-700">
            No bug tasks currently assigned.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            When testers submit bug reports, they will be organized by project
            here.
          </p>
        </div>
      )}

      {viewingBug && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto flex flex-col border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-150 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold uppercase">
                  {viewingBug.module}
                </span>
                <h3 className="font-bold text-gray-900 text-sm truncate uppercase tracking-wider">
                  {viewingBug.id} - Bug Task Details
                </h3>
              </div>
              <button
                onClick={() => setViewingBug(null)}
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
                  {viewingBug.title}
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Description
                </h4>
                <p className="text-gray-700 mt-1 bg-gray-50 p-2.5 rounded border border-gray-200 whitespace-pre-wrap">
                  {viewingBug.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide font-semibold">
                    Reported By & Assigned To
                  </h4>
                  <p className="text-gray-800 mt-1.5 font-medium">
                    Tester:{" "}
                    <strong className="text-blue-700 uppercase">
                      {viewingBug.testerName || "Kamatchi"} (
                      {viewingBug.testerId || "TST201"})
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
                      {viewingBug.testerStatus || viewingBug.status || "Open"}
                    </strong>
                  </p>
                  <p className="text-gray-800 mt-1 font-medium">
                    Developer Status:{" "}
                    <strong className="text-indigo-700">
                      {viewingBug.devStatus || "In Progress"}
                    </strong>
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide font-semibold">
                    Classification
                  </h4>
                  <p className="text-gray-800 mt-1.5 font-medium">
                    Severity:{" "}
                    <span className="font-bold text-gray-700 uppercase">
                      {viewingBug.severity}
                    </span>
                  </p>
                  <p className="text-gray-800 mt-1 font-medium">
                    Bug Type:{" "}
                    <span className="font-bold text-indigo-650">
                      {viewingBug.bugType || "Functional"}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Steps to Reproduce
                </h4>
                <div className="text-gray-700 mt-1 bg-gray-50 p-2.5 rounded border border-gray-200">
                  {(() => {
                    const text = viewingBug?.stepsText || viewingBug?.steps_text || viewingBug?.steps_to_reproduce || "";
                    if (!text.trim()) {
                      return (
                        <span className="text-gray-400 italic">
                          No reproduction steps provided.
                        </span>
                      );
                    }
                    const lines = text
                      .split(/\r?\n/)
                      .map((l) => l.trim())
                      .filter((l) => l.length > 0);
                    if (lines.length === 0) {
                      return (
                        <span className="text-gray-400 italic">
                          No reproduction steps provided.
                        </span>
                      );
                    }
                    return (
                      <ol className="list-decimal pl-5 space-y-1.5 text-gray-800 font-medium">
                        {lines.map((line, idx) => {
                          const cleaned = line.replace(/^[-*•\d+.]\s*/, "");
                          return <li key={`step-${idx}`}>{cleaned}</li>;
                        })}
                      </ol>
                    );
                  })()}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Attached Screenshots & Files
                </h4>
                {viewingBug.files?.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {viewingBug.files.map((file, fIdx) => {
                      const fileSrc = file.preview || file.url || (typeof file === "string" ? file : "");
                      const fileName = file.name || (typeof file === "string" ? file : `Attachment_${fIdx + 1}`);
                      return (
                        <div
                          key={file.id || fIdx}
                          className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-100 h-20 w-20 shrink-0 shadow-2xs group flex flex-col items-center justify-center p-1"
                        >
                          {fileSrc ? (
                            <a
                              href={fileSrc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full h-full"
                              title={`View ${fileName}`}
                            >
                              <img
                                src={fileSrc}
                                alt={fileName}
                                className="w-full h-full object-cover hover:scale-105 transition-transform"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = "flex";
                                  }
                                }}
                              />
                              <div className="hidden flex-col items-center justify-center w-full h-full p-1 text-center bg-gray-50">
                                <FileText size={18} className="text-blue-600 mb-1" />
                                <span className="text-[9px] font-semibold text-gray-700 truncate w-full">
                                  {fileName}
                                </span>
                              </div>
                            </a>
                          ) : (
                            <div className="flex flex-col items-center justify-center w-full h-full p-1 text-center">
                              <FileText size={18} className="text-blue-600 mb-1" />
                              <span className="text-[9px] font-semibold text-gray-700 truncate w-full">
                                {fileName}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-xs">No screenshots or files attached.</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-150 flex justify-end bg-gray-50/50">
              <button
                onClick={() => setViewingBug(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {showResolveToast && (
        <div className="fixed bottom-5 right-5 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-bounce text-xs font-semibold">
          <CheckCircle2 size={16} />
          <span>Resolved build patch uploaded & sent to Tester!</span>
        </div>
      )}

      {resolvingProject && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-gray-200 animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-gray-150 bg-emerald-50/60">
              <div className="flex items-center gap-2">
                <FileArchive className="text-emerald-600 shrink-0" size={20} />
                <h3 className="font-bold text-gray-900 text-sm uppercase">
                  Upload Resolved Project Build ({resolvingProject.name})
                </h3>
              </div>
              <button
                onClick={() => setResolvingProject(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={handleResolveBuildSubmit}
              className="p-5 space-y-4 text-xs"
            >
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 space-y-1">
                <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  All {resolvingProject.bugsCount} Bugs Resolved for Project "
                  {resolvingProject.name}"
                </p>
                <p className="text-[11px] text-gray-600">
                  Target Tester:{" "}
                  <strong className="text-blue-700">
                    {resolvingProject.testerName} ({resolvingProject.testerId})
                  </strong>
                </p>
              </div>

              <div>
                <label
                  htmlFor="textnote"
                  className="block font-bold text-gray-700 uppercase tracking-wider mb-1"
                >
                  Resolution Notes / Build Subject{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="textnote"
                  name="textnote"
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="e.g. All bugs resolved for Mobile App, patch build v1.2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-gray-900"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="url"
                  className="block font-bold text-gray-700 uppercase tracking-wider mb-1"
                >
                  Project Link / URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  value={resolveProjectLink}
                  onChange={(e) => setResolveProjectLink(e.target.value)}
                  placeholder="e.g. http://localhost:3000, or design link"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-gray-900"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingProject(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Send size={14} /> Send Resolved Build to Tester
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeveloperMyReport;
