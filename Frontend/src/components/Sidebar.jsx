import { useState } from "react";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";

export default function Sidebar({
  open = false,
  onClose = () => {},
  isCollapsed = false,
  setIsCollapsed = () => {},
  currentPath = "/",
  onNavigate = () => {},
  onLogout = () => {},
  navItems = [],
  title = "Bugtracker",
  badgeText = "",
  user = { initials: "", name: "User", role: "Member" },
}) {
  const [showLogout, setShowLogout] = useState(false);

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 border-r border-slate-800 transform transition-all duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:relative md:transform-none ${isCollapsed ? "md:w-16" : "md:w-64"}`}
        aria-hidden={!open}
      >
        <div className="h-full flex flex-col justify-between">
          <div>
            <div
              className={`flex items-center p-4 border-b border-slate-800 min-h-[64px] transition-all duration-300 ${
                isCollapsed ? "justify-center" : "justify-between"
              }`}
            >
              <div
                className={`flex items-center gap-3 transition-all duration-300 overflow-hidden ${
                  isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
                }`}
              >
                <span className="font-semibold text-base tracking-tight whitespace-nowrap">
                  {title}
                  {badgeText ? (
                    <span className="text-xs text-blue-400 font-bold bg-blue-900/40 px-2 py-0.5 rounded border border-blue-700/50 ml-2">
                      {badgeText}
                    </span>
                  ) : null}
                </span>
              </div>

              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex p-1.5 rounded-lg hover:bg-slate-800 text-slate-100 cursor-pointer transition-colors"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            </div>

            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.href || (item.href === "/" && (currentPath === "" || currentPath === "/index.html"));
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => onNavigate(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white font-semibold shadow-xs"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                    } ${isCollapsed ? "justify-center px-0" : ""}`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span
                      className={`transition-all duration-300 truncate ${
                        isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
                      }`}
                    >
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-3 border-t border-slate-800">
            {showLogout && (
              <div
                className={`absolute bottom-[72px] bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-1.5 z-50 transition-all duration-300 ${
                  isCollapsed ? "left-2 w-32" : "left-3 right-3"
                }`}
              >
                <button
                  onClick={() => {
                    setShowLogout(false);
                    onLogout();
                  }}
                  className="flex items-center gap-2.5 w-full p-2 text-sm text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer font-medium"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Log out</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setShowLogout(!showLogout)}
              className={`flex items-center w-full p-2 rounded-lg hover:bg-slate-800 text-slate-200 transition-all duration-300 text-sm font-medium cursor-pointer ${
                isCollapsed ? "justify-center" : "gap-3"
              }`}
            >
              <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 text-xs uppercase">
                {user.initials}
              </div>
              <div
                className={`flex flex-col text-left transition-all duration-300 overflow-hidden whitespace-nowrap ${
                  isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                }`}
              >
                <span className="text-sm font-semibold leading-none text-white truncate">{user.name}</span>
                <span className="text-xs text-slate-400 mt-1 leading-none truncate">{user.role}</span>
              </div>
            </button>
          </div>
        </div>
      </aside>

      {open && <button className="fixed inset-0 z-30 bg-black/25 md:hidden" onClick={onClose} />}
    </>
  );
}
