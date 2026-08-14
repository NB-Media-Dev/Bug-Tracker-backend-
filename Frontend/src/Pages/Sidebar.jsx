import React from "react";
import BaseSidebar from "../components/Sidebar";
import { LayoutDashboard, User, Monitor, User2, ShieldCheck } from "lucide-react";

function Sidebar(props) {
  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Monitor", href: "/monitor", icon: Monitor },
    { name: "User Management", href: "/user-management", icon: User },
    { name: "User Profiles", href: "/profilecard", icon: User2 },
    { name: "My Profile", href: "/admin-profile", icon: ShieldCheck }
  ];

  const adminUser = {
    initials: "A",
    name: "Admin Name",
    role: "Admin user"
  };

  return <BaseSidebar {...props} navItems={navItems} title="Bugtracker" badgeText="Admin" user={adminUser} />;
}

export default Sidebar;
