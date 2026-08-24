
import { useState, useEffect } from "react";
import { FileArchive, Bug, Calendar } from "lucide-react";
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
import { API_BASE } from "../lib/api";

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
  const [oldNotifPage, setOldNotifPage] = useState(1);
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

  const getButtonText = (isBuild, isValidHttpUrl) => {
    if (isBuild) {
      return !isValidHttpUrl ? "Start Testing APK" : "Start Testing";
    }
    return "View Bugs";
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

  const loadNotifications = async () => {
    let apiSubmissions = [];
    let apiNotifs = [];
    const credentials = getTesterCredentials();

    try {
      const [subsRes, notifsRes] = await Promise.all([
        fetch(`${API_BASE}/api/bugs/submissions/`),
        fetch(
          `${API_BASE}/api/bugs/notifications/?recipient_id=${credentials.id}`,
        ),
      ]);
      if (subsRes.ok) apiSubmissions = await subsRes.json();
      if (notifsRes.ok) apiNotifs = await notifsRes.json();
    } catch (e) {
      console.error("Error loading notifications from API", e);
    }

    const subNotifs = apiSubmissions.map((s) => ({
      id: `SUB-${s.id}`,
      projectName: s.projectName || s.project_name,
      developerName: s.developerName || s.developer_name,
      projectLink: s.projectLink || s.project_link,
      zipFileName: s.zipFileName || s.zip_file_name,
      subject: s.subject || "",
      rawTimestamp:
        s.date_submitted || s.created_at || new Date().toISOString(),
      date: s.date_submitted
        ? new Date(s.date_submitted).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        }) +
        ", " +
        new Date(s.date_submitted).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
        : s.date || "Just now",
      type: "build_submission",
      message: `Developer ${s.developerName || s.developer_name} submitted project build: "${s.projectName || s.project_name}"`,
    }));

    const generalNotifs = apiNotifs
      .filter((n) => {
        const roleMatch = (n.recipient_role || "").toLowerCase() === "tester";
        if (!roleMatch) return false;

        const cleanCredName = (credentials.name || "").split("(")[0].trim().toLowerCase();
        const cleanRecipName = (n.recipient_name || "").split("(")[0].trim().toLowerCase();

        const idMatch =
          credentials.id &&
          n.recipient_id &&
          n.recipient_id.trim().toLowerCase() ===
          credentials.id.trim().toLowerCase();
        const emailMatch =
          credentials.email &&
          n.recipient_email &&
          n.recipient_email.trim().toLowerCase() ===
          credentials.email.trim().toLowerCase();
        const nameMatch =
          Boolean(cleanCredName) &&
          Boolean(cleanRecipName) &&
          (cleanCredName.includes(cleanRecipName) || cleanRecipName.includes(cleanCredName));

        return (
          idMatch ||
          emailMatch ||
          nameMatch ||
          (!n.recipient_id && !n.recipient_email)
        );
      })
      .map((n) => {
        let extractedProject = "Bug Update";
        const match = (n.message || "").match(/\b([A-Z0-9]+)-\d+\b/);
        if (match) {
          extractedProject = `${match[1]} Project`;
        }
        return {
          id: `NOTIF-${n.id}`,
          projectName: extractedProject,
          developerName: "Developer",
          projectLink: n.projectLink || n.project_link || "",
          subject: n.subject || "",
          rawTimestamp: n.created_at || new Date().toISOString(),
          date: n.created_at
            ? new Date(n.created_at).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            }) +
            ", " +
            new Date(n.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
            : "Just now",
          type: n.notification_type || "bug_updated",
          message: n.message,
        };
      });

    const allNotifs = [...subNotifs, ...generalNotifs];
    allNotifs.sort(
      (a, b) => new Date(b.rawTimestamp) - new Date(a.rawTimestamp),
    );

    setNotifications(allNotifs);
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

  const acceptBuildSubmission = async (notif, testerName, testerId) => {
    const rawId = notif.id.replace("SUB-", "");
    try {
      const response = await fetch(`${API_BASE}/api/bugs/submissions/${rawId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimedBy: testerName || "tester",
          claimedById: testerId || "TS001",
          status: "Testing",
        }),
      });
      if (response.ok) {
        alert(`Project build "${notif.projectName || notif.project_name}" has been accepted and is now in testing!`);
        loadNotifications();
      } else {
        alert("Failed to accept project build for testing.");
      }
    } catch (err) {
      console.error("Error accepting project build", err);
      alert("Error accepting project build.");
    }
  };

  const handleStartTesting = async (notif) => {
    const credentials = getTesterCredentials();

    if (!readNotifIds.includes(notif.id)) {
      setReadNotifIds((prev) => [...prev, notif.id]);
    }

    if (notif.type === "build_submission") {
      await acceptBuildSubmission(notif, credentials.name, credentials.id);
    } else {
      navigate("/tester/inbox");
    }
    setShowNotifDropdown(false);
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
  const isNew = (n) => !readNotifIds.includes(n.id);
  const newNotifications = visibleNotifications.filter(isNew);
  const oldNotifications = visibleNotifications.filter((n) => !isNew(n));
  const unread = newNotifications.length;

  const oldNotifsPerPage = 3;
  const totalOldPages = Math.max(
    1,
    Math.ceil(oldNotifications.length / oldNotifsPerPage),
  );

  const renderSubmissionPayload = (linkVal, textVal) => {
    const target = linkVal || textVal || "";
    const isUrl =
      target.includes("https://") ||
      target.includes("http://") ||
      target.includes("www.");

    if (isUrl) {
      const href = target.startsWith("www.") ? `https://${target}` : target;
      return <span>{href}</span>;
    }

    return (
      <code className="bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">
        {target || "No link or details"}
      </code>
    );
  };

  return (
    <div>
      <NotificationPopupAlerts
        role="tester"
        user={test}
        onNotificationClick={() => navigate("/tester/inbox")}
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
            <div className="relative flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              <ThemeSelector currentRole="tester" user={test} />
              {/* Date pill — hidden on mobile */}
              <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200">
                <Calendar size={14} className="text-slate-500 flex-shrink-0" />
                <span className="font-medium text-xs whitespace-nowrap">{todayStr}</span>
              </div>
              <UserHeaderPanel
                user={{ ...test, role: test?.role || "Tester" }}
                notificationCount={unread}
                onBellClick={() => setShowNotifDropdown(!showNotifDropdown)}
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
                <div className="fixed sm:absolute top-14 sm:top-full right-2 sm:right-0 mt-2 w-[min(320px,calc(100vw-1rem))] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 z-50 overflow-hidden">
                  <div className="p-3 bg-blue-50 dark:bg-slate-800 border-b border-blue-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-xs text-blue-900 dark:text-blue-200 uppercase tracking-wider">Project Builds</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={notifDateFilter}
                        onChange={(e) => setNotifDateFilter(e.target.value)}
                        className="px-2 py-1 text-[10px] font-medium border border-blue-200 rounded-lg bg-white text-gray-800 focus:outline-none outline-none focus:ring-1 focus:ring-blue-450 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                        title="Filter notifications by date"
                      />
                      <button
                        onClick={() => {
                          const allIds = notifications.map((n) => n.id);
                          setReadNotifIds(allIds);
                        }}
                        className="text-[10px] text-blue-700 dark:text-blue-300 hover:underline font-semibold cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto text-xs divide-y divide-gray-100 dark:divide-slate-800">
                    <div className="bg-blue-50/10 dark:bg-slate-800/10">
                      <div className="px-3 py-1.5 bg-gray-50 dark:bg-slate-800/40 text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                        New Notifications ({newNotifications.length})
                      </div>

                      {newNotifications.length > 0 ? (
                        newNotifications.map((n) => {
                          const isBuild = n.type === "build_submission";
                          const currentLink = n.projectLink || n.project_link || "";
                          const currentSubject = n.subject || "";

                          const isValidHttpUrl =
                            currentLink.trim().toLowerCase().startsWith("http://") ||
                            currentLink.trim().toLowerCase().startsWith("https://");

                          let displayMessageText = currentLink;
                          if (
                            (displayMessageText || "").toString().toLowerCase().includes("submitted for testing") ||
                            currentSubject.includes("[APK MODE]")
                          ) {
                            displayMessageText = "An APK file has been received and is ready for testing.";
                          }

                          return (
                            <div
                              key={n.id}
                              className="p-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors space-y-2 border-b border-gray-100 dark:border-slate-800"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                  {isBuild ? (
                                    <FileArchive size={14} className="text-blue-600 shrink-0" />
                                  ) : (
                                    <Bug size={14} className="text-amber-500 shrink-0" />
                                  )}
                                  {n.projectName || n.project_name}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">{n.date || "Just now"}</span>
                              </div>

                              <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                                {isBuild ? (
                                  <>
                                    Developer <strong>{n.developerName || n.developer_name}</strong> submitted: {isValidHttpUrl ? (
                                      renderSubmissionPayload(currentLink, n.zipFileName || n.zip_file_name)
                                    ) : (
                                      <span className="text-gray-700 dark:text-gray-300 font-medium inline">{displayMessageText}</span>
                                    )}
                                  </>
                                ) : (
                                  n.message
                                )}
                              </p>

                              <div className="pt-1 flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleStartTesting(n)}
                                  className={`px-3 py-1 text-white font-bold text-[11px] rounded-lg shadow-sm transition-all cursor-pointer ${isBuild && !isValidHttpUrl
                                    ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                                    : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                                    }`}
                                >
                                  {getButtonText(isBuild, isValidHttpUrl)}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="p-4 text-center text-gray-400 italic text-xs">No new notifications.</p>
                      )}

                      {oldNotifications.length > oldNotifsPerPage && (
                        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-850 border-t border-gray-100 dark:border-slate-800 text-[10px] text-gray-500">
                          <button
                            disabled={oldNotifPage === 1}
                            onClick={() => setOldNotifPage((prev) => Math.max(1, prev - 1))}
                            className="px-2 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded disabled:opacity-50 hover:bg-gray-50 font-bold"
                          >
                            Prev
                          </button>
                          <span>Page {oldNotifPage} of {totalOldPages}</span>
                          <button
                            disabled={oldNotifPage === totalOldPages}
                            onClick={() => setOldNotifPage((prev) => Math.min(totalOldPages, prev + 1))}
                            className="px-2 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded disabled:opacity-50 hover:bg-gray-50 font-bold"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
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