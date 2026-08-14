import React, { useState, useEffect, useRef } from "react";
import DeveloperSidebar from "./DeveloperPage/DeveloperSidebar";
import DeveloperMyReport from "./DeveloperPage/DeveloperMyReport";
import DeveloperHistory from "./DeveloperPage/DeveloperHistory";
import DeveloperSendProject from "./DeveloperPage/DeveloperSendProject";
import DeveloperProfile from "./DeveloperPage/DeveloperProfile";
import ThemeSelector from "../components/ThemeSelector";
import DeveloperReminderModal from "../components/DeveloperReminderModal";
import { getSavedTheme, applyTheme } from "../lib/theme";
import { API_BASE } from "../lib/api";

import {
  UserCheck,
  Bug,
  HelpCircle,
  Calendar,
  Clock,
} from "lucide-react";
import UserHeaderPanel from "../components/UserHeaderPanel";
import NotificationPopupAlerts from "../components/NotificationPopupAlerts";
import ProfileModal from "../components/ProfileModal";
import { saveStoredAvatar, getStoredAvatar } from "../lib/avatar";

function DeveloperDashboard({ developer: propDeveloper, onLogout }) {
  const [devUser, setDevUser] = useState(() => {
    const saved = localStorage.getItem("developer_user");
    return saved ? JSON.parse(saved) : propDeveloper;
  });

  useEffect(() => {
    const syncUser = () => {
      const saved = localStorage.getItem("developer_user");
      if (saved) {
        try {
          setDevUser(JSON.parse(saved));
        } catch (e) {
          console.error("Error parsing developer_user", e);
        }
      }
    };
    syncUser();
    window.addEventListener("user_profile_updated", syncUser);
    return () => window.removeEventListener("user_profile_updated", syncUser);
  }, []);

  const developer = devUser || propDeveloper;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentPath, setCurrentPath] = useState("/developer/dashboard");
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [bugs, setBugs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("developer_read_notifications") || "[]",
      );
    } catch (e) {
      console.error("error in developer dashboard", e);
      return [];
    }
  });


  const [notifDateFilter, setNotifDateFilter] = useState("");
  const [recentPage, setRecentPage] = useState(1);
  const recentPerPage = 4;

  const devName = developer?.name || "Vasanthan";
  const devId =
    developer?.employee_id ||
    (developer?.id ? `DEV${String(developer.id).padStart(3, "0")}` : "DEV001");
  const devEmail = developer?.company_email || "";

  const getDueBugsForDeveloper = (allBugs) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = allBugs.filter((b) => {
      const matchesDev =
        (b.developerId && devId && b.developerId.toLowerCase().includes(devId.toLowerCase())) ||
        (b.developer && devName && b.developer.toLowerCase().includes(devName.toLowerCase()));
      if (!matchesDev) return false;

      const status = (b.devStatus || b.status || "").toLowerCase();
      if (status === "closed") return false;

      const endDateStr = b.endDate || b.dueDate || b.due_date;
      if (!endDateStr || endDateStr === "N/A") return false;

      const due = new Date(endDateStr);
      due.setHours(0, 0, 0, 0);
      if (isNaN(due.getTime())) return false;

      const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
      return diffDays <= 1;
    });

    return filtered.sort((a, b) => {
      const dateA = new Date(a.endDate || a.dueDate || a.due_date).getTime();
      const dateB = new Date(b.endDate || b.dueDate || b.due_date).getTime();
      if (dateA !== dateB) return dateA - dateB;

      const sevRank = { critical: 1, urgent: 1, high: 2, medium: 3, low: 4 };
      const sevA = sevRank[(a.severity || "").toLowerCase()] || 99;
      const sevB = sevRank[(b.severity || "").toLowerCase()] || 99;
      return sevA - sevB;
    });
  };

  const dueBugsList = getDueBugsForDeveloper(bugs);

  useEffect(() => {
    localStorage.setItem(
      "developer_read_notifications",
      JSON.stringify(readNotifIds),
    );
  }, [readNotifIds]);

  useEffect(() => {
    const activeTheme = getSavedTheme(developer, "developer");
    applyTheme(activeTheme);
  }, [developer]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showNotifDropdown &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowNotifDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifDropdown]);

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });



  const formatTimestamp = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Just now";

    const dateStr = date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });
    const timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateStr}, ${timeStr}`;
  };

  const getProjectStatusLabel = (progress, pending) => {
    if (progress === 100) return "Resolved";
    if (pending > 0) return "Pending";
    return "In Progress";
  };

  const getBadgeType = (type) => {
    if (type === "build_accepted") return "Build Accepted";
    if (type === "bug_updated") return "Not Fixed Alert";
    return "Tester Update";
  };

  const matchRecipient = (n, devId, devEmail, devName) => {
    if (n?.recipient_role !== "Developer") return false;

    const matchId = Boolean(devId) && n.recipient_id?.toUpperCase() === devId.toUpperCase();
    const matchEmail = Boolean(devEmail) && n.recipient_email?.toLowerCase() === devEmail.toLowerCase();
    const matchName = n.recipient_name?.toLowerCase()?.includes(devName?.toLowerCase() || "");

    return Boolean(matchId || matchEmail || matchName);
  };

  const filterNotificationType = (n) => {
    if (n.notification_type === "bug_assigned") return false;
    if (n.notification_type === "bug_updated") {
      return !!n.message?.toLowerCase().includes("not fixed");
    }
    return true;
  };

  const fetchAPIData = async () => {
    const [resNotifs, resBugs] = await Promise.all([
      fetch(
        `${API_BASE}/api/bugs/notifications/?recipient_id=${devId}&role=Developer`,
      ),
      fetch(`${API_BASE}/api/bugs/`),
    ]);

    let apiNotifs = [];
    if (resNotifs.ok) {
      const data = await resNotifs.json();
      apiNotifs = Array.isArray(data)
        ? data
          .filter((n) => matchRecipient(n, devId, devEmail, devName))
          .filter(filterNotificationType)
          .map((n) => ({
            id: n.id,
            message: n.message,
            rawTimestamp: n.created_at || new Date().toISOString(),
            timestamp: formatTimestamp(n.created_at),
            read: n.is_read || false,
            badge: getBadgeType(n.notification_type),
          }))
        : [];
    }

    let apiBugs = [];
    if (resBugs.ok) {
      const bugJson = await resBugs.json();
      apiBugs = Array.isArray(bugJson) ? bugJson : [];
    }

    return { apiNotifs, apiBugs };
  };

  const getLocalNotifications = () => {
    try {
      const saved = localStorage.getItem("developer_notifications");
      if (!saved) return [];

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(
          (n) =>
            n?.developerId?.toUpperCase() === devId?.toUpperCase() ||
            n?.developerName?.toLowerCase()?.includes(devName?.toLowerCase() || ""),
        )
        .map((n) => {
          const rawTime = n.rawTimestamp || n.timestamp;
          return {
            ...n,
            rawTimestamp: rawTime || new Date().toISOString(),
            timestamp: formatTimestamp(rawTime),
          };
        });
    } catch {
      return [];
    }
  };

  const buildGroupedNotifications = (apiBugs) => {
    const myOpenBugs = apiBugs.filter((b) => {
      if (b?.status !== "Open") return false;
      const bDevId = b.developerId || b.developer_id;
      const bDevName = b.developerName || b.developer_name;
      return (
        bDevId?.toUpperCase() === devId?.toUpperCase() ||
        bDevName?.toLowerCase()?.includes(devName?.toLowerCase() || "")
      );
    });

    const bugsByProject = {};
    myOpenBugs.forEach((b) => {
      const proj = b.module || "General";
      bugsByProject[proj] = (bugsByProject[proj] || 0) + 1;
    });

    return Object.entries(bugsByProject).map(([proj, count]) => ({
      id: `grouped-bug-assigned-${proj}-${count}`,
      message: `Project "${proj}": You have ${count} new bug${count > 1 ? "s" : ""} assigned in this project. Please review and start resolving them.`,
      rawTimestamp: new Date().toISOString(),
      timestamp: "Active",
      read: false,
      badge: "New Assigned Bugs",
    }));
  };

  const deduplicateNotifications = (...sources) => {
    const seen = new Set();
    const unique = [];

    sources.flat().forEach((notif) => {
      if (!notif) return;
      const key = `${notif.message}-${notif.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        if (!notif.id)
          notif.id = `local-${notif.timestamp}-${crypto.randomUUID()}`;
        unique.push(notif);
      }
    });

    unique.sort((a, b) => new Date(b.rawTimestamp) - new Date(a.rawTimestamp));
    return unique;
  };

  const loadNotifications = async () => {
    let apiNotifs = [];
    let apiBugs = [];

    try {
      const result = await fetchAPIData();
      apiNotifs = result.apiNotifs;
      apiBugs = result.apiBugs;
    } catch (e) {
      console.error("Error loading notifications from API", e);
    }

    const localNotifs = getLocalNotifications();
    const groupedNotifs = buildGroupedNotifications(apiBugs);
    const unique = deduplicateNotifications(
      groupedNotifs,
      localNotifs,
      apiNotifs,
    );
    setNotifications(unique);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    window.addEventListener("notifications_updated", loadNotifications);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications_updated", loadNotifications);
    };
  }, []);

  const loadBugs = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/bugs/`);
      if (response.ok) {
        const data = await response.json();
        const mapped = Array.isArray(data)
          ? data.map((b) => ({
            id: b.bugId || b.bug_id || `BUG-${b.id}`,
            rawId: b.id,
            title: b.title,
            description: b.description,
            module: b.module || "General",
            severity: b.severity || "Minor",
            bugType: b.bugType || b.bug_type || "Functional",
            status: b.status || "Open",
            testerStatus: b.status || "Open",
            devStatus: b.devStatus || b.dev_status || "In Progress",
            developer: b.developerName || b.developer_name || "Unassigned",
            developerId: b.developerId || "N/A",
            testerName: b.testerName || b.tester_name || "Tester",
            Assgined_Date:
              b.assignedOn ||
              b.assigned_on ||
              new Date().toLocaleDateString(),
            endDate: b.dueDate || b.due_date || "N/A",
            stepsText: b.stepsText || b.steps_text || "",
            files: b.files || [],
          }))
          : [];
        setBugs(mapped);
        return;
      }
    } catch (e) {
      console.error("Error loading bugs from API", e);
    }
  };

  useEffect(() => {
    loadBugs();
    const interval = setInterval(loadBugs, 10000);
    window.addEventListener("bugs_updated", loadBugs);
    window.addEventListener("notifications_updated", loadBugs);
    return () => {
      clearInterval(interval);
      window.removeEventListener("bugs_updated", loadBugs);
      window.removeEventListener("notifications_updated", loadBugs);
    };
  }, []);



  const handleNavigate = (path) => {
    setCurrentPath(path);
    setSidebarOpen(false);
  };

  const matchesNotifDate = (n) => {
    if (!notifDateFilter) return true;
    const timestamp = n.rawTimestamp || n.timestamp;
    if (!timestamp) return false;
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return false;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}` === notifDateFilter;
  };

  const filteredNotifications = notifications.filter(matchesNotifDate);
  const isNew = (n) => !readNotifIds.includes(n.id);
  const newNotifications = filteredNotifications.filter(isNew);
  ;



  const currentRecentActivities = filteredNotifications.slice(
    (recentPage - 1) * recentPerPage,
    recentPage * recentPerPage,
  );
  const totalRecentPages = Math.max(
    1,
    Math.ceil(filteredNotifications.length / recentPerPage),
  );

  const assignedBugs = bugs.filter(
    (b) =>
      (b.developerId &&
        devId &&
        b.developerId.toLowerCase().includes(devId.toLowerCase())) ||
      (b.developer &&
        devName &&
        b.developer.toLowerCase().includes(devName.toLowerCase())) ||
      (!b.developerId && (!b.developer || b.developer === "Unassigned")),
  );

  const totalAssigned = assignedBugs.length;
  const inProgressCount = assignedBugs.filter(
    (b) => b.devStatus === "In Progress",
  ).length;
  const pendingCount = assignedBugs.filter(
    (b) => b.devStatus === "Pending",
  ).length;
  const resolvedCount = assignedBugs.filter(
    (b) => b.devStatus === "Resolved",
  ).length;


  const projectSummary = Object.entries(
    assignedBugs.reduce((acc, bug) => {
      const key = bug.module || "General";
      if (!acc[key]) {
        acc[key] = { total: 0, resolved: 0, pending: 0, inProgress: 0 };
      }
      acc[key].total += 1;
      const status = bug.devStatus || bug.status || "Open";

      if (status === "Resolved" || status === "Closed") {
        acc[key].resolved += 1;
      } else if (status === "Pending") {
        acc[key].pending += 1;
      } else {
        acc[key].inProgress += 1;
      }
      return acc;
    }, {}),
  )
    .slice(0, 4)
    .map(([project, stats]) => {
      const progress =
        stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;


      let progressColor = "bg-blue-600";
      let badgeColor = "bg-blue-50 text-blue-700 border-blue-200";

      if (progress === 100) {
        progressColor = "bg-emerald-500";
        badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
      } else if (stats.pending > 0 || progress < 50) {
        progressColor = "bg-amber-500";
        badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
      }

      return {
        project,
        total: stats.total,
        resolved: stats.resolved,
        pending: stats.pending,
        inProgress: stats.inProgress,
        progress,
        progressColor,
        badgeColor,
      };
    });

  const recentActivities = currentRecentActivities;

  return (
    <div>
      <NotificationPopupAlerts
        role="developer"
        user={developer}
        onNotificationClick={() => setCurrentPath("/developer/myreport")}
      />
      <div className="flex h-screen bg-gray-50 text-gray-800 font-sans antialiased overflow-hidden">
        <DeveloperSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          currentPath={currentPath}
          onNavigate={handleNavigate}
          onLogout={onLogout}
          developer={developer}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="bg-white border-b border-gray-200 h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 shadow-sm">
            {/* Left: hamburger + label */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex-shrink-0 p-2 rounded-lg md:hidden text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
                aria-label="Open sidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Developer Portal
              </span>
            </div>

            {/* Right: theme + date + user */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              <ThemeSelector currentRole="developer" user={developer} />
              {/* Date pill — hidden on mobile */}
              <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-sm text-slate-700">
                <Calendar size={14} className="text-slate-500 flex-shrink-0" />
                <span className="font-medium text-xs whitespace-nowrap">{todayStr}</span>
              </div>
              <div className="relative" ref={dropdownRef}>
                <UserHeaderPanel
                  user={{ ...developer, name: devName, role: developer?.role || "Developer" }}
                  notificationCount={newNotifications.length}
                  onBellClick={() => setShowNotifDropdown((prev) => !prev)}
                  onLogout={onLogout}
                  onProfileClick={() => setShowProfileModal(true)}
                  subtitle={devEmail}
                />
                {showProfileModal && (
                  <ProfileModal
                    user={developer}
                    role="developer"
                    onClose={() => setShowProfileModal(false)}
                    onUpdateUser={(updated) => {
                      const updatedUser = { ...developer, ...updated };
                      setDevUser(updatedUser);
                      localStorage.setItem("developer_user", JSON.stringify(updatedUser));
                      saveStoredAvatar(updatedUser, updated.avatarUrl !== undefined ? updated.avatarUrl : getStoredAvatar(updatedUser));
                      window.dispatchEvent(new Event("user_profile_updated"));
                    }}
                  />
                )}
                {showNotifDropdown && (
                  <div className="fixed sm:absolute top-14 sm:top-full right-2 sm:right-0 mt-2 w-[min(340px,calc(100vw-1rem))] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 z-50 overflow-hidden text-slate-800 dark:text-slate-100">
                    <div className="p-3 bg-blue-50/70 dark:bg-slate-800 border-b border-blue-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                          Notifications
                        </span>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full border border-blue-200">
                          {filteredNotifications.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={notifDateFilter}
                          onChange={(e) => setNotifDateFilter(e.target.value)}
                          className="px-2 py-1 text-[10px] font-medium border border-blue-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                          title="Filter notifications by date"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const allIds = filteredNotifications
                              .map((notification) => notification.id)
                              .filter(Boolean);
                            setReadNotifIds((prev) => Array.from(new Set([...prev, ...allIds])));
                          }}
                          className="text-[10px] text-blue-700 dark:text-blue-300 hover:underline font-semibold cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                      {filteredNotifications.length > 0 ? (
                        filteredNotifications.map((n) => {
                          const unread = isNew(n);
                          return (
                            <div
                              key={n.id}
                              className={`p-3.5 transition-colors ${
                                unread
                                  ? "bg-blue-50/40 dark:bg-blue-950/20"
                                  : "hover:bg-gray-50/80 dark:hover:bg-slate-800/40"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/50 dark:text-blue-200">
                                  {n.badge || "Bug Update"}
                                </span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                  {n.timestamp || "Just now"}
                                </span>
                              </div>
                              <p className="text-xs text-gray-800 dark:text-slate-200 leading-snug font-medium">
                                {n.message}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        <p className="p-4 text-center text-gray-400 italic text-xs">No notifications found.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-6 overflow-x-hidden overflow-y-auto min-w-0">
            <DeveloperReminderModal
              dueBugs={dueBugsList}
              onViewBug={() => {
                handleNavigate("/developer/myreport");
              }}
            />
            {currentPath === "/developer/sendproject" && (
              <DeveloperSendProject developer={developer} />
            )}
            {currentPath === "/developer/myreport" && (
              <DeveloperMyReport
                developer={developer}
                onNavigate={handleNavigate}
              />
            )}
            {currentPath === "/developer/history" && (
              <DeveloperHistory developer={developer} />
            )}
            {currentPath === "/developer/profile" && (
              <DeveloperProfile developer={developer} />
            )}
            {currentPath === "/developer/help" && (
              <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="text-blue-600" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">
                    Developer Support & Documentation
                  </h2>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Welcome to the BugTracker Developer Portal. Use the sidebar menu
                  to navigate between your Overview Dashboard, My Report task
                  list, and Resolved History.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200">
                    <h3 className="font-bold text-xs text-blue-900 uppercase">
                      Dashboard
                    </h3>
                    <p className="text-[11px] text-blue-700 mt-1">
                      View task metrics, assigned bug counts, and activity
                      overview.
                    </p>
                  </div>
                  <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200">
                    <h3 className="font-bold text-xs text-indigo-900 uppercase">
                      My Report
                    </h3>
                    <p className="text-[11px] text-indigo-700 mt-1">
                      Update task statuses (In Progress, Pending, Resolved) and
                      view detailed bug reports.
                    </p>
                  </div>
                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                    <h3 className="font-bold text-xs text-emerald-900 uppercase">
                      History
                    </h3>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      Audit log of all resolved tasks with complete CSV export
                      capabilities.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentPath === "/developer/dashboard" && (
              <div className="max-w-7xl mx-auto space-y-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-base uppercase shadow-xs">
                      {devName.substring(0, 2)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <UserCheck className="h-3 w-3" /> Account Active
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {devId}
                        </span>
                      </div>
                      <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 mt-2">
                        Developer Dashboard
                      </h1>
                      <p className="text-sm text-gray-500 mt-1">
                        Welcome back, {devName}. Track your active issues, status
                        updates, and project progress in one view.
                      </p>
                      {devEmail ? (
                        <p className="text-sm text-slate-500 mt-2">{devEmail}</p>
                      ) : null}
                    </div>
                  </div>

                  <button
                    onClick={() => handleNavigate("/developer/myreport")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
                  >
                    <Bug className="h-4 w-4" /> View My Report Tasks
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-2xs">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Assigned Bugs
                    </span>
                    <div className="mt-3 flex items-end gap-3">
                      <span className="text-2xl font-bold text-gray-900">
                        {totalAssigned}
                      </span>
                      <span className="text-sm text-gray-500">active</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-2xs">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      In Progress
                    </span>
                    <div className="mt-3 flex items-end gap-3">
                      <span className="text-2xl font-bold text-indigo-600">
                        {inProgressCount}
                      </span>
                      <span className="text-sm text-gray-500">current</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-2xs">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Pending Resolution
                    </span>
                    <div className="mt-3 flex items-end gap-3">
                      <span className="text-2xl font-bold text-amber-600">
                        {pendingCount}
                      </span>
                      <span className="text-sm text-gray-500">needs review</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-2xs">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Resolved Bugs
                    </span>
                    <div className="mt-3 flex items-end gap-3">
                      <span className="text-2xl font-bold text-emerald-600">
                        {resolvedCount}
                      </span>
                      <span className="text-sm text-gray-500">completed</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
                  <div className="bg-white rounded-3xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          Top Projects
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Quick summary of your most active projects
                        </p>
                      </div>
                      <button
                        onClick={() => handleNavigate("/developer/myreport")}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        View full list →
                      </button>
                    </div>

                    <div className="p-2 space-y-4">
                      {projectSummary.length ? (
                        projectSummary.map((project) => (
                          <div
                            key={project.project}
                            className="rounded-3xl border border-gray-100 p-4 bg-slate-50"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-gray-900">
                                  {project.project}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {project.resolved} of {project.total} bugs
                                  resolved
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${project.badgeColor}`}
                                >
                                  {getProjectStatusLabel(project.progress, project.pending)}
                                </span>
                                <span className="text-xs text-slate-600 font-extrabold">
                                  {project.progress}%
                                </span>
                              </div>
                            </div>

                            <div className="h-2 w-full bg-gray-200 rounded-full mt-3 overflow-hidden">
                              <div
                                className={`h-full ${project.progressColor} rounded-full transition-all duration-500 ease-out`}
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-3xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                          No active projects yet. Start by accepting a new bug
                          assignment.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-gray-200 shadow-2xs overflow-hidden">
                    <div className="p-4 border-b border-blue-100 bg-blue-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-blue-900">Recent Activity</h3>
                        <p className="text-xs text-blue-700 mt-1">Latest updates from your bug feed</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={notifDateFilter}
                          onChange={(e) => {
                            setNotifDateFilter(e.target.value);
                            setRecentPage(1);
                          }}
                          className="text-xs px-2 py-1 border border-blue-200 rounded bg-white text-slate-700"
                          title="Filter by date"
                        />
                        {notifDateFilter ? (
                          <button
                            type="button"
                            onClick={() => {
                              setNotifDateFilter("");
                              setRecentPage(1);
                            }}
                            className="text-xs text-blue-700 hover:text-blue-900"
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {recentActivities.length ? (
                        recentActivities.map((activity) => (
                          <div key={activity.id} className="rounded-3xl border border-blue-100 p-3 bg-blue-50/70 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700 bg-blue-100 px-2 py-1 rounded-full border border-blue-200">
                                {activity.badge || "Update"}
                              </span>
                              <span className="text-[11px] text-slate-500">{activity.timestamp}</span>
                            </div>
                            <p className="text-sm text-slate-900 mt-2">{activity.message}</p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-3xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">No recent activity available.</div>
                      )}
                    </div>
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>Page {recentPage} of {totalRecentPages}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRecentPage((prev) => Math.max(1, prev - 1))}
                          disabled={recentPage <= 1}
                          className="px-2 py-1 rounded border bg-white disabled:opacity-50"
                        >
                          Prev
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecentPage((prev) => Math.min(totalRecentPages, prev + 1))}
                          disabled={recentPage >= totalRecentPages}
                          className="px-2 py-1 rounded border bg-white disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-200 shadow-2xs p-4">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Action Center
                      </h3>
                      <p className="text-sm text-gray-500">
                        Quick links for your next steps
                      </p>
                    </div>
                    <button
                      onClick={() => handleNavigate("/developer/help")}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Open help module
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      onClick={() => handleNavigate("/developer/myreport")}
                      className="rounded-3xl border border-indigo-100 bg-indigo-50 p-4 text-left hover:bg-indigo-100 transition-colors"
                    >
                      <p className="text-xs uppercase text-indigo-600 font-bold">
                        Review Tasks
                      </p>
                      <p className="mt-2 text-sm text-gray-900">
                        Open your bug reports and update statuses.
                      </p>
                    </button>
                    <button
                      onClick={() => handleNavigate("/developer/profile")}
                      className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-left hover:bg-emerald-100 transition-colors"
                    >
                      <p className="text-xs uppercase text-emerald-600 font-bold">
                        Profile Settings
                      </p>
                      <p className="mt-2 text-sm text-gray-900">
                        Manage your account and preferences.
                      </p>
                    </button>
                    <button
                      onClick={() => handleNavigate("/developer/sendproject")}
                      className="rounded-3xl border border-slate-100 bg-slate-50 p-4 text-left hover:bg-slate-100 transition-colors"
                    >
                      <p className="text-xs uppercase text-slate-700 font-bold">
                        Submit Build
                      </p>
                      <p className="mt-2 text-sm text-gray-900">
                        Upload a new project build for review.
                      </p>
                    </button>
                  </div>
                </div>
              </div>)};
           </main>
        </div>
      </div>
    </div>
  );
}
export default DeveloperDashboard;
