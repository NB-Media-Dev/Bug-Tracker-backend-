import React, { useState, useEffect } from "react";
import {
  Clock,
  AlertTriangle,
  ArrowRight,
  Calendar,
  ShieldAlert,
  Flame,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function DeveloperReminderModal({
  dueBugs = [],
  onViewBug,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset index if dueBugs change or index becomes out of bounds
  useEffect(() => {
    if (currentIndex >= dueBugs.length) {
      setCurrentIndex(0);
    }
  }, [dueBugs.length, currentIndex]);

  if (!dueBugs || dueBugs.length === 0) return null;

  const safeIndex = currentIndex < dueBugs.length ? currentIndex : 0;
  const currentBug = dueBugs[safeIndex];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDueStatus = (endDateStr) => {
    if (!endDateStr || endDateStr === "N/A") {
      return {
        label: "Upcoming",
        badgeText: "SOON",
      };
    }

    const due = new Date(endDateStr);
    due.setHours(0, 0, 0, 0);

    if (isNaN(due.getTime())) {
      return {
        label: "Due Soon",
        badgeText: "DUE SOON",
      };
    }

    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);
      return {
        label: `Overdue by ${daysOverdue} day${daysOverdue > 1 ? "s" : ""}`,
        badgeText: "OVERDUE",
        isOverdue: true,
      };
    } else if (diffDays === 0) {
      return {
        label: "Due Today",
        badgeText: "DUE TODAY",
        isToday: true,
      };
    } else if (diffDays === 1) {
      return {
        label: "Due Tomorrow",
        badgeText: "1 DAY LEFT",
      };
    } else {
      return {
        label: `Due in ${diffDays} days`,
        badgeText: `${diffDays} DAYS`,
      };
    }
  };

  const getSeverityBadge = (severity) => {
    const sev = (severity || "medium").toLowerCase();
    if (sev === "critical" || sev === "urgent") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
          Critical
        </span>
      );
    }
    if (sev === "high") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          High
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-700/60">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        {severity || "Medium"}
      </span>
    );
  };

  const statusInfo = getDueStatus(currentBug.endDate);
  const isOverdueOrToday = statusInfo.isOverdue || statusInfo.isToday;

  // Mild, subtle color theme matching the application UI design
  const bannerClasses = isOverdueOrToday
    ? "bg-rose-50/90 dark:bg-rose-950/40 border-rose-200/90 dark:border-rose-800/60 text-slate-800 dark:text-slate-100 shadow-xs"
    : "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/90 dark:border-amber-800/60 text-slate-800 dark:text-slate-100 shadow-xs";

  const iconBoxClasses = isOverdueOrToday
    ? "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 border border-rose-200/80 dark:border-rose-700/50"
    : "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-700/50";

  const badgeClasses = isOverdueOrToday
    ? "bg-rose-600 text-white font-extrabold"
    : "bg-amber-600 text-white font-extrabold";

  const btnClasses = isOverdueOrToday
    ? "bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs"
    : "bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs";

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % dueBugs.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + dueBugs.length) % dueBugs.length);
  };

  return (
    <div className="mb-4 transition-all duration-300 animate-in fade-in slide-in-from-top-3">
      <div
        className={`relative w-full rounded-2xl border p-4 sm:p-5 ${bannerClasses} overflow-hidden`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left section: Icon + Urgent badge + Bug title & details */}
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            <div className={`p-2.5 rounded-xl ${iconBoxClasses} flex-shrink-0 mt-0.5`}>
              {isOverdueOrToday ? (
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              ) : (
                <Flame className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 text-[10px] uppercase tracking-wider rounded-full ${badgeClasses}`}>
                  {statusInfo.badgeText}
                </span>
                <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                  {currentBug.id}
                </span>
                {getSeverityBadge(currentBug.severity)}
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                  {statusInfo.label}
                </span>
              </div>

              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {currentBug.title}
              </h4>

              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                <span>
                  Project: <strong className="text-slate-900 dark:text-slate-100 font-semibold">{currentBug.module || "General"}</strong>
                </span>
                <span>•</span>
                <span>
                  Due Date: <strong className="text-slate-900 dark:text-slate-100 font-semibold">{currentBug.endDate || "N/A"}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right section: Sequential Bug Controls & Action CTA Button (NO X mark button) */}
          <div className="flex items-center gap-3 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-200/60 dark:border-slate-800/60">
            {dueBugs.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={handlePrev}
                  className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Previous Due Bug"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 px-1">
                  {safeIndex + 1}/{dueBugs.length}
                </span>
                <button
                  onClick={handleNext}
                  className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Next Due Bug"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            
          </div>
        </div>
      </div>
    </div>
  );
}


