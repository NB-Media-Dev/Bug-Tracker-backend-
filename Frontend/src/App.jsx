
import React, { useState, useEffect } from "react";
import Sidebar from "./Pages/Sidebar";
import Dasboard from "./Pages/Dasboard";
import Monitor from "./Pages/Monitor";
import UserMangerment from "./Pages/UserMangerment";
import Login from "./Pages/Login";
import DeveloperDashboard from "./Pages/DeveloperDashboard";
import TesterDashboard from "./Pages/TesterDashboard";
import ThemeSelector from "./components/ThemeSelector";
import UserHeaderPanel from "./components/UserHeaderPanel";
import ProfileModal from "./components/ProfileModal";
import MandatoryChangePassword from "./Pages/MandatoryChangePassword";
import NotificationPopupAlerts from "./components/NotificationPopupAlerts";
import LogoutConfirmationModal from "./components/LogoutConfirmationModal";

import { clearDumpStorage } from "./lib/clearDumpStorage";
import { getSavedTheme, applyTheme } from "./lib/theme";
import { API_BASE, authFetch } from "./lib/api";
import { formatNotificationMessage, truncateText } from "./lib/utils";
import { getStoredAuth, clearAuthStorage, getRequirePasswordChange } from "./lib/auth";
import { Calendar, ShieldCheck, CheckCheck, Activity, Building2, AlertTriangle, Clock, Inbox, FileArchive, CheckCircle2, Bell, ArrowRight } from "lucide-react";

const renderCtoBadgeIcon = (message = "", type = "") => {
  const m = (message || "").toLowerCase();

  if (m.includes("closed all bugs") || m.includes("closed the project") || type === "project_closed" || m.includes("project is closed")) {
    return {
      badge: "PROJECT CLOSED",
      icon: <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />,
      bg: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 animate-pulse font-extrabold shadow-xs",
      dot: "bg-emerald-500 animate-ping",
    };
  }
  if (m.includes("accepted") || type === "project_accepted") {
    return {
      badge: "PROJECT ACCEPTED",
      icon: <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />,
      bg: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700",
      dot: "bg-emerald-500",
    };
  }
  if (m.includes("fully completed")) {
    return {
      badge: "COMPLETED",
      icon: <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />,
      bg: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700",
      dot: "bg-emerald-500",
    };
  }
  if (m.includes("submitted") || type === "project_submitted") {
    return {
      badge: "PROJECT BUILD",
      icon: <FileArchive size={14} className="text-indigo-600 shrink-0" />,
      bg: "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700",
      dot: "bg-indigo-500",
    };
  }
  if (m.includes("not fixed") || type === "not_fixed_alert") {
    return {
      badge: "NOT FIXED ALERT",
      icon: <AlertCircle size={14} className="text-rose-600 shrink-0 animate-pulse" />,
      bg: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700",
      dot: "bg-rose-500",
    };
  }
  if (m.includes("resolved") || type === "bug_resolved_alert") {
    return {
      badge: "BUG RESOLVED",
      icon: <CheckCircle2 size={14} className="text-blue-600 shrink-0" />,
      bg: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700",
      dot: "bg-blue-500",
    };
  }
  if (m.includes("progress")) {
    return {
      badge: "PROGRESS UPDATE",
      icon: <Activity size={14} className="text-blue-600 shrink-0" />,
      bg: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700",
      dot: "bg-blue-500",
    };
  }
  return {
    badge: "SYSTEM",
    icon: <Building2 size={14} className="text-slate-600 shrink-0" />,
    bg: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    dot: "bg-slate-500",
  };
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const stored = getStoredAuth();

  const [authRole, setAuthRole] = useState(stored.role);
  const [authUser, setAuthUser] = useState(stored.user);

  const [adminNotifications, setAdminNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifDateFilter, setNotifDateFilter] = useState("");

  const [readCtoNotifIds, setReadCtoNotifIds] = useState(() => {
    try {
      const isCto = (authUser?.role || authRole || localStorage.getItem("admin_portal_role") || "").toString().toLowerCase() === "cto";
      const key = isCto ? "cto_read_notifications" : "admin_read_notifications";
      return JSON.parse(localStorage.getItem(key) || "[]").map(String);
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    const isCto = (authUser?.role || authRole || localStorage.getItem("admin_portal_role") || "").toString().toLowerCase() === "cto";
    const key = isCto ? "cto_read_notifications" : "admin_read_notifications";
    localStorage.setItem(key, JSON.stringify(readCtoNotifIds));
  }, [readCtoNotifIds, authRole, authUser]);

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const loadAdminNotifications = async () => {
    try {
      const currentRole = (authUser?.role || authRole || localStorage.getItem("admin_portal_role") || "").toString().toLowerCase();
      const isCtoRole = currentRole === "cto";

      const url = isCtoRole
        ? `${API_BASE}/api/bugs/notifications/?role=CTO`
        : `${API_BASE}/api/bugs/notifications/?role=Admin`;

      const [notifsRes, bugsRes] = await Promise.all([
        authFetch(url),
        authFetch(`${API_BASE}/api/bugs/`)
      ]);
      const data = notifsRes.ok ? await notifsRes.json() : [];
      const bugsData = bugsRes.ok ? await bugsRes.json() : [];
      const notifList = Array.isArray(data) ? data : data.results || [];

      let combined = notifList.map(n => {
        const rawTime = n.created_at || n.timestamp || new Date().toISOString();
        const formattedMsg = formatNotificationMessage(n.message, n.project_name || "General", bugsData);
        return {
          id: String(n.id),
          message: formattedMsg,
          project_name: n.project_name,
          rawTimestamp: rawTime,
          timestamp: rawTime
            ? new Date(rawTime).toLocaleDateString("en-US", { day: "numeric", month: "short" }) + ", " + new Date(rawTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Just now",
          type: n.notification_type || "project_status"
        };
      });

      if (isCtoRole) {
        combined = combined.filter(n => {
          if (!n.message) return false;
          const msgLower = n.message.toLowerCase();
          if (msgLower.startsWith("your project build") || msgLower.includes("submitted successfully")) {
            return false;
          }
          return (
            n.message.startsWith("Project:") ||
            n.message.startsWith("Project ") ||
            msgLower.includes("closed all bugs") ||
            msgLower.includes("closed the project") ||
            msgLower.includes("submitted project build") ||
            msgLower.includes("sent to tester") ||
            msgLower.includes("accepted project build") ||
            msgLower.includes("accepted by tester") ||
            msgLower.includes("progress is") ||
            msgLower.includes("not fixed") ||
            msgLower.includes("resolved") ||
            n.type === "not_fixed_alert" ||
            n.type === "bug_resolved_alert" ||
            n.type === "project_closed" ||
            n.type === "project_status_updated" ||
            n.type === "project_submitted" ||
            n.type === "project_accepted"
          );
        });

        if (combined.length === 0) {
          try {
            const subsRes = await authFetch(`${API_BASE}/api/bugs/submissions/`);
            if (subsRes.ok) {
              const subsData = await subsRes.json();
              const subList = Array.isArray(subsData) ? subsData : [];
              combined = subList
                .filter(s => !s.id.startsWith("FIX-"))
                .map((s, idx) => {
                  const projName = (s.project_name || s.project || "General").trim().toUpperCase();
                  const projBugs = bugsData.filter(b => (b.module || "").trim().toUpperCase() === projName);
                  const closed = projBugs.filter(b => ['Closed', 'Resolved'].includes((b.status || b.testerStatus || '').toString())).length;
                  const pct = projBugs.length > 0 ? Math.round((closed / projBugs.length) * 100) : 100;
                  const rawTime = s.date_submitted || new Date().toISOString();
                  return {
                    id: `SUB-NOTIF-${s.id || idx}`,
                    message: `${projName} progress is ${pct}%`,
                    project_name: projName,
                    rawTimestamp: rawTime,
                    timestamp: rawTime
                      ? new Date(rawTime).toLocaleDateString("en-US", { day: "numeric", month: "short" })
                      : "Just now",
                    type: "project_status_updated"
                  };
                });
            }
          } catch (err) {
            console.error("Error building fallback CTO notifications", err);
          }
        }
      }

      combined.sort((a, b) => new Date(b.rawTimestamp) - new Date(a.rawTimestamp));

      const seenNotifKeys = new Set();
      const uniqueCombined = [];
      combined.forEach((n) => {
        if (!n.message) return;
        const msgLower = n.message.toLowerCase();
        let normKey = msgLower.trim();

        if (msgLower.includes("progress is") || msgLower.includes("fully completed")) {
          const projKey = (n.project_name || n.message.split(" ")[0] || "general").trim().toLowerCase();
          normKey = `cto_progress_update_${projKey}`;
        }

        if (!seenNotifKeys.has(normKey)) {
          seenNotifKeys.add(normKey);
          uniqueCombined.push(n);
        }
      });

      const storageKey = isCtoRole ? "cto_read_notifications" : "admin_read_notifications";
      const readIds = JSON.parse(localStorage.getItem(storageKey) || "[]").map(String);
      const processedNotifs = uniqueCombined.map((n) => ({
        ...n,
        read: Boolean(n.is_read || readIds.includes(String(n.id))),
      }));
      setAdminNotifications(processedNotifs);
    } catch (e) {
      console.error("Critical error inside loadAdminNotifications:", e);
    }
  };

  useEffect(() => {
    clearDumpStorage();
    loadAdminNotifications();
    const notifInterval = setInterval(loadAdminNotifications, 3000);
    window.addEventListener("notifications_updated", loadAdminNotifications);
    window.addEventListener("bugs_updated", loadAdminNotifications);

    const syncUserProfile = async () => {
      const storedAuth = getStoredAuth();
      if (storedAuth.role && storedAuth.user) {
        try {
          const res = await authFetch(`${API_BASE}/api/users/`);
          if (res.ok) {
            const data = await res.json();
            const results = data.results || (Array.isArray(data) ? data : []);
            const freshUser = results.find(emp => emp.id === storedAuth.user.id || emp.employee_id === storedAuth.user.employee_id || emp.company_email === storedAuth.user.company_email);
            if (freshUser) {
              const mergedUser = {
                ...freshUser,
                ...storedAuth.user,
                name: storedAuth.user.name || freshUser.name,
                jobTitle: storedAuth.user.jobTitle || storedAuth.user.role || freshUser.role,
              };
              if (storedAuth.role === "developer" || storedAuth.role === "tester") {
                localStorage.setItem(`${storedAuth.role}_user`, JSON.stringify(mergedUser));
              } else if (storedAuth.role === "admin") {
                localStorage.setItem("admin_user", JSON.stringify(mergedUser));
              }
              setAuthUser(mergedUser);
            }
          }
        } catch (e) {
          console.error("Error syncing user profile", e);
        }
      }
    };

    syncUserProfile();
    window.addEventListener("user_profile_updated", syncUserProfile);

    return () => {
      clearInterval(notifInterval);
      window.removeEventListener("notifications_updated", loadAdminNotifications);
      window.removeEventListener("bugs_updated", loadAdminNotifications);
      window.removeEventListener("user_profile_updated", syncUserProfile);
    };
  }, []);

  useEffect(() => {
    if (authRole) {
      const activeTheme = getSavedTheme(authUser, authRole);
      applyTheme(activeTheme);
    }
  }, [authRole, authUser]);

  useEffect(() => {
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  useEffect(() => {
    const handleUnauthorized = (event) => {
      if (event.detail === 401) handleLogout();
    };
    window.addEventListener("app:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("app:unauthorized", handleUnauthorized);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    setSidebarOpen(false);
  };

  const handleLoginSuccess = (user, type) => {
    setAuthRole(type);
    setAuthUser(user);
    navigate("/");
  };

  const handleLogout = async () => {
    try {
      if (authRole === "admin") {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          const accessToken = localStorage.getItem("access_token");
          await fetch(`${API_BASE}/api/auth/logout/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify({ refresh: refreshToken }),
          });
        }
      } else if (authUser?.company_email) {
        await fetch(`${API_BASE}/api/users/logout/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: authUser.company_email }),
        });
      }
    } catch (e) {
      console.error("Error calling backend logout", e);
    } finally {
      clearAuthStorage();
      setAuthRole(null);
      setAuthUser(null);
      navigate("/");
    }
  };

  const currentRoleStr = (authUser?.role || authRole || localStorage.getItem("admin_portal_role") || "admin").toString().toLowerCase();
  const isCTO = currentRoleStr === "cto";

  const triggerLogoutModal = () => setShowLogoutModal(true);

  const renderPage = () => {
    if (!isCTO) {
      // Admin role only gets User Management page (with Add User and Actions enabled)
      return <UserMangerment isReadOnly={false} userRole="admin" />;
    }
    // CTO role gets Dashboard, Monitor, and User Management (Read-Only)
    switch (currentPath) {
      case "/":
        return <Dasboard onNavigate={navigate} onLogout={triggerLogoutModal} />;
      case "/monitor":
        return <Monitor />;
      case "/user-management":
        return <UserMangerment isReadOnly={true} userRole="cto" />;
      default:
        return <Dasboard onNavigate={navigate} />;
    }
  };

  if (!authRole || !authUser) {
    return (
      <Login
        onLoginSuccess={(user) => handleLoginSuccess(user, "admin")}
        onDeveloperLoginSuccess={(employee, type) => {
          const resolvedType = type || (localStorage.getItem("tester_user") ? "tester" : "developer");
          handleLoginSuccess(employee, resolvedType);
        }}
      />
    );
  }

  if (getRequirePasswordChange() && authUser) {
    return (
      <>
        <MandatoryChangePassword
          user={authUser}
          onPasswordChanged={() => {
            localStorage.removeItem("require_password_change");
            window.location.reload();
          }}
          onLogout={triggerLogoutModal}
        />
        <LogoutConfirmationModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleLogout}
        />
      </>
    );
  }

  if (authRole === "developer") {
    return (
      <>
        <DeveloperDashboard developer={authUser} onLogout={triggerLogoutModal} />
        <LogoutConfirmationModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleLogout}
        />
      </>
    );
  }

  if (authRole === "tester") {
    return (
      <>
        <TesterDashboard tester={authUser} onLogout={triggerLogoutModal} />
        <LogoutConfirmationModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleLogout}
        />
      </>
    );
  }

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

  const filteredAdminNotifications = adminNotifications.filter(matchesNotifDate);
  const adminEmail = authUser?.company_email || authUser?.personal_email || authUser?.email || "";

  const isCtoNotifUnread = (n) => {
    if (n.read) return false;
    return !readCtoNotifIds.includes(String(n.id));
  };

  const unreadCount = adminNotifications.filter(isCtoNotifUnread).length;

  return (
    <div className="flex h-screen bg-[var(--color-background)] text-[var(--color-foreground)] antialiased overflow-hidden">
      <NotificationPopupAlerts
        role={isCTO ? "cto" : "admin"}
        user={authUser}
        onNotificationClick={(notif) => {
          if (isCTO) {
            navigate("/monitor");
          }
        }}
      />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        currentPath={currentPath}
        onNavigate={navigate}
        onLogout={triggerLogoutModal}
        user={authUser}
        userRole={isCTO ? "cto" : "admin"}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen transition-all duration-300 overflow-hidden">
        <header className="flex items-center justify-between px-3 sm:px-6 h-14 sm:h-16 border-b bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              className="flex-shrink-0 p-2 rounded-lg md:hidden text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              {isCTO ? "CTO PORTAL" : "ADMIN PORTAL"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 relative flex-shrink-0">
            <ThemeSelector currentRole="admin" user={authUser} />

            <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200">
              <Calendar size={14} className="text-slate-500 flex-shrink-0" />
              <span className="font-medium text-xs whitespace-nowrap">{todayStr}</span>
            </div>

            <UserHeaderPanel
              role={isCTO ? "cto" : "admin"}
              user={{
                ...authUser,
                name: authUser?.username || authUser?.name || (isCTO ? "CTO User" : "Admin User"),
                role: isCTO ? "CTO" : (authUser?.role || "Admin"),
              }}
              notificationCount={unreadCount}
              onBellClick={() => isCTO && setShowNotifDropdown(!showNotifDropdown)}
              onLogout={triggerLogoutModal}
              onProfileClick={() => setShowProfileModal(true)}
              subtitle={adminEmail}
            />

            {showProfileModal && (
              <ProfileModal
                user={authUser}
                role="admin"
                onClose={() => setShowProfileModal(false)}
                onUpdateUser={(updated) => {
                  setAuthUser((prev) => ({ ...prev, ...updated }));
                  localStorage.setItem("admin_user", JSON.stringify({ ...authUser, ...updated }));
                }}
              />
            )}

            {isCTO && showNotifDropdown && (
              <div className="fixed sm:absolute top-14 sm:top-full right-2 sm:right-0 mt-2 w-[min(380px,calc(100vw-1rem))] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/90 dark:border-slate-800 z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 dark:from-slate-800 dark:to-slate-800/80 border-b border-blue-100 dark:border-slate-700/80 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
                      <Bell size={13} />
                    </div>
                    <span className="font-extrabold text-xs text-blue-950 dark:text-blue-200 uppercase tracking-wider">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-black text-white bg-rose-600 px-2 py-0.5 rounded-full shadow-2xs animate-pulse">
                        {unreadCount} NEW
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <input
                        type="date"
                        value={notifDateFilter}
                        onChange={(e) => setNotifDateFilter(e.target.value)}
                        className="px-2 py-0.5 text-[10px] font-semibold border border-blue-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                        title="Filter notifications by date"
                      />
                      {notifDateFilter && (
                        <button
                          type="button"
                          onClick={() => setNotifDateFilter("")}
                          className="ml-1 text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                          title="Reset date filter"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const targetNotifs = filteredAdminNotifications.length > 0 ? filteredAdminNotifications : adminNotifications;
                        const allIds = targetNotifs.map((n) => String(n.id)).filter(Boolean);

                        setReadCtoNotifIds((prev) => Array.from(new Set([...prev.map(String), ...allIds])));

                        const storageKey = isCTO ? "cto_read_notifications" : "admin_read_notifications";
                        const existingCleared = JSON.parse(localStorage.getItem(storageKey) || "[]").map(String);
                        const updatedCleared = Array.from(new Set([...existingCleared, ...allIds]));
                        localStorage.setItem(storageKey, JSON.stringify(updatedCleared));

                        const popupDismissKey = isCTO ? "cto_dismissed_popups" : "admin_dismissed_popups";
                        const existingPopupDismissed = JSON.parse(localStorage.getItem(popupDismissKey) || "[]").map(String);
                        const updatedPopupDismissed = Array.from(new Set([...existingPopupDismissed.map(String), ...allIds]));
                        localStorage.setItem(popupDismissKey, JSON.stringify(updatedPopupDismissed));

                        setAdminNotifications((prev) =>
                          prev.map((n) => (allIds.includes(String(n.id)) ? { ...n, read: true } : n))
                        );

                        allIds.forEach((id) => {
                          const numericId = !isNaN(Number(id)) ? Number(id) : null;
                          if (numericId) {
                            authFetch(`${API_BASE}/api/bugs/notifications/${numericId}/`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ is_read: true }),
                            }).catch(() => {});
                          }
                        });

                        setNotifDateFilter("");
                        window.dispatchEvent(new Event("notifications_updated"));
                      }}
                      className="inline-flex items-center gap-1 text-[10px] text-blue-700 dark:text-blue-300 hover:text-blue-900 font-bold bg-white/80 dark:bg-slate-800 px-2 py-1 rounded-lg border border-blue-200 dark:border-slate-700 shadow-2xs transition-all cursor-pointer"
                      title="Mark all as read"
                    >
                      <CheckCheck size={11} /> Read All
                    </button>
                  </div>
                </div>

                {/* Body List */}
                <div className="max-h-84 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800/80 text-xs">
                  {filteredAdminNotifications.length > 0 ? (
                    filteredAdminNotifications.map((n) => {
                      const isUnread = isCtoNotifUnread(n);
                      const { badge, icon, bg, dot } = renderCtoBadgeIcon(n.message, n.type);

                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            const notifIdStr = String(n.id);
                            if (!readCtoNotifIds.includes(notifIdStr)) {
                              setReadCtoNotifIds((prev) => Array.from(new Set([...prev.map(String), notifIdStr])));
                            }

                            setAdminNotifications((prev) =>
                              prev.map((item) => (String(item.id) === notifIdStr ? { ...item, read: true } : item))
                            );

                            const storageKey = isCTO ? "cto_read_notifications" : "admin_read_notifications";
                            const existingCleared = JSON.parse(localStorage.getItem(storageKey) || "[]").map(String);
                            if (!existingCleared.includes(notifIdStr)) {
                              localStorage.setItem(storageKey, JSON.stringify([...existingCleared, notifIdStr]));
                            }

                            const popupDismissKey = isCTO ? "cto_dismissed_popups" : "admin_dismissed_popups";
                            const existingPopupDismissed = JSON.parse(localStorage.getItem(popupDismissKey) || "[]").map(String);
                            if (!existingPopupDismissed.includes(notifIdStr)) {
                              localStorage.setItem(popupDismissKey, JSON.stringify([...existingPopupDismissed, notifIdStr]));
                            }

                            const numericId = !isNaN(Number(n.id)) ? Number(n.id) : null;
                            if (numericId) {
                              authFetch(`${API_BASE}/api/bugs/notifications/${numericId}/`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ is_read: true }),
                              }).catch(() => {});
                            }

                            setShowNotifDropdown(false);
                            if (n.project_name || n.projectName) {
                              localStorage.setItem("project_filter", (n.project_name || n.projectName).trim().toUpperCase());
                            }
                            navigate("/monitor");
                            window.dispatchEvent(new Event("notifications_updated"));
                          }}
                          className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 relative group ${isUnread
                            ? "bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-50/80"
                            : "hover:bg-slate-50/90 dark:hover:bg-slate-800/50 opacity-90 hover:opacity-100"
                            }`}
                        >
                          {/* Unread indicator dot */}
                          {isUnread && (
                            <span className={`absolute top-4 right-3.5 h-2 w-2 rounded-full ${dot} shadow-xs ring-2 ring-white dark:ring-slate-900 animate-pulse`} />
                          )}

                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5 shadow-2xs">
                            {icon}
                          </div>

                          <div className="flex-1 min-w-0 pr-3">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shadow-2xs ${bg}`}>
                                {badge}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium ml-auto font-mono">
                                {n.timestamp || "Just now"}
                              </span>
                            </div>

                            <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words overflow-wrap-break-word">
                              {truncateText(formatNotificationMessage(n.message, n.project_name || "General"), 20)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center space-y-1">
                      <Inbox size={22} className="text-gray-400 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {notifDateFilter ? "No notifications for this date" : "No Notifications"}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {notifDateFilter ? (
                          <button
                            type="button"
                            onClick={() => setNotifDateFilter("")}
                            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                          >
                            Clear date filter
                          </button>
                        ) : (
                          "All notifications are caught up."
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifDropdown(false);
                      navigate("/monitor");
                    }}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all project submissions</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="p-3 sm:p-6 flex-1 min-h-0 overflow-x-hidden overflow-y-auto bg-[oklch(0.98_0.005_30)] dark:bg-[oklch(0.12_0.005_30)] min-w-0">
          {renderPage()}
        </main>
      </div>

      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}

export default App;