import React from "react";
import BaseSidebar from "../../components/Sidebar";
import { LayoutDashboard, User2, HelpCircle, Bug, History, FileArchive } from "lucide-react";

function DeveloperSidebar({ open = false, onClose = () => {}, isCollapsed = false, setIsCollapsed = () => {}, currentPath = "/developer/dashboard", onNavigate = () => {}, onLogout = () => {}, developer = null }) {
  const navItems = [
    { name: "Dashboard", href: "/developer/dashboard", icon: LayoutDashboard },
    { name: "Send Project", href: "/developer/sendproject", icon: FileArchive },
    { name: "My Report", href: "/developer/myreport", icon: Bug },
    { name: "History", href: "/developer/history", icon: History },
    { name: "Profile", href: "/developer/profile", icon: User2 },
    { name: "Help and support", href: "/developer/help", icon: HelpCircle }
  ];

  const devName = developer?.name || "Developer";
  const initials = devName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "DV";

  const user = { initials, name: devName, role: "Developer" };

  return (
    <BaseSidebar
      open={open}
      onClose={onClose}
      isCollapsed={isCollapsed}
      setIsCollapsed={setIsCollapsed}
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      navItems={navItems}
      title="Bugtracker"
      badgeText="Dev"
      user={user}
    />
  );
}

export default DeveloperSidebar;
