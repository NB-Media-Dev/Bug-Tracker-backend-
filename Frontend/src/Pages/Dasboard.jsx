import React, { useState, useEffect } from "react";
import {
  User2,
  Code2Icon,
  SearchCheck,
  ArrowUpRight,
  Shield,
  Bell,
} from "lucide-react";
import AdminPieChart from "./Adminchart";
import Adminbarchart from "./AdminBarchart";
import Bugstatus from "./Bugstatus";
import { API_BASE, authFetch } from "../lib/api";
import { formatSubmissionId } from "../lib/utils";

function Dasboard({ onNavigate }) {
  const admin = JSON.parse(localStorage.getItem("admin_user") || "{}") || {};
  const [forgotPasswordAlerts, setForgotPasswordAlerts] = useState([]);
  const [reportedBugs, setReportedBugs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projectSubmissions, setProjectSubmissions] = useState([]);

  const loadAdminLogs = async () => {
    let bugs = [];
    let submissions = [];
    let notifs = [];
    let usersList = [];

    try {
      const [bugsRes, subsRes, notifsRes, usersRes] = await Promise.all([
        authFetch(`${API_BASE}/api/bugs/`),
        authFetch(`${API_BASE}/api/bugs/submissions/`),
        authFetch(`${API_BASE}/api/bugs/notifications/`),
        authFetch(`${API_BASE}/api/users/`),
      ]);

      if (bugsRes.ok) {
        const bugsData = await bugsRes.json();
        bugs = Array.isArray(bugsData) ? bugsData : bugsData.results || [];
      }

      if (subsRes.ok) {
        const subsData = await subsRes.json();
        submissions = Array.isArray(subsData)
          ? subsData
          : subsData.results || [];
        setProjectSubmissions(submissions);
      }

      if (notifsRes.ok) {
        const notifsData = await notifsRes.json();
        notifs = Array.isArray(notifsData)
          ? notifsData
          : notifsData.results || [];
        const forgotRequests = notifs
          .filter(
            (n) =>
              n.notification_type === "forgot_password" ||
              n.notificationType === "forgot_password"
          )
          .map((n) => ({
            id: n.id,
            user:
              n.user ||
              n.email ||
              n.personal_email ||
              n.message ||
              "Unknown user",
            timestamp: n.created_at || n.timestamp || "Just now",
            message: n.message || "A user requested a password reset.",
          }));
        setForgotPasswordAlerts(forgotRequests);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        usersList = Array.isArray(usersData)
          ? usersData
          : usersData.results || [];
      }

      setReportedBugs(bugs);
      setEmployees(usersList);
    } catch (e) {
      console.error("Error loading dashboard data from backend API", e);
    }
  };

  useEffect(() => {
    loadAdminLogs();
    const handleSync = () => {
      loadAdminLogs();
    };
    window.addEventListener("notifications_updated", handleSync);
    window.addEventListener("user_status_changed", handleSync);
    const interval = setInterval(loadAdminLogs, 5000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications_updated", handleSync);
      window.removeEventListener("user_status_changed", handleSync);
    };
  }, []);

  const testersCount = employees.filter(
    (e) => e.role?.toLowerCase() === "tester"
  ).length;
  const developersCount = employees.filter(
    (e) => e.role?.toLowerCase() === "developer"
  ).length;
  const totalUsersCount = employees.length;

  const onlineEmployees = employees.filter(
    (e) => e.is_online === true || e.is_online === "true" || e.is_online === 1
  );

  const stats = [
    {
      id: 1,
      label: "Total Users",
      value: String(totalUsersCount),
      color: "text-white bg-violet-500",
      accent: "bg-violet-500",
      icon: User2,
    },
    {
      id: 2,
      label: "Testers",
      value: String(testersCount),
      color: "text-white bg-teal-500",
      accent: "bg-teal-500",
      icon: SearchCheck,
    },
    {
      id: 3,
      label: "Developers",
      value: String(developersCount),
      color: "text-white bg-blue-500",
      accent: "bg-blue-500",
      icon: Code2Icon,
    },
  ];

  const normalizeName = (name) => {
    let result = "";
    let depth = 0;

    for (const ch of (name || "").toString()) {
      if (ch === "(") {
        depth++;
      } else if (ch === ")" && depth > 0) {
        depth--;
      } else if (depth === 0) {
        result += ch;
      }
    }

    return result.trim().toLowerCase();
  };

  const recentProjects = [...projectSubmissions]
    .filter((sub) => !sub.id.startsWith("FIX-"))
    .sort((a, b) => {
      const getSeq = (s) => {
        const parts = (s.id || "").split("-");
        const num = parseInt(parts[parts.length - 1], 10);
        return isNaN(num) ? 0 : num;
      };
      const seqA = getSeq(a);
      const seqB = getSeq(b);
      if (seqA !== seqB) return seqA - seqB;
      return (
        new Date(a.date_submitted || a.created_at || 0) -
        new Date(b.date_submitted || b.created_at || 0)
      );
    })
    .slice(0, 4)
    .map((sub) => {
      const projectBugs = reportedBugs.filter((b) => {
        const bugProject = (b.module || "").toString().trim().toUpperCase();
        const submissionProject = (sub.project_name || "")
          .toString()
          .trim()
          .toUpperCase();
        const bugDevId = (b.developerId || b.developer_id || "")
          .toString()
          .trim()
          .toUpperCase();
        const subDevId = (sub.developer_id || sub.developerId || "")
          .toString()
          .trim()
          .toUpperCase();
        const bugDevName = normalizeName(
          b.developerName || b.developer_name || ""
        );
        const subDevName = normalizeName(
          sub.developer_name || sub.developerName || ""
        );
        const developerMatches = (() => {
          if (subDevId) {
            return bugDevId === subDevId;
          }
          if (subDevName) {
            return bugDevName === subDevName;
          }
          return true;
        })();

        return bugProject === submissionProject && developerMatches;
      });
      const hasOpenBugs = projectBugs.some((b) => b.status !== "Closed");

      const startDate = sub.date_submitted
        ? new Date(sub.date_submitted).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "N/A";

      let displayStatus = "Open";
      if (
        sub.status === "Closed" ||
        (sub.claimed_by && projectBugs.length > 0 && !hasOpenBugs)
      ) {
        displayStatus = "Closed";
      }

      return {
        id: formatSubmissionId(sub),
        project: sub.project_name,
        developer: sub.developer_name || "Unknown Developer",
        tester: sub.claimed_by || "Not Claimed",
        startDate: startDate,
        status: displayStatus,
      };
    });



  return (
    <div className="space-y-6 font-sans text-gray-800 antialiased w-full max-w-[1800px] mx-auto px-1 sm:px-3 overflow-x-hidden">
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden p-4 sm:p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full w-fit">
            <Shield size={12} />CTO 
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-2">
            Welcome back, {admin?.username || "CTO"} !
          </h1>
          <p className="text-xs text-gray-500 max-w-2xl">
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-gray-200 p-4 sm:p-5 rounded-2xl shadow-2xs hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider line-clamp-1">
                {item.label}
              </span>
              <div className={`p-2 rounded-xl shrink-0 ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold tracking-tight text-gray-900">
                {item.value}
              </span>
              {item.change && (
                <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1 font-semibold">
                  <span className="font-medium">{item.change}</span>
                </p>
              )}
            </div>
            <div className={`mt-4 h-1 rounded-full ${item.accent}`} />
          </div>
        ))}
      </div>



      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-2xs p-4 sm:p-5 flex flex-col justify-between hover:shadow-md transition-shadow overflow-hidden">
          <AdminPieChart bugs={reportedBugs} />
        </div>

        <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-2xs p-4 sm:p-5 flex flex-col justify-between hover:shadow-md transition-shadow overflow-hidden">
          <Adminbarchart bugs={reportedBugs} />
        </div>

        <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-2xs p-4 sm:p-5 flex flex-col justify-between hover:shadow-md transition-shadow overflow-hidden sm:col-span-2 lg:col-span-1">
          <Bugstatus bugs={reportedBugs} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 xl:col-span-8 bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden w-full">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 flex-wrap gap-2">
            <h3 className="font-bold text-xs text-gray-900 uppercase tracking-wide">
              Recent Projects ({recentProjects.length})
            </h3>
            <button
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              onClick={() => onNavigate?.("/monitor")}
            >
              View All <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-200 uppercase font-semibold tracking-wider">
                  <th className="px-4 py-3 font-semibold w-28 sm:w-32">Project ID</th>
                  <th className="px-4 py-3 font-semibold">Project Name</th>
                  <th className="px-4 py-3 font-semibold w-36 sm:w-40">Developer</th>
                  <th className="px-4 py-3 font-semibold w-36 sm:w-40">Tester</th>
                  <th className="px-4 py-3 font-semibold w-28 sm:w-32">Start Date</th>
                  <th className="px-4 py-3 font-semibold w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {recentProjects.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-gray-400 italic"
                    >
                      No project submissions logged yet.
                    </td>
                  </tr>
                ) : (
                  recentProjects.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-mono font-bold text-gray-900 whitespace-nowrap">
                        {p.id}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-gray-900 uppercase">
                        {p.project}
                      </td>
                      <td className="px-4 py-3.5 text-gray-800 font-semibold truncate uppercase">
                        {p.developer}
                      </td>
                      <td className="px-4 py-3.5 text-gray-800 font-semibold truncate uppercase">
                        {p.tester}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-gray-500 whitespace-nowrap">
                        {p.startDate}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                            p.status === "Open"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl shadow-2xs border border-gray-200 overflow-hidden flex flex-col w-full">
          <div className="p-4 border-b border-gray-100 bg-slate-50/80 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                Live Online Users ({onlineEmployees.length})
              </h3>
            </div>
          </div>

          <div className="p-4 space-y-4 max-h-[460px] overflow-y-auto">
            {forgotPasswordAlerts.length > 0 && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-3 text-xs text-blue-700">
                <p className="font-semibold flex items-center gap-1.5">
                  <Bell size={14} /> Password reset request
                </p>
                {forgotPasswordAlerts.map((alert) => (
                  <p key={alert.id} className="mt-2 text-[11px] leading-snug">
                    <span className="font-semibold">{alert.user}</span> used
                    Forgot Password on {alert.timestamp}.
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {onlineEmployees.length > 0 ? (
                onlineEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 shadow-2xs hover:bg-emerald-50/70 transition-all gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs uppercase border border-emerald-300">
                        {(emp.name || emp.company_email || "U").charAt(0)}
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-gray-900 truncate">
                          {emp.name || emp.employee_id || emp.company_email}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[9px] font-bold text-slate-700 bg-blue/90 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-wider shrink-0">
                            {emp.role || "Employee"}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono truncate">
                            {emp.employee_id || emp.company_email}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold bg-emerald-500 text-white shadow-2xs shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                      Online
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-xs text-slate-500 space-y-1">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                    <User2 size={16} />
                  </div>
                  <p className="font-bold text-slate-700">No users currently online</p>
                  <p className="text-[11px] text-slate-400">
                    Live status updates automatically when employees log in.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dasboard;