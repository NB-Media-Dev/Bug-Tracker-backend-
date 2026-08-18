import React from "react";
import BaseSidebar from "../components/Sidebar";
import { LayoutDashboard, User, Monitor, User2, ShieldCheck } from "lucide-react";

function Sidebar(props) {
  const roleStr = (props.userRole || props.user?.role || "admin").toString().toLowerCase();
  const isCTO = roleStr === "cto";

  const ctoNavItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Monitor", href: "/monitor", icon: Monitor },
    { name: "User Management", href: "/user-management", icon: User }
  ];

  const adminNavItems = [
    { name: "User Management", href: "/user-management", icon: User }
  ];

  const navItems = isCTO ? ctoNavItems : adminNavItems;
  const badgeText = isCTO ? "CTO" : "Admin";

  const userName = props.user?.name || props.user?.username || (isCTO ? "CTO User" : "Admin User");
  const userInitials = userName ? userName.charAt(0).toUpperCase() : (isCTO ? "C" : "A");

  const sidebarUser = {
    initials: userInitials,
    name: userName,
    role: isCTO ? "CTO Portal" : "Admin Portal"
  };

  return <BaseSidebar {...props} navItems={navItems} title="Bugtracker" badgeText={badgeText} user={sidebarUser} />;
}

export default Sidebar;
