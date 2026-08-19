
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

import { clearDumpStorage } from "./lib/clearDumpStorage";
import { getSavedTheme, applyTheme } from "./lib/theme";
import { API_BASE, authFetch } from "./lib/api";
import { formatNotificationMessage } from "./lib/utils";
import { getStoredAuth, clearAuthStorage, getRequirePasswordChange } from "./lib/auth";
import { Calendar, ShieldCheck, CheckCheck, Activity, Building2, AlertTriangle, Clock, Inbox } from "lucide-react";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const stored = getStoredAuth();

  const [authRole, setAuthRole] = useState(stored.role);
  const [authUser, setAuthUser] = useState(stored.user);

  const [adminNotifications, setAdminNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifDateFilter, setNotifDateFilter] = useState("");

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
        combined = combined.filter(n =>
          n.message && (
            n.message.startsWith("Project:") ||
            n.message.startsWith("Project ") ||
            n.message.toLowerCase().includes("progress is") ||
            n.type === "project_status_updated"
          )
        );

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

      const storageKey = isCtoRole ? "cto_read_notifications" : "admin_read_notifications";
      const clearedIds = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const activeNotifs = combined.filter(n => !clearedIds.includes(String(n.id)));
      setAdminNotifications(activeNotifs);
    } catch (e) {
      console.error("Critical error inside loadAdminNotifications:", e);
    }
  };

  useEffect(() => {
    clearDumpStorage();
    loadAdminNotifications();
    window.addEventListener("notifications_updated", loadAdminNotifications);

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
      window.removeEventListener("notifications_updated", loadAdminNotifications);
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

  const renderPage = () => {
    if (!isCTO) {
      // Admin role only gets User Management page (with Add User and Actions enabled)
      return <UserMangerment isReadOnly={false} userRole="admin" />;
    }
    // CTO role gets Dashboard, Monitor, and User Management (Read-Only)
    switch (currentPath) {
      case "/":
        return <Dasboard onNavigate={navigate} onLogout={handleLogout} />;
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
      <MandatoryChangePassword
        user={authUser}
        onPasswordChanged={() => {
          localStorage.removeItem("require_password_change");
          window.location.reload();
        }}
        onLogout={handleLogout}
      />
    );
  }

  if (authRole === "developer") {
    return <DeveloperDashboard developer={authUser} onLogout={handleLogout} />;
  }

  if (authRole === "tester") {
    return <TesterDashboard tester={authUser} onLogout={handleLogout} />;
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

  return (
    <div className="flex h-screen bg-[var(--color-background)] text-[var(--color-foreground)] antialiased overflow-hidden">
      {isCTO && <NotificationPopupAlerts role="cto" user={authUser} />}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        currentPath={currentPath}
        onNavigate={navigate}
        onLogout={handleLogout}
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
              notificationCount={adminNotifications.length}
              onBellClick={() => isCTO && setShowNotifDropdown(!showNotifDropdown)}
              onLogout={handleLogout}
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
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-800 z-50 overflow-hidden text-left">
                <div className="p-3 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      <Clock size={14} className="text-blue-600" />
                       Notifications
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <input
                        type="date"
                        value={notifDateFilter}
                        onChange={(e) => setNotifDateFilter(e.target.value)}
                        className="px-2 py-0.5 text-[11px] border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                        const storageKey = isCTO ? "cto_read_notifications" : "admin_read_notifications";
                        const popupDismissKey = isCTO ? "cto_dismissed_popups" : "admin_dismissed_popups";
                        const allIds = adminNotifications.map(n => String(n.id));

                        const existingCleared = JSON.parse(localStorage.getItem(storageKey) || "[]");
                        const updatedCleared = Array.from(new Set([...existingCleared, ...allIds]));
                        localStorage.setItem(storageKey, JSON.stringify(updatedCleared));

                        const existingPopupDismissed = JSON.parse(localStorage.getItem(popupDismissKey) || "[]");
                        const updatedPopupDismissed = Array.from(new Set([...existingPopupDismissed, ...allIds]));
                        localStorage.setItem(popupDismissKey, JSON.stringify(updatedPopupDismissed));

                        allIds.forEach((id) => {
                          authFetch(`${API_BASE}/api/bugs/notifications/${id}/`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ is_read: true }),
                          }).catch(() => {});
                        });

                        setNotifDateFilter("");
                        setAdminNotifications([]);
                        window.dispatchEvent(new Event("notifications_updated"));
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-800 font-semibold cursor-pointer"
                      title="Clear all notifications"
                    >
                      <CheckCheck size={12} /> Clear
                    </button>
                  </div>
                </div>

                {/* Body List */}
                <div className="max-h-84 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                  {filteredAdminNotifications.length > 0 ? (
                    filteredAdminNotifications.map((n) => {
                      const msgLower = (n.message || "").toLowerCase();
                      const isProject = msgLower.includes("project") || msgLower.includes("build") || msgLower.includes("submitted");

                      return (
                        <div
                          key={n.id}
                          className="p-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex items-start gap-3"
                        >
                          <div
                            className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                              isProject
                                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                                : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {isProject ? <Building2 size={15} /> : <Activity size={15} />}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                {isProject ? "PROJECT BUILD" : "SYSTEM"}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {n.timestamp || "Just now"}
                              </span>
                            </div>

                            <p className="font-medium text-gray-800 dark:text-gray-200 leading-snug break-words">
                              {formatNotificationMessage(n.message, n.project_name || "General")}
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
              </div>
            )}
          </div>
        </header>

        <main className="p-3 sm:p-6 flex-1 min-h-0 overflow-x-hidden overflow-y-auto bg-[oklch(0.98_0.005_30)] dark:bg-[oklch(0.12_0.005_30)] min-w-0">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;