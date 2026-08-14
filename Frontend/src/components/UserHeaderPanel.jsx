import React, { useState, useEffect } from "react";
import { Bell, LogOut } from "lucide-react";
import { getStoredAvatar } from "../lib/avatar";

function getInitials(name = "User") {
  return name
    .toString()
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function UserHeaderPanel({ user = {}, notificationCount = 0, onBellClick, onLogout, onProfileClick }) {
  const initials = getInitials(user.name || user.username || "User");
  const [avatarSrc, setAvatarSrc] = useState(() => getStoredAvatar(user));

  useEffect(() => {
    const updateAvatar = () => {
      setAvatarSrc(getStoredAvatar(user));
    };
    updateAvatar();
    window.addEventListener("user_profile_updated", updateAvatar);
    return () => {
      window.removeEventListener("user_profile_updated", updateAvatar);
    };
  }, [user]);

  return (
    <div className="flex items-center gap-1.5 sm:gap-3">
      <button
        type="button"
        onClick={onBellClick}
        className="relative p-1.5 sm:p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer shadow-sm flex-shrink-0"
        title="Notifications"
      >
        <Bell size={16} className="sm:hidden" />
        <Bell size={18} className="hidden sm:block" />
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-red-600 text-[9px] sm:text-[10px] font-semibold text-white">
            {notificationCount > 9 ? "9+" : notificationCount}
          </span>
        )}
      </button>

      <div
        onClick={onProfileClick}
        title="My Account Profile"
        className="flex items-center gap-2 rounded-xl sm:rounded-2xl border border-gray-200 bg-white hover:bg-slate-50 hover:border-slate-300 px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm flex-shrink-0 cursor-pointer transition-all group"
      >
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={user.name || "User"}
            className="h-7 w-7 sm:h-9 sm:w-9 rounded-xl sm:rounded-2xl object-cover border border-slate-300 flex-shrink-0"
          />
        ) : (
          <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-xl sm:rounded-2xl bg-slate-900 text-xs sm:text-sm font-semibold text-white flex-shrink-0 group-hover:bg-indigo-600 transition-colors">
            {initials}
          </div>
        )}

        <div className="hidden sm:flex min-w-0 items-center gap-2">
          <div className="truncate text-sm font-semibold text-slate-900 max-w-[100px] group-hover:text-indigo-600 transition-colors">
            {user.name || user.username || "User"}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (typeof onLogout === "function") onLogout();
          }}
          title="Logout"
          className="sm:hidden p-0.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors flex-shrink-0"
        >
          <LogOut size={13} />
        </button>
      </div>
    </div>
  );
}
