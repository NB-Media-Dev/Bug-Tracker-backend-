import React from "react";
import BaseSidebar from "../../components/Sidebar";
import { LayoutDashboard, Bug, History, FileArchive } from "lucide-react";

function DesignerSidebar({
  open = false,
  onClose = () => { },
  isCollapsed = false,
  setIsCollapsed = () => { },
  currentPath = "/designer/dashboard",
  onNavigate = () => { },
  onLogout = () => { },
  onProfileClick,
  designer = null,
}) {
  const navItems = [
    { name: "Dashboard", href: "/designer/dashboard", icon: LayoutDashboard },
    { name: "Send Project", href: "/designer/sendproject", icon: FileArchive },
    { name: "My Report", href: "/designer/myreport", icon: Bug },
    { name: "History", href: "/designer/history", icon: History },
  ];

  const designerName = designer?.name || "Designer";
  const initials = designerName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "DS";

  const userRole = designer?.role || "Designer";
  const user = { ...designer, initials, name: designerName, role: userRole };

  return (
    <BaseSidebar
      open={open}
      onClose={onClose}
      isCollapsed={isCollapsed}
      setIsCollapsed={setIsCollapsed}
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      onProfileClick={onProfileClick}
      navItems={navItems}
      title="Bugtracker"
      badgeText="Des"
      user={user}
    />
  );
}

export default DesignerSidebar;
