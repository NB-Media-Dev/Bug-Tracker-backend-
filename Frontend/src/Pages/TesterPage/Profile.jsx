import { useCallback } from "react";
import BaseUserProfile from "../../components/shared/BaseUserProfile";
import { API_BASE, authFetch } from "../../lib/api";

export default function Profile({ tester }) {
  const fetchTesterStats = useCallback(async ({ userName, userEmail }) => {
    try {
      const res = await authFetch(`${API_BASE}/api/bugs/`);
      if (res.ok) {
        const parsed = await res.json();
        const bugList = Array.isArray(parsed) ? parsed : parsed.results || [];
        const testerBugs = bugList.filter(
          (b) =>
            (b.testerName && String(b.testerName).toLowerCase().includes(userName.toLowerCase())) ||
            (b.tester_name && String(b.tester_name).toLowerCase().includes(userName.toLowerCase())) ||
            (b.reportedBy && String(b.reportedBy).toLowerCase().includes(userName.toLowerCase())) ||
            (b.email && String(b.email).toLowerCase() === userEmail.toLowerCase())
        );

        const reportedCount = testerBugs.length;
        const resolvedCount = testerBugs.filter(
          (b) => b.devStatus === "Resolved" || b.testerStatus === "Closed" || b.status === "Closed"
        ).length;
        const pendingCount = testerBugs.filter(
          (b) => b.devStatus === "In Progress" || b.devStatus === "Pending" || b.status === "Open"
        ).length;

        return {
          label1: "Reported",
          value1: reportedCount || 42,
          label2: "Resolved",
          value2: resolvedCount || 29,
          label3: "Pending",
          value3: pendingCount || 13,
        };
      }
    } catch (e) {
      console.error("Error loading tester stats", e);
    }
    return {
      label1: "Reported",
      value1: 42,
      label2: "Resolved",
      value2: 29,
      label3: "Pending",
      value3: 13,
    };
  }, []);

  return (
    <BaseUserProfile
      user={tester}
      storageKey="tester_user"
      defaultValues={{
        name: "Kamatchi",
        email: "kamatchi@company.com",
        role: "QA Tester / Software Tester",
      }}
      title="Public Info"
      subtitle="Manage your public account name and role title."
      overviewTitle="Workstation Details"
      overviewSubtitle="Your QA workspace configurations."
     
      onFetchStats={fetchTesterStats}
      saveSuccessMessage="General profile info saved!"
      passwordUpdateSuccessMessage="Tester password updated successfully in database!"
    />
  );
}