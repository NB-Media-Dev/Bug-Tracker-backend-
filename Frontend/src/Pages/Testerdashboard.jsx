
import { useState, useEffect, useRef } from "react";
import {
  FileArchive,
  Bug,
  Calendar,
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Inbox,
  ArrowRight,
  CheckCheck,
  Shield,
} from "lucide-react";
import UserHeaderPanel from "../components/UserHeaderPanel";
import Dashboard from "./TesterPage/Dashboard";
import Reportfrom from "./TesterPage/Reportform";
import Mybugreport from "./TesterPage/Mybugreport";
import Sidebar from "./TesterPage/Sidebar";
import InboxDashboard from "./TesterPage/InboxDashboard";
import HistoryReport from "./TesterPage/HistoryReport";
import ThemeSelector from "../components/ThemeSelector";
import { getSavedTheme, applyTheme } from "../lib/theme";
import NotificationPopupAlerts from "../components/NotificationPopupAlerts";
import ProfileModal from "../components/ProfileModal";
import UnsavedBugWarningModal from "../components/UnsavedBugWarningModal";
import { saveStoredAvatar, getStoredAvatar } from "../lib/avatar";
import { API_BASE, authFetch } from "../lib/api";
import { formatNotificationMessage, truncateText } from "../lib/utils";

const renderNotifBadgeIcon = (badge, message) => {
  const b = (badge || "").toLowerCase();
  const m = (message || "").toLowerCase();

  if (b.includes("admin") || b.includes("account") || m.includes("account update") || m.includes("by admin")) {
    return {
      icon: <Shield className="w-4 h-4 text-purple-600 shrink-0" />,
      bg: "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700",
      dot: "bg-purple-500",
    };
  }
  if (b.includes("accepted") || m.includes("accepted") || b.includes("resolved") || m.includes("resolved")) {
    return {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
      bg: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
      dot: "bg-emerald-500",
    };
  }
  if (b.includes("not fixed") || m.includes("not fixed") || b.includes("alert")) {
    return {
      icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />,
      bg: "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700",
      dot: "bg-rose-500",
    };
  }
  if (b.includes("build") || m.includes("submitted project build") || b.includes("submission")) {
    return {
      icon: <FileArchive className="w-4 h-4 text-indigo-600 shrink-0" />,
      bg: "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700",
      dot: "bg-indigo-500",
    };
  }
  if (b.includes("assigned") || b.includes("pending") || m.includes("pending")) {
    return {
      icon: <Clock className="w-4 h-4 text-amber-600 shrink-0" />,
      bg: "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700",
      dot: "bg-amber-500",
    };
  }
  return {
    icon: <Bug className="w-4 h-4 text-blue-600 shrink-0" />,
    bg: "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700",
    dot: "bg-blue-500",
  };
};

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

const getBadgeType = (type, message = "") => {
  if (
    type === "account_updated" ||
    (message || "").toLowerCase().includes("account update") ||
    (message || "").toLowerCase().includes("by admin")
  ) {
    return "Admin Update";
  }
  if (type === "build_submission" || type === "project_submitted" || (message || "").toLowerCase().includes("submitted project build")) {
    return "developer Submitted";
  }
  if (type === "bug_updated") {
    const m = (message || "").toLowerCase();
    if (m.includes("not fixed")) return "Not Fixed Alert";
    if (m.includes("closed") || m.includes("resolved")) return "developer complete";
    if (m.includes("pending")) return "Bug Pending";
    if (m.includes("in progress")) return "In Progress";
    return "Bug Updated";
  }
  if (type === "bug_created") return "Bug Created";
  return "Developer Update";
};

const matchRecipient = (n, testerId, testerEmail, testerName) => {
  const roleMatch = (n?.recipient_role || "").toLowerCase() === "tester" || !n?.recipient_role;
  if (!roleMatch) return false;

  const cleanTesterName = (testerName || "").split("(")[0].trim().toLowerCase();
  const cleanRecipName = (n.recipient_name || "").split("(")[0].trim().toLowerCase();

  const matchId = Boolean(testerId) && (n.recipient_id || "").toLowerCase().includes(testerId.toLowerCase());
  const matchEmail = Boolean(testerEmail) && (n.recipient_email || "").toLowerCase() === testerEmail.toLowerCase();
  const matchName = Boolean(cleanTesterName) && Boolean(cleanRecipName) && (
    cleanTesterName.includes(cleanRecipName) || cleanRecipName.includes(cleanTesterName)
  );

  return Boolean(matchId || matchEmail || matchName || (!testerId && !testerEmail && !testerName));
};

function Testerdashboard({ tester: propTester, onLogout }) {
  const [testUser, setTestUser] = useState(() => {
    const saved = localStorage.getItem("tester_user");
    return saved ? JSON.parse(saved) : propTester;
  });

  useEffect(() => {
    const syncUser = () => {
      const saved = localStorage.getItem("tester_user");
      if (saved) {
        try {
          setTestUser(JSON.parse(saved));
        } catch (e) {
          console.error("Error parsing tester_user", e);
        }
      }
    };
    syncUser();
    window.addEventListener("user_profile_updated", syncUser);
    return () => window.removeEventListener("user_profile_updated", syncUser);
  }, []);

  const test = testUser || propTester || {};
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isReportFormDirty, setIsReportFormDirty] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  useEffect(() => {
    const handleDirtyChange = (e) => {
      setIsReportFormDirty(!!e.detail?.isDirty);
    };
    window.addEventListener("tester_report_form_dirty", handleDirtyChange);
    return () => window.removeEventListener("tester_report_form_dirty", handleDirtyChange);
  }, []);

  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifDateFilter, setNotifDateFilter] = useState("");
  const dropdownRef = useRef(null);

  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("tester_read_notifications") || "[]",
      );
    } catch (e) {
      console.error("error in testerdashboard", e);
      return [];
    }
  });
  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const testerEmail = test?.company_email || test?.personal_email || test?.email || "";

  useEffect(() => {
    localStorage.setItem(
      "tester_read_notifications",
      JSON.stringify(readNotifIds),
    );
  }, [readNotifIds]);

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

  const isReportPath = (p = "") => {
    const clean = (p || "").toLowerCase();
    return clean.includes("reportfrom") || clean.includes("reportform");
  };

  useEffect(() => {
    const handlePopState = () => {
      const targetPath = window.location.pathname;
      const isCurrentlyOnReportForm = isReportPath(currentPath);
      const isTargetingReportForm = isReportPath(targetPath);

      if (isCurrentlyOnReportForm && isReportFormDirty && !isTargetingReportForm) {
        window.history.pushState({}, "", currentPath);
        setPendingPath(targetPath);
        setShowUnsavedModal(true);
        return;
      }
      setCurrentPath(targetPath);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentPath, isReportFormDirty]);

  const navigate = (path) => {
    const isCurrentlyOnReportForm = isReportPath(currentPath);
    const isTargetingReportForm = isReportPath(path);

    if (isCurrentlyOnReportForm && isReportFormDirty && !isTargetingReportForm) {
      setPendingPath(path);
      setShowUnsavedModal(true);
      return;
    }
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    setSidebarOpen(false);
  };

  const handleConfirmLeave = () => {
    window.dispatchEvent(new CustomEvent("clear_tester_report_form_draft"));
    setIsReportFormDirty(false);
    setShowUnsavedModal(false);
    if (pendingPath) {
      window.history.pushState({}, "", pendingPath);
      setCurrentPath(pendingPath);
      setPendingPath(null);
      setSidebarOpen(false);
    }
  };

  const getTesterCredentials = () => {
    try {
      const tUser = JSON.parse(localStorage.getItem("tester_user") || "{}");
      const name =
        tUser?.name || localStorage.getItem("test_name") || "Kamatchi";
      const id =
        tUser?.employee_id ||
        (tUser?.id ? `TS${String(tUser.id).padStart(3, "0")}` : "TS001");
      return { name, id, email: tUser?.company_email || "" };
    } catch {
      console.error("error in testerdashboard");
      return { name: "Kamatchi", id: "TS001", email: "" };
    }
  };

  const fetchAPIData = async () => {
    const credentials = getTesterCredentials();
    const [resNotifs, resSubs] = await Promise.all([
      authFetch(
        `${API_BASE}/api/bugs/notifications/?recipient_id=${credentials.id}&role=Tester&email=${encodeURIComponent(credentials.email)}`
      ),
      authFetch(`${API_BASE}/api/bugs/submissions/`),
    ]);

    let apiNotifs = [];
    if (resNotifs.ok) {
      const data = await resNotifs.json();
      const rawList = Array.isArray(data) ? data : data.results || [];
      apiNotifs = rawList
        .filter((n) => matchRecipient(n, credentials.id, credentials.email, credentials.name))
        .map((n) => ({
          id: String(n.id),
          numericId: n.id,
          message: n.message,
          projectName: n.project_name || n.bug_report?.module || "General",
          rawTimestamp: n.created_at || new Date().toISOString(),
          timestamp: formatTimestamp(n.created_at),
          read: n.is_read || false,
          badge: getBadgeType(n.notification_type, n.message),
          type: n.notification_type || "bug_updated",
          bugReportId: n.bug_report?.id || n.bug_report,
        }));
    }

    let apiSubmissions = [];
    if (resSubs.ok) {
      const subJson = await resSubs.json();
      apiSubmissions = Array.isArray(subJson) ? subJson : subJson.results || [];
    }

    const subNotifs = apiSubmissions.map((s) => {
      const rawDev = (s.developerName || s.developer_name || "").split("(")[0].trim();
      const devId = s.developer_id || s.developerId || "DEV001";
      const devLabel = rawDev ? `${rawDev} (${devId})` : devId;
      const isAccepted = s.status === "Accepted" || s.status === "Testing" || Boolean(s.claimed_by || s.claimedBy);

      return {
        id: `SUB-${s.id}`,
        rawSubmissionId: s.id,
        projectName: s.projectName || s.project_name,
        developerName: s.developerName || s.developer_name,
        projectLink: s.projectLink || s.project_link,
        zipFileName: s.zipFileName || s.zip_file_name,
        subject: s.subject || "",
        isAccepted,
        rawTimestamp: s.date_submitted || s.created_at || new Date().toISOString(),
        timestamp: formatTimestamp(s.date_submitted || s.created_at),
        type: "build_submission",
        badge: "developer Submitted",
        message: `${devLabel} submitted project build: "${s.projectName || s.project_name}"`,
      };
    });

    return { apiNotifs, subNotifs };
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
    let subNotifs = [];

    try {
      const result = await fetchAPIData();
      apiNotifs = result.apiNotifs;
      subNotifs = result.subNotifs;
    } catch (e) {
      console.warn("Backend API is offline or unreachable:", e.message);
    }

    const unique = deduplicateNotifications(apiNotifs, subNotifs);
    setNotifications(unique);

    const serverReadIds = apiNotifs.filter((n) => n.read).map((n) => String(n.id));
    if (serverReadIds.length > 0) {
      setReadNotifIds((prev) => {
        const next = Array.from(new Set([...prev.map(String), ...serverReadIds]));
        return next.length !== prev.length ? next : prev;
      });
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 3000);
    window.addEventListener("notifications_updated", loadNotifications);
    window.addEventListener("bugs_updated", loadNotifications);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications_updated", loadNotifications);
      window.removeEventListener("bugs_updated", loadNotifications);
    };
  }, []);

  const handleNotificationClick = (notif) => {
    const notifIdStr = String(notif.id);
    if (!readNotifIds.includes(notifIdStr)) {
      setReadNotifIds((prev) => Array.from(new Set([...prev, notifIdStr])));
    }

    if (notif.numericId || !isNaN(Number(notif.id))) {
      const idToPatch = notif.numericId || notif.id;
      authFetch(`${API_BASE}/api/bugs/notifications/${idToPatch}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      }).catch(() => {});
    }

    const existingPopupDismissed = JSON.parse(localStorage.getItem("tester_dismissed_popups") || "[]");
    if (!existingPopupDismissed.includes(notifIdStr)) {
      localStorage.setItem("tester_dismissed_popups", JSON.stringify([...existingPopupDismissed, notifIdStr]));
    }
    window.dispatchEvent(new Event("notifications_updated"));

    setShowNotifDropdown(false);

    const projName = notif.projectName || notif.project_name || "General";
    if (projName) {
      localStorage.setItem("selected_project_name", projName.toUpperCase());
    }

    const isBuild = notif.type === "build_submission" || (notif.type || "").includes("project") || (notif.type || "").includes("build");
    if (isBuild) {
      if (notif.rawSubmissionId) {
        localStorage.setItem("inbox_active_build_id", notif.rawSubmissionId);
      }
      navigate("/tester/inbox");
    } else {
      navigate("/tester/bugreport");
    }
  };

  const handleMarkAllRead = () => {
    const allIds = visibleNotifications.map((n) => String(n.id)).filter(Boolean);
    setReadNotifIds((prev) => Array.from(new Set([...prev.map(String), ...allIds])));

    const existingPopupDismissed = JSON.parse(localStorage.getItem("tester_dismissed_popups") || "[]");
    const updatedPopupDismissed = Array.from(new Set([...existingPopupDismissed.map(String), ...allIds]));
    localStorage.setItem("tester_dismissed_popups", JSON.stringify(updatedPopupDismissed));

    setNotifications((prev) =>
      prev.map((n) => (allIds.includes(String(n.id)) ? { ...n, read: true } : n))
    );

    visibleNotifications.forEach((n) => {
      const numericId = n.numericId || (!isNaN(Number(n.id)) ? Number(n.id) : null);
      if (numericId) {
        authFetch(`${API_BASE}/api/bugs/notifications/${numericId}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_read: true }),
        }).catch(() => {});
      }
    });

    window.dispatchEvent(new Event("notifications_updated"));
  };

  const renderPage = () => {
    switch (currentPath) {
      case "/tester/dashboard":
        return <Dashboard onNavigate={navigate} />;
      case "/tester/reportfrom":
        return <Reportfrom tester={test} onNavigate={navigate} />;
      case "/tester/bugreport":
        return <Mybugreport onNavigate={navigate} />;
      case "/tester/profile":
        return <Profile tester={test} />;
      case "/tester/inbox":
        return <InboxDashboard onNavigate={navigate} />;
      case "/tester/historyreport":
        return <HistoryReport onNavigate={navigate} />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  const matchesNotifDate = (n) => {
    if (!notifDateFilter) return true;
    const rawDate = n.created_at || n.date_submitted || n.rawTimestamp || n.timestamp || n.date;
    if (!rawDate) return false;
    const d = new Date(rawDate);
    if (!Number.isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}` === notifDateFilter;
    }
    return false;
  };

  const visibleNotifications = notifications.filter(matchesNotifDate);
  const isNew = (n) => {
    if (n.read) return false;
    return !readNotifIds.includes(String(n.id));
  };
  const newNotifications = visibleNotifications.filter(isNew);
  const unread = newNotifications.length;

  return (
    <div>
      <NotificationPopupAlerts
        role="tester"
        user={test}
        onNotificationClick={(notif) => {
          const isBuild = (notif.notification_type || "").includes("project") || (notif.notification_type || "").includes("build") || (notif.message || "").toLowerCase().includes("submitted project build");
          if (isBuild) {
            navigate("/tester/inbox");
          } else {
            navigate("/tester/bugreport");
          }
        }}
      />
      <div className="flex h-screen bg-gray-50 text-gray-800 font-sans antialiased overflow-hidden">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          currentPath={currentPath}
          onNavigate={navigate}
          onLogout={onLogout}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="bg-white border-b border-gray-200 h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 shadow-sm">
            {/* Left: hamburger + portal label */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex-shrink-0 p-2 rounded-lg md:hidden text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                aria-label="Open sidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Tester Portal
              </span>
            </div>

            {/* Right: theme + date + user */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              <ThemeSelector currentRole="tester" user={test} />
              {/* Date pill — hidden on mobile */}
              <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200">
                <Calendar size={14} className="text-slate-500 flex-shrink-0" />
                <span className="font-medium text-xs whitespace-nowrap">{todayStr}</span>
              </div>
              <div className="relative" ref={dropdownRef}>
                <UserHeaderPanel
                  user={{ ...test, role: test?.role || "Tester" }}
                  notificationCount={unread}
                  onBellClick={() => setShowNotifDropdown((prev) => !prev)}
                  onLogout={onLogout}
                  onProfileClick={() => setShowProfileModal(true)}
                  subtitle={testerEmail}
                />

                {showProfileModal && (
                  <ProfileModal
                    user={test}
                    role="tester"
                    onClose={() => setShowProfileModal(false)}
                    onUpdateUser={(updated) => {
                      const updatedUser = { ...test, ...updated };
                      setTestUser(updatedUser);
                      localStorage.setItem("tester_user", JSON.stringify(updatedUser));
                      saveStoredAvatar(updatedUser, updated.avatarUrl !== undefined ? updated.avatarUrl : getStoredAvatar(updatedUser));
                      window.dispatchEvent(new Event("user_profile_updated"));
                    }}
                  />
                )}

                <UnsavedBugWarningModal
                  isOpen={showUnsavedModal}
                  onClose={() => setShowUnsavedModal(false)}
                  onConfirmLeave={handleConfirmLeave}
                />

                {showNotifDropdown && (
                  <div className="fixed sm:absolute top-14 sm:top-full right-2 sm:right-0 mt-2 w-[min(380px,calc(100vw-1rem))] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/90 dark:border-slate-800 z-50 overflow-hidden text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
                    {/* Header */}
                    <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 dark:from-slate-800 dark:to-slate-800/80 border-b border-blue-100 dark:border-slate-700/80 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
                          <Bell size={13} />
                        </div>
                        <span className="font-extrabold text-xs text-blue-950 dark:text-blue-200 uppercase tracking-wider">
                          Notifications
                        </span>
                        {unread > 0 && (
                          <span className="text-[10px] font-black text-white bg-rose-600 px-2 py-0.5 rounded-full shadow-2xs animate-pulse">
                            {unread} NEW
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={notifDateFilter}
                          onChange={(e) => setNotifDateFilter(e.target.value)}
                          className="px-2 py-0.5 text-[10px] font-semibold border border-blue-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                          title="Filter notifications by date"
                        />
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="inline-flex items-center gap-1 text-[10px] text-blue-700 dark:text-blue-300 hover:text-blue-900 font-bold bg-white/80 dark:bg-slate-800 px-2 py-1 rounded-lg border border-blue-200 dark:border-slate-700 shadow-2xs transition-all cursor-pointer"
                          title="Mark all as read"
                        >
                          <CheckCheck size={11} /> Read All
                        </button>
                      </div>
                    </div>

                    {/* Body List */}
                    <div className="max-h-84 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800/80 text-xs">
                      {visibleNotifications.length > 0 ? (
                        visibleNotifications.map((n) => {
                          const isUnread = isNew(n);
                          const { icon, bg, dot } = renderNotifBadgeIcon(n.badge, n.message);

                          return (
                            <div
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 relative group ${isUnread
                                ? "bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-50/80"
                                : "hover:bg-slate-50/90 dark:hover:bg-slate-800/50 opacity-90 hover:opacity-100"
                                }`}
                            >
                              {/* Unread indicator dot */}
                              {isUnread && (
                                <span className={`absolute top-4 right-3.5 h-2 w-2 rounded-full ${dot} shadow-xs ring-2 ring-white dark:ring-slate-900 animate-pulse`} />
                              )}

                              {/* Icon Chip */}
                              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5 shadow-2xs">
                                {icon}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0 pr-3">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shadow-2xs ${bg}`}>
                                    {n.badge || "Tester Update"}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium ml-auto">
                                    {n.timestamp || "Just now"}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words overflow-wrap-break-word">
                                  {truncateText(formatNotificationMessage(n.message, n.projectName || n.project_name || "General"), 20)}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center text-slate-400 dark:text-slate-500 italic text-xs space-y-2">
                          <Inbox className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                          <p>No notifications found.</p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-800 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNotifDropdown(false);
                          navigate("/tester/bugreport");
                        }}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>View all bug reports</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-6 overflow-x-hidden overflow-y-auto min-w-0">
            <div className="max-w-7xl mx-auto w-full">{renderPage()}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default Testerdashboard;