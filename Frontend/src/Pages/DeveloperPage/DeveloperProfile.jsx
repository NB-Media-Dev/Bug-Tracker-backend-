import { useCallback } from "react";
import { UserCheck } from "lucide-react";
import BaseUserProfile from "../../components/shared/BaseUserProfile";
import { API_BASE, authFetch } from "../../lib/api";

export default function DeveloperProfile({ developer }) {
  const fetchDeveloperStats = useCallback(async ({ userEmpId, userName }) => {
    try {
      const res = await authFetch(`${API_BASE}/api/bugs/`);
      if (res.ok) {
        const parsed = await res.json();
        const bugList = Array.isArray(parsed) ? parsed : parsed.results || [];
        const devBugs = bugList.filter(
          (b) =>
            (userEmpId && b.developerId && String(b.developerId).toLowerCase().includes(userEmpId.toLowerCase())) ||
            (userName && b.developerName && String(b.developerName).toLowerCase().includes(userName.toLowerCase())) ||
            (userName && b.develper && String(b.develper).toLowerCase().includes(userName.toLowerCase()))
        );

        return {
          label1: "Assigned",
          value1: devBugs.length,
          label2: "Resolved",
          value2: devBugs.filter(
            (b) => b.devStatus === "Resolved" || b.testerStatus === "Closed" || b.status === "Closed"
          ).length,
          label3: "Pending",
          value3: devBugs.filter(
            (b) => b.devStatus === "In Progress" || b.devStatus === "Pending"
          ).length,
        };
      }
    } catch (e) {
      console.error("Error loading dev stats from API", e);
    }
    return {
      label1: "Assigned",
      value1: 0,
      label2: "Resolved",
      value2: 0,
      label3: "Pending",
      value3: 0,
    };
  }, []);

  const devData = developer || JSON.parse(localStorage.getItem("developer_user") || "{}");
  const devId = devData.id ? `EMP${devData.id}` : devData.employee_id || "EMP101";

  const overviewRows = [
    {
      id: 1,
      label: "Employee ID:",
      value: (
        <span className="font-bold font-mono text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
          {devId}
        </span>
      ),
    },
    {
      id: 2,
      label: "Department:",
      value: <span className="font-bold text-gray-800">Engineering</span>,
    },
    {
      id: 3,
      label: "Account Status:",
      value: (
        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px] uppercase">
          <UserCheck size={12} /> Active
        </span>
      ),
    },
    {
      id: 4,
      label: "Access Permission:",
      value: (
        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[10px] uppercase">
          Developer Portal
        </span>
      ),
    },
  ];

  return (
    <BaseUserProfile
      user={developer}
      storageKey="developer_user"
      defaultValues={{
        name: "Vasanthan",
        email: "vasanthan@company.com",
        role: "Software Developer",
        employeeId: devId,
      }}
      title="Developer Public Profile"
      subtitle="Manage your display name, developer role, and primary contact info."
      overviewTitle="Account Overview"
      overviewSubtitle=""
      overviewRows={overviewRows}
      onFetchStats={fetchDeveloperStats}
      saveSuccessMessage="Developer profile info saved."
      passwordUpdateSuccessMessage="Developer password updated successfully in database!"
    />
  );
}