import React, { useState, useEffect } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  Info,
  PackageCheck,
  X,
  ArrowRight,
} from "lucide-react";
import { API_BASE, authFetch } from "../lib/api";

export default function NotificationPopupAlerts({ role, user, onNotificationClick }) {
  const [activeAlerts, setActiveAlerts] = useState([]);
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
    if (!empId && !empEmail) return;

    try {
      const formattedRole = role.toUpperCase() === "CTO" ? "CTO" : role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
      let url = `${API_BASE}/api/bugs/notifications/?role=${formattedRole}`;
      if (empEmail) {
        url += `&email=${encodeURIComponent(empEmail)}`;
      }
      if (empId) {
        url += `&recipient_id=${encodeURIComponent(empId)}`;
      }

      const response = await authFetch(url);
      if (!response.ok) return;

      const data = await response.json();
      const notifs = Array.isArray(data) ? data : data.results || [];

      const currentDismissed = JSON.parse(
        localStorage.getItem(`${role}_dismissed_popups`) || "[]"
      );

      const unreadAlerts = notifs.filter((n) => {
        const notifId = String(n.id);
        if (currentDismissed.includes(notifId)) return false;
        if (n.is_read) return false;

        const matchRole =
          (n.recipient_role || n.recipientRole || "").toLowerCase() ===
          role.toLowerCase();
        const matchId =
          empId &&
          (n.recipient_id || n.recipientId || "")
            .toUpperCase()
            .includes(empId.toUpperCase());
        const matchEmail =
          empEmail &&
          (n.recipient_email || "").toLowerCase() === empEmail.toLowerCase();

        if (roleLower === "cto") {
          return matchRole || matchEmail || matchId;
        }
        return matchEmail || matchId || (matchRole && !n.recipient_id);
      });

      setActiveAlerts(unreadAlerts.slice(0, 3));
    } catch (e) {
      console.error("Error fetching notifications", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    const handleSync = () => fetchNotifications();
    window.addEventListener("notifications_updated", handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications_updated", handleSync);
    };
  }, [role, empId, empEmail]);

  const dismissAlert = (notifId) => {
    const idStr = String(notifId);
    const updated = [...dismissedIds, idStr];
    setDismissedIds(updated);
    localStorage.setItem(
      `${role}_dismissed_popups`,
      JSON.stringify(updated)
    );
    setActiveAlerts((prev) => prev.filter((a) => String(a.id) !== idStr));

    fetch(`${API_BASE}/api/bugs/notifications/${notifId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: true }),
    }).catch(() => {});
  };

  if (activeAlerts.length === 0) return null;

  const getAlertStyle = (alert) => {
    const type = (alert.notification_type || alert.notificationType || "").toLowerCase();
    const rawSev = (alert.severity || alert.bug_report?.severity || "").toLowerCase();
    const msg = (alert.message || "").toLowerCase();

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
          title: "Medium Priority Bug",
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
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full px-2 sm:px-0 pointer-events-none font-sans">
      {activeAlerts.map((alert) => {
        const config = getAlertStyle(alert);
        const bugId = alert.bug_id || alert.bug_report?.bug_id || "";

        return (
          <div
            key={alert.id}
            className="pointer-events-auto relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-all duration-200"
          >
            {/* Left accent bar */}
            <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${config.accentBar}`} />

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
                    onClick={() => dismissAlert(alert.id)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Message */}
              <p className="text-xs text-slate-600 dark:text-slate-300 font-normal leading-snug mb-3">
                {alert.message}
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
                    onClick={() => dismissAlert(alert.id)}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium text-xs cursor-pointer px-1.5 py-0.5"
                  >
                    Dismiss
                  </button>
                  {onNotificationClick && (
                    <button
                      onClick={() => {
                        dismissAlert(alert.id);
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
