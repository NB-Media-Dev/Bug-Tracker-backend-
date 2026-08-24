
import React, { useState, useEffect } from "react";
import {
  Layers,
  Bug,
  Clock,
  CheckCircle2,
  Plus,
  FileText,
  HelpCircle,
  ArrowUpRight,
  Shield,
  Bell,
  FileArchive,
  X,
} from "lucide-react";
import { API_BASE, authFetch } from "../../lib/api";
import { getTesterInfo, matchesTester } from "../../lib/utils";

function Dashboard({ onNavigate }) {
  const tester_user = JSON.parse(localStorage.getItem("tester_user")) || { name: "QA Tester" };
  const [reportedBugs, setReportedBugs] = useState([]);
  const [buildNotifications, setBuildNotifications] = useState([]);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("tester_read_notifications") || "[]");
    } catch (e) {
      console.error("error in dashboard", e);
      return [];
    }
  });
  const [oldNotifPage, setOldNotifPage] = useState(1);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationSubject, setNotificationSubject] = useState("");
  const [notificationDetails, setNotificationDetails] = useState("");
  const [notificationToast, setNotificationToast] = useState("");
  const [notificationSending, setNotificationSending] = useState(false);

  useEffect(() => {
    localStorage.setItem("tester_read_notifications", JSON.stringify(readNotifIds));
  }, [readNotifIds]);

  const loadDashboardData = async () => {
    const { name: testerName, email: testerEmail, id: testerId } = getTesterInfo();

    try {
      const [bugsRes, subsRes] = await Promise.all([
        authFetch('/api/bugs/'),
        authFetch('/api/bugs/submissions/')
      ]);
      if (bugsRes.ok) {
        const bugsData = await bugsRes.json();
        const myBugs = (Array.isArray(bugsData) ? bugsData : []).filter((b) =>
          matchesTester(b, testerName, testerEmail, testerId)
        );
        setReportedBugs(myBugs);
      }
      if (subsRes.ok) {
        const subsData = await subsRes.json();
        setBuildNotifications(subsData);
      }
    } catch (e) {
      console.error("Error loading dashboard data from backend", e);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    window.addEventListener("notifications_updated", loadDashboardData);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications_updated", loadDashboardData);
    };
  }, []);

  const visibleBuilds = buildNotifications;
  const isNew = (n) => !readNotifIds.includes(n.id);
  const newNotifications = visibleBuilds.filter(isNew);
  const oldNotifications = visibleBuilds.filter((n) => !isNew(n));

  const markAllBuildsAsRead = async () => {
    const ids = visibleBuilds.map((n) => n.id).filter(Boolean);
    if (ids.length === 0) {
      setReadNotifIds([]);
      return;
    }
    try {
      await Promise.all(
        ids.map((id) =>
          authFetch(`${API_BASE}/api/bugs/notifications/${id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_read: true })
          })
        )
      );
    } catch (e) {
      console.error("Failed to mark notifications read on server", e);
    }
    setReadNotifIds(ids);
  };

  const oldNotifsPerPage = 2; 
  const indexOfLastOld = oldNotifPage * oldNotifsPerPage;
  const indexOfFirstOld = indexOfLastOld - oldNotifsPerPage;
  const currentOldNotifications = oldNotifications.slice(indexOfFirstOld, indexOfLastOld);
  const totalOldPages = Math.max(1, Math.ceil(oldNotifications.length / oldNotifsPerPage));

  const handleStartTesting = (build) => {
    localStorage.setItem("selected_project_name", build.projectName || build.project_name || "");
    const developerId = build.developer_id || build.developerId || "";
    const developerName = build.developerName || build.developer_name || "";
    if (developerName) localStorage.setItem("selected_developer_name", developerName);
    if (developerId) localStorage.setItem("selected_developer_id", developerId);
    localStorage.setItem("autofill_report_form", "true");
    localStorage.setItem("inbox_active_build_id", build.id);
    if (onNavigate) {
      onNavigate("/tester/inbox");
    }
  };

  const sendNotificationToAdmin = async () => {
    if (!notificationSubject.trim() && !notificationDetails.trim()) {
      setNotificationToast("Please enter a subject or message.");
      return;
    }

    setNotificationSending(true);
    setNotificationToast("");

    const storedTester = JSON.parse(localStorage.getItem("tester_user") || "{}");
    const senderId = storedTester.employee_id || storedTester.testerId || storedTester.id || "TST001";
    const projectName = localStorage.getItem("selected_project_name");

    const messageParts = [notificationSubject.trim(), notificationDetails.trim()]
      .filter(Boolean)
      .join(" - ");
    const message = projectName ? `[${projectName}] ${messageParts}` : messageParts;

    const payload = {
      recipient_email: "vasan11@gmail.com",
      recipient_role: "Admin",
      recipient_name: "System Admin",
      sender_id: senderId,
      sender_name: storedTester.name || tester_user.name || "Tester",
      notification_type: "complaint",
      message: message || "Tester submitted a notification to admin."
    };

    try {
      const response = await authFetch(`${API_BASE}/api/bugs/notifications/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setNotificationToast("Notification sent to admin.");
        setNotificationSubject("");
        setNotificationDetails("");
        setShowNotificationModal(false);
      } else {
        const errorData = await response.json();
        setNotificationToast(errorData.detail || "Unable to send notification.");
      }
    } catch (error) {
      console.error("Notification submit failed", error);
      setNotificationToast("Network error while sending notification.");
    } finally {
      setNotificationSending(false);
    }
  };

  const totalLogged = reportedBugs.length;
  const resolvedCount = reportedBugs.filter(
    (b) => b.status === "Resolved" || b.status === "Closed" || b.status === "Not Fixed"
  ).length;
  const pendingCount = reportedBugs.filter(
    (b) => b.status === "Pending" || b.status === "Open" || b.status === "In Progress" || !b.status
  ).length;

  const projectMap = reportedBugs.reduce((map, b) => {
    const key = (b.projectName || b.project_name || b.module || "General").toString();
    if (!map[key]) map[key] = { name: key, open: 0, pending: 0, resolved: 0, total: 0 };
    const status = (b.status || "").toString();
    map[key].total += 1;
    if (status === "Resolved" || status === "Closed" || status === "Not Fixed") map[key].resolved += 1;
    else if (status === "Pending") map[key].pending += 1;
    else map[key].open += 1;
    return map;
  }, {});

  const projectList = Object.values(projectMap).sort((a, b) => b.total - a.total);
  const activeProjects = projectList.length;

  const summaryCards = [
    {id:1, label: "Active Projects", value: activeProjects, icon: <Layers size={20} />, iconWrapper: "bg-blue-50 text-blue-600" },
    {id:2, label: "Total Bugs", value: totalLogged, icon: <Bug size={20} />, iconWrapper: "bg-indigo-50 text-indigo-600" },
    {id:3, label: "Pending Re-Test", value: pendingCount, icon: <Clock size={20} />, iconWrapper: "bg-amber-50 text-amber-600" },
    {id:4, label: "Bugs Resolved", value: resolvedCount, icon: <CheckCircle2 size={20} />, iconWrapper: "bg-emerald-50 text-emerald-700" }
  ];

  const quickOperations = [
    {id:1, label: "Report New Bug", icon: <Plus size={14} />, onClick: () => onNavigate("/tester/reportfrom"), className: "bg-blue-600 hover:bg-blue-700 text-white" },
    {id:2, label: "My Bug Reports", icon: <FileText size={14} />, onClick: () => onNavigate("/tester/bugreport"), className: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700" },
    {id:3, label: "History & Report ", icon: <Clock size={14} className="text-gray-400" />, onClick: () => onNavigate("/tester/historyreport"), className: "bg-gray-50 hover:bg-gray-100 text-gray-700" }
  ];

  const renderNotificationCard = (build, isOld = false) => (
    <div
      key={build.id}
      className={`p-2 rounded-xl border flex flex-col gap-2 transition-colors shadow-2xs ${
        isOld
          ? "bg-gray-50/50 border-gray-200 hover:bg-gray-50 opacity-75 hover:opacity-100"
          : "bg-blue-50/40 border-blue-100 hover:bg-blue-50/80"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`font-extrabold text-[11px] flex items-center gap-1.5 truncate ${isOld ? "text-gray-700" : "text-gray-900"}`}>
          <FileArchive size={13} className={`shrink-0 ${isOld ? "text-gray-400" : "text-blue-600"}`} />
          {build.projectName}
        </span>
        <span className="text-[9px] text-gray-400 font-mono shrink-0">{build.date || "Just now"}</span>
      </div>

      <p className="text-[10px] text-gray-600 leading-snug">
        Developer <strong>{build.developerName || build.developer_name}</strong> submitted Link: {build.projectLink || build.project_link ? (
          <a
            href={build.projectLink || build.project_link}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-50 text-blue-700 px-1 py-0.5 rounded font-mono text-[10px] hover:underline break-all"
          >
            {build.projectLink || build.project_link}
          </a>
        ) : (
          <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[10px]">{build.zipFileName || "No link"}</code>
        )}
      </p>

      <div className="pt-1 flex items-center justify-end">
        <button
          onClick={() => handleStartTesting(build)}
          className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-2xs transition-all cursor-pointer"
        >
          Start Testing
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 font-sans text-gray-800 antialiased">
      {/* Banner */}
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xs p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full w-fit">
            <Shield size={12} /> QA Testing 
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 mt-2">
            Welcome back, {tester_user.name || "QA Tester"}!
          </h1>
          <p className="text-xs text-gray-500">
            Monitor projects, log new issues, and verify developer fixes on your dashboard.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryCards.map((card) => (
          <div key={card.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{card.label}</span>
              <div className="text-2xl font-extrabold text-gray-900">{card.value}</div>
            </div>
            <div className={`p-3 rounded-xl ${card.iconWrapper}`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Quick Operations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickOperations.map((op) => (
            <button
              key={op.id}
              onClick={op.onClick}
              className={`flex items-center justify-center gap-2 p-3 font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer hover:scale-[1.01] ${op.className}`}
            >
              {op.icon} {op.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 xl:col-span-8 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide">My Projects</h2>
            {activeProjects > 0 && (
              <button
                onClick={() => onNavigate("/tester/bugreport")}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
              >
                View All <ArrowUpRight size={10} />
              </button>
            )}
          </div>

          <div className="mt-3">
            {projectList.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 italic">No project reports yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projectList.map((p) => (
                  <div
                    key={p.name}
                    className="p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-gray-900 truncate">{p.name}</div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        Total reports: <strong className="text-gray-700">{p.total}</strong>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[10px]">
                        <span className="px-2 py-0.5 rounded font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Open: {p.open}
                        </span>
                        <span className="px-2 py-0.5 rounded font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Pending: {p.pending}
                        </span>
                        <span className="px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Resolved: {p.resolved}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        localStorage.setItem("project_filter", p.name);
                        onNavigate("/tester/bugreport");
                      }}
                      className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl shadow-2xs border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100 bg-blue-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="text-blue-600" size={16} />
              <h3 className="font-bold text-blue-900 text-xs uppercase tracking-wide">Developer Builds</h3>
            </div>
            {newNotifications.length > 0 && (
              <button
                onClick={markAllBuildsAsRead}
                className="text-[10px] text-blue-700 hover:underline font-semibold cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="p-3 space-y-3 max-h-[300px] overflow-y-auto">
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider border-b pb-1">
                New Notifications ({newNotifications.length})
              </div>
                {newNotifications.length > 0 ? (
                  newNotifications.map((build) => renderNotificationCard(build, false))
                ) : (
                  <div className="p-2 text-center text-gray-400 italic text-xs">No new notifications.</div>
                )}
            </div>

            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b pb-1">
                Old Notifications ({oldNotifications.length})
              </div>
                {currentOldNotifications.length > 0 ? (
                  currentOldNotifications.map((build) => renderNotificationCard(build, true))
                ) : (
                  <div className="p-2 text-center text-gray-400 italic text-xs">No old notifications.</div>
                )}

              {oldNotifications.length > oldNotifsPerPage && (
                <div className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg text-[10px] text-gray-500">
                  <button
                    disabled={oldNotifPage === 1}
                    onClick={() => setOldNotifPage((prev) => Math.max(1, prev - 1))}
                    className="px-2 py-1 bg-white border border-gray-200 rounded disabled:opacity-50 hover:bg-gray-50 font-bold cursor-pointer"
                  >
                    Prev
                  </button>
                  <span>
                    Page {oldNotifPage} of {totalOldPages}
                  </span>
                  <button
                    disabled={oldNotifPage === totalOldPages}
                    onClick={() => setOldNotifPage((prev) => Math.min(totalOldPages, prev + 1))}
                    className="px-2 py-1 bg-white border border-gray-200 rounded disabled:opacity-50 hover:bg-gray-50 font-bold cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showNotificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Send Notification to Admin</h2>
                <p className="text-xs text-slate-500">
                  This sends a notification only. It will not create a bug report.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNotificationModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="notificationsubject"
                  className="text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Subject
                </label>
                <input
                  type="text"
                  id="notificationsubject"
                  value={notificationSubject}
                  onChange={(e) => setNotificationSubject(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                  placeholder="Brief issue subject"
                />
              </div>
              <div>
                <label
                  htmlFor="notification"
                  className="text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  Details
                </label>
                <textarea
                  id="notification"
                  value={notificationDetails}
                  onChange={(e) => setNotificationDetails(e.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                  placeholder="Describe your report or request for admin here."
                />
              </div>
              {notificationToast && (
                <div className="text-xs text-rose-600 font-medium">{notificationToast}</div>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNotificationModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={sendNotificationToAdmin}
                  disabled={notificationSending}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {notificationSending ? "Sending..." : "Send Notification"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;