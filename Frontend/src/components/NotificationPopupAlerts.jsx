import React, { useState, useEffect } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  Info,
  PackageCheck,
  CheckCircle,
  X,
  ArrowRight,
} from "lucide-react";
import { API_BASE, authFetch } from "../lib/api";
import { formatBugId, formatNotificationMessage, truncateText } from "../lib/utils";

export default function NotificationPopupAlerts({ role, user, onNotificationClick }) {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [unreadQueue, setUnreadQueue] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(`${role}_dismissed_popups`) || "[]"
      );
    } catch (e) {
      return [];
    }
  });

  const roleLower = (role || "").toString().toLowerCase();
  const empId =
    user?.employee_id ||
    (user?.id
      ? `${roleLower === "developer" ? "DEV" : roleLower === "cto" ? "CTO" : "TS"}${String(user.id).padStart(
        3,
        "0"
      )}`
      : roleLower === "developer"
        ? "DEV001"
        : roleLower === "cto"
          ? "Cto001"
          : "TS001");
  const empEmail = user?.company_email || user?.personal_email || user?.email || "";

  const fetchNotifications = async () => {
    try {
      const formattedRole = (role || "").toUpperCase() === "CTO" ? "CTO" : role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
      let url = `/api/bugs/notifications/?role=${formattedRole}`;
      if (formattedRole !== "CTO") {
        if (empEmail) {
          url += `&email=${encodeURIComponent(empEmail)}`;
        }
        if (empId) {
          url += `&recipient_id=${encodeURIComponent(empId)}`;
        }
      }

      const response = await authFetch(url);
      if (!response.ok) return;

      const data = await response.json();
      const notifs = Array.isArray(data) ? data : data.results || [];

      const currentDismissed = JSON.parse(
        localStorage.getItem(`${role}_dismissed_popups`) || "[]"
      ).map(String);

      const unreadAlerts = notifs.filter((n) => {
        const notifId = String(n.id);
        if (currentDismissed.includes(notifId)) return false;
        if (n.is_read) return false;

        const msgLower = (n.message || "").toLowerCase();
        if (roleLower === "cto") {
          if (msgLower.startsWith("your project build") || msgLower.includes("submitted successfully")) {
            return false;
          }
          return true;
        }

        const matchRole =
          (n.recipient_role || n.recipientRole || "").toLowerCase() ===
          roleLower;
        if (!matchRole) return false;

        const targetId = (n.recipient_id || n.recipientId || "").trim().toUpperCase();
        const targetEmail = (n.recipient_email || "").trim().toLowerCase();
        const targetName = (n.recipient_name || "").split("(")[0].trim().toLowerCase();
        const cleanEmpId = (empId || "").trim().toUpperCase();
        const cleanEmpEmail = (empEmail || "").trim().toLowerCase();
        const cleanUserName = (user?.name || "").split("(")[0].trim().toLowerCase();

        if (targetId && cleanEmpId) {
          if (targetId === cleanEmpId || cleanEmpId.includes(targetId) || targetId.includes(cleanEmpId)) {
            return true;
          }
        }

        if (targetEmail && cleanEmpEmail) {
          if (targetEmail === cleanEmpEmail) {
            return true;
          }
        }

        if (targetName && cleanUserName) {
          if (targetName.includes(cleanUserName) || cleanUserName.includes(targetName)) {
            return true;
          }
        }

        if (!targetId && !targetEmail) {
          return true;
        }

        return false;
      });

      const seenKeys = new Set();
      const uniqueAlerts = [];

      unreadAlerts.forEach((n) => {
        const formattedMsg = formatNotificationMessage(n.message, n.project_name || n.module || "General");
        const msgLower = (formattedMsg || n.message || "").trim().toLowerCase();

        let key = msgLower;
        if (msgLower.includes("progress is") || msgLower.includes("fully completed") || msgLower.includes("resolved all bugs") || msgLower.includes("closed the project")) {
          const projKey = (n.project_name || n.module || msgLower.split(" ")[0] || "general").trim().toLowerCase();
          key = `popup_progress_${projKey}`;
        }

        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueAlerts.push(n);
        }
      });

      if (roleLower === "cto") {
        uniqueAlerts.sort((a, b) => {
          const aMsg = (a.message || "").toLowerCase();
          const bMsg = (b.message || "").toLowerCase();
          const aIsProgress = aMsg.includes("progress is") || aMsg.includes("resolved all bugs") || aMsg.includes("fully completed") || aMsg.includes("closed the project");
          const bIsProgress = bMsg.includes("progress is") || bMsg.includes("resolved all bugs") || bMsg.includes("fully completed") || bMsg.includes("closed the project");
          if (aIsProgress && !bIsProgress) return -1;
          if (!aIsProgress && bIsProgress) return 1;
          return 0;
        });
      }

      setUnreadQueue(uniqueAlerts);
      setActiveAlerts(uniqueAlerts.slice(0, 5));
    } catch (e) {
      console.error("Error fetching notifications", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 2500);
    const handleSync = () => fetchNotifications();
    window.addEventListener("notifications_updated", handleSync);
    window.addEventListener("bugs_updated", handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications_updated", handleSync);
      window.removeEventListener("bugs_updated", handleSync);
    };
  }, [role, empId, empEmail]);

  const dismissAlert = (notifId, notifMessage, projName) => {
    const idStr = String(notifId);
    const formattedMsg = formatNotificationMessage(notifMessage, projName || "General");
    const targetMsgLower = (formattedMsg || notifMessage || "").trim().toLowerCase();

    const idsToDismiss = [idStr];
    activeAlerts.forEach((a) => {
      const aMsg = (formatNotificationMessage(a.message, a.project_name || a.module || "General") || a.message || "").trim().toLowerCase();
      if (aMsg === targetMsgLower || String(a.id) === idStr) {
        idsToDismiss.push(String(a.id));
      }
    });

    const currentDismissed = JSON.parse(
      localStorage.getItem(`${role}_dismissed_popups`) || "[]"
    ).map(String);
    const updatedDismissed = Array.from(new Set([...currentDismissed, ...idsToDismiss]));

    setDismissedIds(updatedDismissed);
    localStorage.setItem(
      `${role}_dismissed_popups`,
      JSON.stringify(updatedDismissed)
    );

    // 1. Immediately remove the dismissed card from the vertical stack
    setActiveAlerts((prev) =>
      prev.filter((a) => {
        const aMsg = (formatNotificationMessage(a.message, a.project_name || a.module || "General") || a.message || "").trim().toLowerCase();
        return !idsToDismiss.includes(String(a.id)) && aMsg !== targetMsgLower;
      })
    );

    // 2. Mark as read on backend API
    idsToDismiss.forEach((id) => {
      const numericId = !isNaN(Number(id)) ? Number(id) : null;
      if (numericId) {
        authFetch(`/api/bugs/notifications/${numericId}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_read: true }),
        }).catch(() => { });
      }
    });

    // 3. Bring next waiting notification into the vertical stack if queue has more
    setUnreadQueue((currentQueue) => {
      const remainingQueue = currentQueue.filter(
        (item) => !idsToDismiss.includes(String(item.id))
      );
      setActiveAlerts(remainingQueue.slice(0, 5));
      return remainingQueue;
    });
  };

  if (activeAlerts.length === 0) return null;

  const getAlertStyle = (alert) => {
    const type = (alert.notification_type || alert.notificationType || "").toLowerCase();
    const rawSev = (alert.severity || alert.bug_report?.severity || "").toLowerCase();
    const msg = (alert.message || "").toLowerCase();

    if (type === "project_closed" || msg.includes("closed all bugs") || msg.includes("project is closed")) {
      return {
        title: "Project Closed Alert",
        badgeText: "Project Closed",
        accentBar: "bg-emerald-600",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
        iconContainer: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
        icon: <CheckCircle className="h-4 w-4" />,
        actionButton: "bg-emerald-600 hover:bg-emerald-700 text-white",
      };
    }

    if (type === "project_accepted" || msg.includes("accepted project build") || msg.includes("accepted by tester")) {
      return {
        title: "Project Accepted Alert",
        badgeText: "Build Accepted",
        accentBar: "bg-emerald-600",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
        iconContainer: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
        icon: <CheckCircle className="h-4 w-4" />,
        actionButton: "bg-emerald-600 hover:bg-emerald-700 text-white",
      };
    }

    if (type === "project_submitted" || type === "build_submitted" || msg.includes("submitted project build") || msg.includes("submitted successfully")) {
      return {
        title: "Project Build Alert",
        badgeText: "Developer Submitted",
        accentBar: "bg-indigo-600",
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
        iconContainer: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
        icon: <PackageCheck className="h-4 w-4" />,
        actionButton: "bg-indigo-600 hover:bg-indigo-700 text-white",
      };
    }

    if (msg.includes("progress is") || type === "project_status_updated") {
      return {
        title: "Project Progress Update",
        badgeText: "Progress Update",
        accentBar: "bg-blue-600",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
        iconContainer: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
        icon: <Info className="h-4 w-4" />,
        actionButton: "bg-blue-600 hover:bg-blue-700 text-white",
      };
    }

    if (type === "bug_created" || type === "bug_assigned" || msg.includes("new bug")) {
      return {
        title: "New Bug Report Alert",
        badgeText: rawSev ? rawSev.charAt(0).toUpperCase() + rawSev.slice(1) : "New Bug",
        accentBar: "bg-rose-600",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
        iconContainer: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
        icon: <AlertCircle className="h-4 w-4" />,
        actionButton: "bg-rose-600 hover:bg-rose-700 text-white",
      };
    }

    if (type === "account_updated" || msg.includes("account profile") || msg.includes("updated your account")) {
      return {
        title: "Account Profile Updated",
        badgeText: "Admin System",
        accentBar: "bg-purple-600",
        badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
        iconContainer: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
        icon: <Info className="h-4 w-4" />,
        actionButton: "bg-purple-600 hover:bg-purple-700 text-white",
      };
    }

    if (type.includes("status") || msg.includes("status updated") || type === "bug_updated") {
      const isClosed = msg.includes("closed") || msg.includes("resolved");
      return {
        title: "Bug Status Updated",
        badgeText: isClosed ? "Status Update" : (rawSev ? rawSev.charAt(0).toUpperCase() + rawSev.slice(1) : "Update"),
        accentBar: isClosed ? "bg-emerald-600" : "bg-blue-600",
        badgeClass: isClosed
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
          : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
        iconContainer: isClosed
          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
          : "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
        icon: isClosed ? <CheckCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />,
        actionButton: isClosed ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white",
      };
    }

    let severity = "medium";
    if (rawSev.includes("critical") || rawSev.includes("blocker") || msg.includes("critical")) {
      severity = "critical";
    } else if (rawSev.includes("high") || msg.includes("high")) {
      severity = "high";
    } else if (rawSev.includes("low") || msg.includes("low")) {
      severity = "low";
    } else if (type === "project_submitted" || type === "build_submitted") {
      severity = "project_submitted";
    }

    switch (severity) {
      case "critical":
        return {
          title: "Critical Bug Alert",
          badgeText: "Critical",
          accentBar: "bg-red-600",
          badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800",
          iconContainer: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
          icon: <AlertOctagon className="h-4 w-4" />,
          actionButton: "bg-red-600 hover:bg-red-700 text-white",
        };
      case "high":
        return {
          title: "High Priority Bug",
          badgeText: "High",
          accentBar: "bg-amber-500",
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
          iconContainer: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
          icon: <AlertTriangle className="h-4 w-4" />,
          actionButton: "bg-amber-600 hover:bg-amber-700 text-white",
        };
      case "low":
        return {
          title: "Low Priority Bug",
          badgeText: "Low",
          accentBar: "bg-slate-400",
          badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
          iconContainer: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
          icon: <Info className="h-4 w-4" />,
          actionButton: "bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600",
        };
      case "project_submitted":
        return {
          title: "Project Submitted",
          badgeText: "Build Ready",
          accentBar: "bg-indigo-600",
          badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
          iconContainer: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
          icon: <PackageCheck className="h-4 w-4" />,
          actionButton: "bg-indigo-600 hover:bg-indigo-700 text-white",
        };
      default:
        return {
          title: "Project Accepted",
          badgeText: "Medium",
          accentBar: "bg-blue-500",
          badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
          iconContainer: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
          icon: <AlertCircle className="h-4 w-4" />,
          actionButton: "bg-blue-600 hover:bg-blue-700 text-white",
        };
    }
  };

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full px-2 sm:px-0 pointer-events-none font-sans max-h-[88vh] overflow-y-auto pr-1">
      {activeAlerts.map((alert) => {
        const config = getAlertStyle(alert);
        const projName = alert.project_name || alert.module || alert.bug_report?.module || "General";
        const isProjectNotif =
          (alert.notification_type || "").includes("project") ||
          (alert.notification_type || "").includes("build") ||
          (alert.message || "").toLowerCase().includes("progress is");

        let bugId = "";
        if (!isProjectNotif) {
          const msgMatch = alert.message ? alert.message.match(/\[([A-Z0-9]+-\d+)\]/i) || alert.message.match(/\b([A-Z0-9]+-\d+)\b/i) : null;
          const rawBugId = msgMatch ? msgMatch[1] : (alert.bug_id || alert.bug_report?.bug_id || alert.bug_report?.id || "");
          if (rawBugId) {
            bugId = formatBugId({
              bugId: rawBugId,
              module: projName,
              id: rawBugId,
            });
          }
        }

        return (
          <div
            key={alert.id}
            className="pointer-events-auto relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-all duration-200 shrink-0"
          >
            {/* Left accent bar */}
            {/* <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${config.accentBar}`} /> */}

            <div className="p-4 pl-5">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`p-1.5 rounded-lg ${config.iconContainer}`}>
                    {config.icon}
                  </div>
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {config.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${config.badgeClass}`}
                  >
                    {config.badgeText}
                  </span>
                  <button
                    onClick={() => dismissAlert(alert.id, alert.message, projName)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Message */}
              <p className="text-xs text-slate-600 dark:text-slate-300 font-normal leading-snug mb-3 break-words break-all">
                {formatNotificationMessage(alert.message, alert.project_name || alert.module || alert.bug_report?.module || "General")}
              </p>

              {/* Footer / Meta */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                {bugId ? (
                  <span className="font-mono font-semibold text-slate-500 dark:text-slate-400">
                    {bugId}
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500">
                    {alert.project_name || "Notification"}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => dismissAlert(alert.id, alert.message, projName)}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium text-xs cursor-pointer px-1.5 py-0.5"
                  >
                    Dismiss
                  </button>
                  {onNotificationClick && (
                    <button
                      onClick={() => {
                        dismissAlert(alert.id, alert.message, projName);
                        onNotificationClick(alert);
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1 ${config.actionButton}`}
                    >
                      View <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
