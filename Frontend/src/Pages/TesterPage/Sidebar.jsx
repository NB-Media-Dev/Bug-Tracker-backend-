import React from "react";
import BaseSidebar from "../../components/Sidebar";
import { LayoutDashboard, User2, HelpCircle, FormIcon, Bug, Inbox, History } from "lucide-react";

function Sidebar(props) {
  const navItems = [
    { name: "Dashboard", href: "/tester/dashboard", icon: LayoutDashboard },
    { name: "Inbox Dashboard", href: "/tester/inbox", icon: Inbox },
    { name: "Report Form", href: "/tester/reportfrom", icon: FormIcon },
    { name: "My Bug Report", href: "/tester/bugreport", icon: Bug },
    { name: "History Report", href: "/tester/historyreport", icon: History }
  ];

  const tester = JSON.parse(localStorage.getItem("tester_user") || "{}") || {};
  const testerName = tester.name || "Tester";
  const initials = testerName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "TS";

  const user = {
    initials,
    name: testerName,
    role: tester.role || "Tester"
  };

  return <BaseSidebar {...props} navItems={navItems} title="Bugtracker" badgeText="Tester" user={user} />;
}

export default Sidebar;
