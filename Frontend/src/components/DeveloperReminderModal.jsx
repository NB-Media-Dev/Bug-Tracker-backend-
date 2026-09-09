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
  Bug,
  Sparkles,
} from "lucide-react";

export default function DeveloperReminderModal({
  dueBugs = [],
  
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-extrabold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
          Critical
        </span>
      );
    }
    if (sev === "high") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-extrabold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          High
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
        {severity || "Medium"}
      </span>
    );
  };

  const statusInfo = getDueStatus(currentBug.endDate);
  const isOverdueOrToday = statusInfo.isOverdue || statusInfo.isToday;

  const bannerClasses = isOverdueOrToday
    ? "bg-gradient-to-r from-rose-50/95 via-white/90 to-rose-50/80 dark:from-rose-950/50 dark:via-slate-900/90 dark:to-rose-950/40 border-rose-300/90 dark:border-rose-800/80 text-slate-900 dark:text-slate-100 shadow-md ring-1 ring-rose-300/50"
    : "bg-gradient-to-r from-amber-50/95 via-white/90 to-amber-50/80 dark:from-amber-950/50 dark:via-slate-900/90 dark:to-amber-950/40 border-amber-300/90 dark:border-amber-800/80 text-slate-900 dark:text-slate-100 shadow-md ring-1 ring-amber-300/50";

  const iconBoxClasses = isOverdueOrToday
    ? "bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 border border-rose-300 dark:border-rose-700 shadow-2xs"
    : "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs";

  const badgeClasses = isOverdueOrToday
    ? "bg-rose-600 text-white font-black shadow-xs tracking-wider animate-pulse"
    : "bg-amber-600 text-white font-black shadow-xs tracking-wider";

  const btnClasses = isOverdueOrToday
    ? "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold shadow-sm hover:shadow transition-all cursor-pointer"
    : "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold shadow-sm hover:shadow transition-all cursor-pointer";

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % dueBugs.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + dueBugs.length) % dueBugs.length);
  };

  return (
    <div className="mb-5 transition-all duration-300 animate-in fade-in slide-in-from-top-3">
      <div className={`relative w-full rounded-2xl border p-4 sm:p-5 ${bannerClasses} overflow-hidden backdrop-blur-md`}>
        {/* Decorative corner glow */}
        <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-xl opacity-40 pointer-events-none ${isOverdueOrToday ? 'bg-rose-400' : 'bg-amber-400'}`} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          {/* Left section: Icon + Urgent badge + Bug title & details */}
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            <div className={`p-3 rounded-2xl ${iconBoxClasses} flex-shrink-0 mt-0.5`}>
              {isOverdueOrToday ? (
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              ) : (
                <Flame className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 text-[10px] uppercase rounded-full ${badgeClasses}`}>
                  {statusInfo.badgeText}
                </span>
                <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-white/90 dark:bg-slate-800/90 px-2.5 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700 shadow-2xs">
                  {currentBug.id}
                </span>
                {getSeverityBadge(currentBug.severity)}
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                  {statusInfo.label}
                </span>
              </div>

              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {currentBug.title}
              </h4>

              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="text-slate-400 font-normal">Project:</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-bold uppercase">{currentBug.module || "General"}</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-slate-400" />
                  <span className="text-slate-400 font-normal">Due Date:</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-bold">{currentBug.endDate || "N/A"}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right section: Sequential Bug Controls & Action CTA Button */}
          <div className="flex items-center gap-3 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-200/60 dark:border-slate-800/60">
            {dueBugs.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Previous Due Bug"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-200 px-1">
                  {safeIndex + 1}/{dueBugs.length}
                </span>
                <button
                  type="button"
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
