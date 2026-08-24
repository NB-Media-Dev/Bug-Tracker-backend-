
import {
  Send,
  X,
  Eye,
  FolderGit2,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  FileText,
  Bug,
  Plus,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import { API_BASE, authFetch } from "../../lib/api";
import { getProjectAcronym, normalizeBug, navigateTo, downloadFile, getTesterInfo, matchesTester, escapeCSV, formatDateStandard } from "../../lib/utils";
import StatusFilterSelect from "../../components/shared/StatusFilterSelect";

function Mybugreport({ onNavigate }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [testName, setTestName] = useState("");
  const [viewingBug, setViewingBug] = useState(null);
  const [editingBug, setEditingBug] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSeverity, setEditSeverity] = useState("Low");
  const [editBugType, setEditBugType] = useState("Functional");
  const [editStepsText, setEditStepsText] = useState("");

  const [bugs, setBugs] = useState([]);
  const [savedBugs, setSavedBugs] = useState(() => {
    try {
      const raw = localStorage.getItem("saved_bug_reports");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const syncSavedBugs = () => {
    try {
      const raw = localStorage.getItem("saved_bug_reports");
      setSavedBugs(raw ? JSON.parse(raw) : []);
    } catch (e) {
      setSavedBugs([]);
    }
  };

  React.useEffect(() => {
    syncSavedBugs();
    window.addEventListener("saved_bugs_updated", syncSavedBugs);
    window.addEventListener("storage", syncSavedBugs);
    return () => {
      window.removeEventListener("saved_bugs_updated", syncSavedBugs);
      window.removeEventListener("storage", syncSavedBugs);
    };
  }, []);
  const { name: currentTesterName, id: currentTesterId, email: currentTesterEmail } = getTesterInfo();

  const [expandedProjects, setExpandedProjects] = useState({});

  const toggleProjectExpand = (projName) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projName]: !prev[projName],
    }));
  };

  const handleAddNewBugForProject = (projName, assignedDev, assignedDevId) => {
    localStorage.setItem(
      "selected_project_name",
      projName.trim().toUpperCase(),
    );
    if (assignedDev && assignedDev !== "Unassigned") {
      localStorage.setItem("selected_developer_name", assignedDev);
    } else {
      localStorage.removeItem("selected_developer_name");
      localStorage.removeItem("selected_developer_id");
    }
    if (assignedDevId) {
      localStorage.setItem("selected_developer_id", assignedDevId);
    }
    localStorage.setItem("autofill_report_form", "true");
    navigateTo("/tester/reportfrom", onNavigate);
  };

  const handleExportProjectExcel = (projName, projBugs) => {
    if (!projBugs || projBugs.length === 0) {
      alert("No bug reports found for this project to export.");
      return;
    }

    const headers = [
      "Bug ID",
      "Project Name",
      "Title",
      "Description",
      "Severity",
      "Bug Type",
      "Tester Name",
      "Tester ID",
      "Developer Name",
      "Developer ID",
      "Assigned Date",
      "Due Date",
      "Tester Status",
      "Developer Status",
    ];

    const rows = projBugs.map((b) => [
      escapeCSV(b.id || b.bugId),
      escapeCSV(b.module || projName),
      escapeCSV(b.title),
      escapeCSV(b.description),
      escapeCSV(b.severity),
      escapeCSV(b.bugType),
      escapeCSV(b.testerName),
      escapeCSV(b.testerId),
      escapeCSV(b.developer),
      escapeCSV(b.developerId),
      escapeCSV(b.Assgined_Date),
      escapeCSV(b.endDate),
      escapeCSV(b.testerStatus || b.status),
      escapeCSV(b.devStatus || "In Progress"),
    ]);

    const cleanFileName = projName.replaceAll(/[^a-zA-Z0-9_-]/g, "_");
    const blob = new Blob(
      ["data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")],
      { type: "text/csv;charset=utf-8;" }
    );
    downloadFile(blob, `${cleanFileName}_Bug_Report_${Date.now()}.csv`);
  };

  const [acceptedSubmissions, setAcceptedSubmissions] = useState([]);

  const loadAcceptedSubmissions = async () => {
    try {
      const response = await authFetch('/api/bugs/submissions/');
      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data) ? data : data.results || [];
        setAcceptedSubmissions(items);
      }
    } catch (e) {
      console.error("Error loading accepted submissions from API", e);
    }
  };

  const loadBugs = async () => {
    try {
      const response = await authFetch('/api/bugs/');

      if (response.ok) {
        const data = await response.json();
        const allBugs = Array.isArray(data) ? data : data.results || [];

        const mapped = allBugs.map((b) => ({
          ...normalizeBug(b),
          devResolved: b.devResolved || b.dev_resolved || false,
        }));
        setBugs(mapped);
        return;
      }
    } catch (e) {
      console.error("Error loading bugs from API", e);
    }
  };

  React.useEffect(() => {
    loadBugs();
    loadAcceptedSubmissions();
    const handleReload = () => {
      loadBugs();
      loadAcceptedSubmissions();
    };
    window.addEventListener("notifications_updated", handleReload);
    return () => {
      window.removeEventListener("notifications_updated", handleReload);
    };
  }, []);

  const loadTestName = () => {
    const savedTestName = localStorage.getItem("test_name");
    if (savedTestName) {
      setTestName(savedTestName);
      return;
    }
    try {
      const testerUser = JSON.parse(localStorage.getItem("tester_user"));
      if (testerUser?.name) {
        setTestName(testerUser?.name);
      } else {
        setTestName("");
      }
    } catch (e) {
      console.error("error in my bug report", e);
      setTestName("");
    }
  };

  const handleOpenModal = () => {
    loadTestName();
    setProjectName("");
    localStorage.removeItem("selected_developer_name");
    localStorage.removeItem("selected_developer_id");
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!projectName.trim() || !testName.trim()) return;

    localStorage.setItem("test_name", testName.trim());
    localStorage.setItem(
      "selected_project_name",
      projectName.trim().toUpperCase(),
    );
    localStorage.setItem("selected_test_name", testName.trim());
    localStorage.removeItem("selected_developer_name");
    localStorage.removeItem("selected_developer_id");
    localStorage.setItem("autofill_report_form", "true");

    setIsModalOpen(false);
    setProjectName("");
    onNavigate("/tester/reportfrom");
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Saved":
        return "bg-amber-50 text-amber-800 border border-amber-300 font-bold";
      case "Open":
        return "bg-blue-50 text-blue-700 border border-blue-200 font-bold";
      case "Resolved":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold";
      case "Not Fixed":
        return "bg-red-50 text-red-700 border border-red-200 font-bold";
      case "Closed":
        return "bg-slate-100 text-slate-700 border border-slate-300 font-bold";
      case "Pending":
        return "bg-amber-50 text-amber-700 border border-amber-200 font-bold";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-300 font-bold";
    }
  };

  const handleOpenDetails = async (bug) => {
    setViewingBug(bug);
    if (bug.devResolved) {
      try {
        await authFetch(`/api/bugs/${bug.rawId || bug.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ devResolved: false, dev_resolved: false }),
        });
        setBugs((prev) =>
          prev.map((b) =>
            b.rawId === bug.rawId
              ? { ...b, devResolved: false, dev_resolved: false }
              : b,
          ),
        );
      } catch (err) {
        console.error("Error clearing devResolved flag", err);
      }
    }
  };

  const handleEditBug = (bug) => {
    setEditingBug(bug);
    setEditTitle(bug.title || "");
    setEditDescription(bug.description || "");
    setEditSeverity(bug.severity || "Low");
    setEditBugType(bug.bugType || bug.bug_type || "Functional");
    setEditStepsText(bug.stepsText || bug.steps_text || "");
  };

  const handleEditStepsKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const bullet = "\n• ";
      const newValue = val.substring(0, start) + bullet + val.substring(end);
      setEditStepsText(newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + bullet.length;
      }, 0);
    }
  };

  const handleEditStepsFocus = () => {
    if (!editStepsText?.trim()) {
      setEditStepsText("• ");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingBug) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/bugs/${editingBug.rawId || editingBug.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editTitle,
            description: editDescription,
            severity: editSeverity,
            bugType: editBugType,
            bug_type: editBugType,
            stepsText: editStepsText,
            steps_text: editStepsText,
            files: editingBug.files || [],
          }),
        },
      );
      if (response.ok) {
        alert("Bug report updated successfully!");
        setEditingBug(null);
        loadBugs();
      } else {
        const errData = await response.json();
        alert("Failed to update bug report: " + JSON.stringify(errData));
      }
    } catch (err) {
      console.error("Error updating bug:", err);
      alert("Error updating bug report. Please try again.");
    }
  };

  const handleDeleteBug = async (rawId) => {
    const targetBug = allCombinedBugs.find((b) => b.rawId === rawId || b.id === rawId);

    if (
      window.confirm(
        "Are you sure you want to delete this bug report? This will remove it from the system.",
      )
    ) {
      if (targetBug && (targetBug.isSaved || targetBug.status === "Saved" || String(rawId).startsWith("saved-"))) {
        const existingStr = localStorage.getItem("saved_bug_reports");
        if (existingStr) {
          const existing = JSON.parse(existingStr);
          const orig = targetBug.originalData || targetBug;
          const targetKey = orig.bugId || orig.id || targetBug.id;
          const updated = existing.filter(
            (sb) =>
              (sb.bugId || sb.id) !== targetKey &&
              sb.title !== orig.title,
          );
          localStorage.setItem("saved_bug_reports", JSON.stringify(updated));
        }
        alert("Saved bug report deleted successfully!");
        window.dispatchEvent(new Event("saved_bugs_updated"));
        loadBugs();
        return;
      }

      try {
        const deleteId = targetBug?.rawId || targetBug?.bugId || rawId;
        const response = await authFetch(`/api/bugs/${deleteId}/`, {
          method: "DELETE",
        });
        if (response.ok) {
          alert("Bug report deleted successfully!");
          window.dispatchEvent(new Event("notifications_updated"));
          loadBugs();
        } else {
          alert("Failed to delete bug report.");
        }
      } catch (err) {
        console.error("Error deleting bug:", err);
        alert("Could not connect to server.");
      }
    }
  };

  const canCloseBug = (bug) => {
    if (!bug) return false;
    const status = (bug.status || bug.devStatus || "").trim().toLowerCase();
    return ["resolved", "fixed", "closed"].includes(status) || Boolean(bug.devResolved);
  };

  const handleReopenNavigation = (bugData) => {
    localStorage.setItem("reopen_bug_data", JSON.stringify(bugData));
    if (onNavigate) {
      onNavigate("/tester/reportfrom");
    } else {
      window.history.pushState({}, "", "/tester/reportfrom");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const handleTesterStatusChange = async (rawId, newStatus) => {
    const targetBug = allCombinedBugs.find(
      (b) =>
        b.rawId === rawId ||
        b.id === rawId ||
        b.bugId === rawId ||
        (b.rawId && String(b.rawId) === String(rawId)) ||
        (b.id && String(b.id) === String(rawId))
    );
    if (!targetBug) return;

    if (newStatus === "Closed" && !canCloseBug(targetBug)) {
      alert("Only bugs that have been resolved by the developer can be closed by the tester.");
      return;
    }

    if ((targetBug.isSaved || targetBug.status === "Saved") && newStatus === "Open") {
      try {
        const orig = targetBug.originalData || targetBug;
        const res = await authFetch('/api/bugs/', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bug_id: orig.bugId || orig.bug_id || targetBug.id,
            title: orig.title,
            description: orig.description,
            severity: orig.severity,
            bug_type: orig.bugType || orig.bug_type || "Functional",
            status: "Open",
            steps_text: orig.stepsText || orig.steps_text || "",
            stepsText: orig.stepsText || orig.steps_text || "",
            module: (orig.module || "General").trim().toUpperCase(),
            files: orig.files || [],
            tester_name: orig.testerName || currentTesterName || "Kamatchi",
            tester_id: orig.testerId || currentTesterId || "TS001",
            tester_email: orig.testerEmail || currentTesterEmail || "",
            developer_name: orig.developerName || orig.develper || "Unassigned",
            developer_id: orig.developerId || "DEV001",
            due_date: orig.dueDate || null,
          }),
        });

        if (res.ok) {
          const existingStr = localStorage.getItem("saved_bug_reports");
          if (existingStr) {
            const existing = JSON.parse(existingStr);
            const updated = existing.filter(
              (sb) =>
                (sb.bugId || sb.id) !== (orig.bugId || orig.id || targetBug.id) &&
                sb.title !== orig.title
            );
            localStorage.setItem("saved_bug_reports", JSON.stringify(updated));
          }
          alert(`Bug report "${targetBug.title}" has been successfully sent to the developer!`);
          window.dispatchEvent(new Event("notifications_updated"));
          loadBugs();
          return;
        } else {
          alert("Failed to submit saved bug report to developer.");
        }
      } catch (err) {
        console.error("Error submitting single saved bug:", err);
        alert("Error connecting to server to submit bug.");
      }
      return;
    }

    setBugs((prev) =>
      prev.map((b) =>
        (b.rawId && (b.rawId === rawId || String(b.rawId) === String(rawId))) ||
        (b.id && (b.id === rawId || String(b.id) === String(rawId))) ||
        (b.bugId && (b.bugId === rawId || String(b.bugId) === String(rawId)))
          ? {
              ...b,
              testerStatus: newStatus,
              status: newStatus,
              devStatus: newStatus,
            }
          : b,
      ),
    );

    try {
      const payload = {
        status: newStatus,
        testerStatus: newStatus,
        devStatus: newStatus,
        dev_status: newStatus,
      };
      const bugTargetId = targetBug.rawId || targetBug.id || targetBug.bugId || rawId;
      const response = await authFetch(`${API_BASE}/api/bugs/${bugTargetId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        console.error("Bug patch error:", response.status, errData);
        alert(errData?.detail || `Failed to update bug status (${response.status}).`);
        loadBugs();
      } else {
        window.dispatchEvent(new Event("notifications_updated"));
        loadBugs();
      }
    } catch (e) {
      console.error("Error updating bug status on backend API", e);
      alert("Network error updating bug status.");
      loadBugs();
    }

    if (newStatus === "Open" && targetBug) {
      handleReopenNavigation(targetBug);
    }
  };

  const handleSendSavedReportsForProject = async (projName, savedBugsList) => {
    if (!savedBugsList || savedBugsList.length === 0) return;

    if (
      !window.confirm(
        `Are you sure you want to send ${savedBugsList.length} saved bug report(s) for project "${projName}" to the developer?`,
      )
    ) {
      return;
    }

    let successCount = 0;
    for (const b of savedBugsList) {
      const orig = b.originalData || b;
      try {
        const res = await authFetch('/api/bugs/', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bug_id: orig.bugId || orig.bug_id,
            title: orig.title,
            description: orig.description,
            severity: orig.severity,
            bug_type: orig.bugType || orig.bug_type || "Functional",
            status: "Open",
            steps_text: orig.stepsText || orig.steps_text || "",
            stepsText: orig.stepsText || orig.steps_text || "",
            module: (orig.module || projName).trim().toUpperCase(),
            files: orig.files || [],
            tester_name: orig.testerName || "Kamatchi",
            tester_id: orig.testerId || "TS001",
            tester_email: orig.testerEmail || "prasanna_tester@gmail.com",
            developer_name: orig.developerName || orig.develper || "Unassigned",
            developer_id: orig.developerId || "DEV001",
            due_date: orig.dueDate || null,
          }),
        });
        if (res.ok) {
          successCount++;
        }
      } catch (err) {
        console.error("Error posting saved bug to developer", err);
      }
    }

    try {
      const savedRaw = localStorage.getItem("saved_bug_reports");
      if (savedRaw) {
        const allSaved = JSON.parse(savedRaw);
        const idsToRemove = savedBugsList.map((sb) => sb.rawId || sb.id);
        const remaining = allSaved.filter(
          (sb) =>
            !idsToRemove.includes(sb.id) &&
            !idsToRemove.includes(sb.rawId) &&
            !idsToRemove.includes(sb.bugId),
        );
        localStorage.setItem("saved_bug_reports", JSON.stringify(remaining));
        setSavedBugs(remaining);
        window.dispatchEvent(new Event("saved_bugs_updated"));
      }
    } catch (e) {
      console.error("Error updating saved_bug_reports in local storage", e);
    }

    alert(
      `Successfully sent ${successCount} saved bug report(s) for project "${projName}" to developer!`,
    );
    loadBugs();
    window.dispatchEvent(new Event("notifications_updated"));
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [developerFilter, setDeveloperFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState(
    () => localStorage.getItem("project_filter") || "",
  );

  const normalizedSavedBugs = (savedBugs || []).map((sb, idx) => ({
    id: sb.bugId || `BUG-SAVED-${idx + 1}`,
    rawId: sb.id || `saved-${idx}`,
    title: sb.title || "Saved Bug Report",
    description: sb.description || "",
    severity: sb.severity || "Medium",
    bugType: sb.bugType || sb.bug_type || "Functional",
    module: (sb.module || sb.project_name || sb.projectName || "General")
      .trim()
      .toUpperCase(),
    developer: sb.developerName || sb.develper || "Unassigned",
    developerId: sb.developerId || "DEV001",
    testerName: sb.testerName || "Kamatchi",
    testerId: sb.testerId || "TS001",
    testerEmail: sb.testerEmail || "",
    Assgined_Date: formatDateStandard(sb.assignedOn || sb.assigned_on || new Date()),
    endDate: formatDateStandard(sb.dueDate || sb.due_date),
    status: "Saved",
    isSaved: true,
    stepsText: sb.stepsText || sb.steps_text || "",
    files: sb.files || [],
    originalData: sb,
  }));



  const projectBugCounts = {};
  const rawCombinedBugs = [...bugs, ...normalizedSavedBugs];

  const chronologicalBugs = [...rawCombinedBugs].sort((a, b) => {
    const numA = typeof a.rawId === "number" ? a.rawId : (parseInt(String(a.rawId || a.id).replace(/\D/g, ""), 10) || 0);
    const numB = typeof b.rawId === "number" ? b.rawId : (parseInt(String(b.rawId || b.id).replace(/\D/g, ""), 10) || 0);
    if (numA !== numB) return numA - numB;
    const dateA = new Date(a.created_at || a.assignedOn || a.Assgined_Date || 0).getTime();
    const dateB = new Date(b.created_at || b.assignedOn || b.Assgined_Date || 0).getTime();
    return dateA - dateB;
  });

  const bugIdMap = new Map();
  chronologicalBugs.forEach((bug) => {
    const projName = bug.module || "General";
    const acronym = getProjectAcronym(projName);
    projectBugCounts[acronym] = (projectBugCounts[acronym] || 0) + 1;
    const sequenceNum = String(projectBugCounts[acronym]).padStart(3, "0");
    const customBugId = `${acronym}-${sequenceNum}`;
    const key = bug.rawId || bug.id;
    bugIdMap.set(key, customBugId);
  });

  const mappedCombinedBugs = rawCombinedBugs.map((bug) => {
    const key = bug.rawId || bug.id;
    const customBugId = bugIdMap.get(key) || formatBugId(bug);
    return {
      ...bug,
      id: customBugId,
      bugId: customBugId,
      originalBugId: bug.id || bug.bugId,
    };
  });

  const allCombinedBugs = [...mappedCombinedBugs].sort((a, b) => {
    const numA = typeof a.rawId === "number" ? a.rawId : (parseInt(String(a.rawId || a.originalBugId).replace(/\D/g, ""), 10) || 0);
    const numB = typeof b.rawId === "number" ? b.rawId : (parseInt(String(b.rawId || b.originalBugId).replace(/\D/g, ""), 10) || 0);
    if (numA !== numB) return numA - numB;
    const dateA = new Date(a.created_at || a.assignedOn || a.Assgined_Date || 0).getTime();
    const dateB = new Date(b.created_at || b.assignedOn || b.Assgined_Date || 0).getTime();
    return dateA - dateB;
  });

  const developersList = [
    "All",
    ...new Set(
      allCombinedBugs
        .map(
          (bug) =>
            `${bug.developer || "Unassigned"} (${bug.developerId || "N/A"})`,
        )
        .filter(Boolean),
    ),
  ];

  const filteredBugs = allCombinedBugs.filter((bug) => {
    const matchesProject =
      !projectFilter ||
      (bug.module || "").toString().trim().toLowerCase() ===
        projectFilter.toString().trim().toLowerCase();
    const matchesSearch =
      bug.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bug.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${bug.developer || "Unassigned"} (${bug.developerId || "N/A"})`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      bug.module.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "All" || bug.status === statusFilter;
    const developerLabel = `${bug.developer || "Unassigned"} (${bug.developerId || "N/A"})`;
    const matchesDeveloper =
      developerFilter === "All" || developerLabel === developerFilter;

    return matchesSearch && matchesStatus && matchesDeveloper && matchesProject;
  });

  const groupedProjects = filteredBugs.reduce((acc, bug) => {
    const projectName = (bug.module || "General").trim().toUpperCase();
    const developerId = (bug.developerId || bug.developer || "Unassigned")
      .toString()
      .trim()
      .toUpperCase();
    const groupKey = `${projectName}||${developerId}`;

    if (!acc[groupKey]) {
      acc[groupKey] = {
        projectName,
        developer: bug.developer || "Unassigned",
        developerId: bug.developerId || "N/A",
        bugs: [],
      };
    }
    acc[groupKey].bugs.push(bug);
    return acc;
  }, {});

  const acceptedProjectNamesSet = new Set(
    (acceptedSubmissions || [])
      .filter((s) => s.status === 'Accepted' || Boolean(s.claimedBy))
      .map((s) => (s.projectName || s.project_name || '').trim().toUpperCase())
      .filter(Boolean)
  );

  (acceptedSubmissions || [])
    .filter((s) => s.status === 'Accepted' || Boolean(s.claimedBy))
    .forEach((sub) => {
      const projName = (sub.projectName || sub.project_name || "").trim().toUpperCase();
      if (!projName) return;

      if (projectFilter && projName !== projectFilter.trim().toUpperCase()) return;

      const devName = sub.developer_name || sub.developerName || sub.developer || "Unassigned";
      const devId = sub.developer_id || sub.developerId || "DEV001";
      const groupKey = `${projName}||${devId.trim().toUpperCase()}`;

      if (!groupedProjects[groupKey]) {
        groupedProjects[groupKey] = {
          projectName: projName,
          developer: devName,
          developerId: devId,
          bugs: [],
          isAcceptedBuild: true,
          version: sub.version || 'v0.1',
        };
      }
    });

  Object.keys(groupedProjects).forEach((key) => {
    const proj = groupedProjects[key];
    const isAccepted = acceptedProjectNamesSet.has(proj.projectName.trim().toUpperCase());
    if (!isAccepted) {
      delete groupedProjects[key];
    }
  });

  return (
    <div className="max-w-7xl mx-auto space-y-4 font-sans text-gray-800 antialiased p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bug className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">My Bug Reports</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Filter, inspect, and trace assigned engineering tickets grouped by project.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
        >
          + New Project
        </button>
      </div>

      {projectFilter && (
        <div className="bg-blue-50 border border-blue-100 text-blue-800 p-3 rounded-lg flex items-center justify-between gap-4">
          <div className="text-sm">
            <strong>Project filter applied:</strong> {projectFilter}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                localStorage.removeItem("project_filter");
                setProjectFilter("");
                loadBugs();
              }}
              className="px-3 py-1 text-sm font-semibold bg-white border border-blue-100 rounded hover:bg-gray-50"
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-2xs border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label
            htmlFor="searchterm"
            className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5"
          >
            Search Logs
          </label>
          <div className="relative">
            <input
              id="searchterm"
              name="searchterm"
              type="text"
              placeholder="Search by ID, Title, Module, Dev..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <StatusFilterSelect
          id="statusfilter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />

        <div>
          <label
            htmlFor="devloperfilter"
            className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5"
          >
            Filter by Developer
          </label>
          <select
            id="devloperfilter"
            name="devloperfilter"
            value={developerFilter}
            onChange={(e) => setDeveloperFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          >
            {developersList.map((dev) => (
              <option key={dev} value={dev}>
                {dev === "All" ? "All Developers" : dev}
              </option>
            ))}
          </select>
        </div>
      </div>

      {Object.keys(groupedProjects).length > 0 ? (
        Object.entries(groupedProjects).map(([groupKey, group]) => {
          const projName = group.projectName;
          const projBugs = group.bugs;
          const developer = group.developer;
          const developerId = group.developerId;
          const isExpanded = expandedProjects[groupKey] === true;
          const totalBugs = projBugs.length;
          const savedBugsInProject = projBugs.filter(
            (b) => b.isSaved || b.status === "Saved",
          );
          const closedCount = projBugs.filter(
            (b) => b.status === "Closed",
          ).length;
          const openCount = projBugs.filter((b) => b.status === "Open").length;
          const allClosed = totalBugs > 0 && closedCount === totalBugs;
          const progressPct = 
            totalBugs > 0 ? Math.round((closedCount / totalBugs) * 100) : 0;
          const latestDate = projBugs[0]?.Assgined_Date || "Recently";

          return (
            <div
              key={groupKey}
              className={`bg-white rounded-2xl shadow-2xs border overflow-hidden transition-all duration-200 ${allClosed ? "border-emerald-300 ring-1 ring-emerald-200" : "border-gray-200 hover:border-blue-300"}`}
            >
              <button
                tabIndex={0}
                onClick={() => toggleProjectExpand(groupKey)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleProjectExpand(groupKey);
                  }
                }}
                className={`w-full p-5 cursor-pointer flex flex-col md:flex-row md:items-center items-start gap-4 transition-colors ${allClosed ? "bg-emerald-50/40 hover:bg-emerald-50/70 border-b border-emerald-200" : "bg-gradient-to-r from-gray-50/80 via-white to-gray-50/80 hover:bg-slate-50/80 border-b border-gray-200"}`}
              >
                <div className="flex items-center gap-3.5 min-w-0 w-full">
                  <div
                    className={`h-12 w-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-2xs ${allClosed ? "bg-emerald-100 border-emerald-300 text-emerald-700" : "bg-blue-50 border-blue-200 text-blue-600"}`}
                  >
                    {allClosed ? (
                      <CheckCircle2 size={24} className="text-emerald-600" />
                    ) : (
                      <FolderGit2 size={22} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-extrabold text-gray-900 uppercase tracking-tight truncate flex items-center gap-1.5">
                        {projName}
                        {allClosed && (
                          <CheckCircle2
                            size={16}
                            className="text-emerald-600 shrink-0"
                          />
                        )}
                      </h2>
                      <p
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${allClosed ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-blue-100 text-blue-800 border border-blue-200"}`}
                      >
                        {totalBugs} {totalBugs === 1 ? "Report" : "Reports"}
                      </p>
                      {savedBugsInProject.length > 0 && (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-extrabold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider animate-pulse">
                          {savedBugsInProject.length} Saved (Unsent)
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-1 w-full text-left flex items-center gap-2">
                      <Clock size={12} className="text-gray-400" />
                      <span className="truncate">
                        Assigned Developer:{" "}
                        <strong className="text-gray-700 uppercase">
                          {developer} ({developerId})
                        </strong>
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-700 font-medium">
                        Date:{" "}
                        <strong className="text-gray-700">{latestDate}</strong>
                      </span>
                    </p>

                    <div className="pt-2 hidden sm:flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddNewBugForProject(
                            projName,
                            projBugs[0]?.developer,
                            projBugs[0]?.developerId,
                          );
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-all cursor-pointer"
                        title={`Create new bug report for ${projName}`}
                      >
                        <Plus size={14} className="text-blue-600" /> + Add New Bug
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportProjectExcel(projName, projBugs);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-2xs transition-all cursor-pointer"
                        title={`Export Excel report for ${projName}`}
                      >
                        <FileSpreadsheet
                          size={14}
                          className="text-emerald-600"
                        />{" "}
                        Export Excel
                      </button>

                      {savedBugsInProject.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendSavedReportsForProject(
                              projName,
                              savedBugsInProject,
                            );
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                          title={`Send ${savedBugsInProject.length} saved report(s) to developer`}
                        >
                          <Send size={14} className="text-indigo-600" /> Send Saved Report ({savedBugsInProject.length})
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 md:ml-auto flex-shrink-0">

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"title={`opened bugs`}>
                        {openCount} Open
                      </span>
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"title={`closed bugs`}>
                        {closedCount} Closed
                      </span>
                    </div>
                    <div className="w-34 bg-gray-200 h-1.5 rounded-full overflow-hidden mt-2"title={`Bugs level`}>
                      <div
                        className={`h-full transition-all duration-500 ${allClosed ? "bg-emerald-500" : "bg-blue-600"}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleProjectExpand(groupKey);
                    }}
                    className={`inline-flex items-center gap-1 px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer ${allClosed ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                  >
                    <Eye size={15} />
                    {isExpanded ? "Close Table" : "View Table"}
                    {isExpanded ? (
                      <ChevronUp size={15} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>
                </div>
              </button>

              {isExpanded && (
                <div className="overflow-x-auto animate-in fade-in duration-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        <th className="px-3 py-2.5 w-28">Bug ID</th>
                        <th className="px-3 py-2.5">Title / Summary</th>
                        <th className="px-3 py-2.5">Tester</th>
                        <th className="px-3 py-2.5">Developer</th>
                        <th className="px-3 py-2.5 w-28">Start Date</th>
                        <th className="px-3 py-2.5 w-28">End Date</th>
                        <th className="px-3 py-2.5 w-36">Status</th>
                        <th className="px-3 py-2.5 w-32 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
                      {projBugs.map((bug) => {
                        const isClosed =
                          (bug.testerStatus || bug.status) === "Closed";
                        const isBugAuthor = (() => {
                          const bId = (bug.testerId || "").trim().toLowerCase();
                          const cId = currentTesterId
                            ? currentTesterId.trim().toLowerCase()
                            : "";
                          if (cId && bId && cId === bId) return true;

                          const bEmail = (bug.testerEmail || "")
                            .trim()
                            .toLowerCase();
                          const cEmail = currentTesterEmail
                            ? currentTesterEmail.trim().toLowerCase()
                            : "";
                          if (cEmail && bEmail && cEmail === bEmail)
                            return true;

                          const bName = (bug.testerName || "")
                            .trim()
                            .toLowerCase();
                          const cName = currentTesterName
                            ? currentTesterName.trim().toLowerCase()
                            : "";
                          if (cName && bName && cName === bName) return true;

                          return false;
                        })();

                        return (
                          <tr
                            key={bug.id}
                            className={`transition-all duration-300 ${
                              bug.devResolved
                                ? "bg-emerald-50/85 hover:bg-emerald-100/95 shadow-[0_0_12px_rgba(16,185,129,0.45)] border-l-4 border-l-emerald-500 font-medium"
                                : "hover:bg-blue-50/40"
                            }`}
                          >
                            <td
                              className={`px-3 py-2.5 font-mono font-bold text-gray-900 ${isClosed ? "line-through text-red-500 opacity-75" : ""}`}
                            >
                              {bug.id}
                            </td>
                            <td className="px-3 py-2.5 max-w-xs sm:max-w-md break-words break-all">
                              <span
                                className={`font-bold text-gray-900 block break-words break-all leading-snug ${isClosed ? "line-through text-red-500 opacity-75" : ""}`}
                              >
                                {bug.title}
                              </span>
                              {bug.description && (
                                <p className="text-[11px] text-gray-600 mt-1 break-words break-all line-clamp-2 leading-relaxed">
                                  {bug.description}
                                </p>
                              )}
                              <span className="text-[10px] text-gray-500 font-medium block mt-1">
                                Module: {bug.module}
                              </span>
                            </td>
                            <td
                              className={`px-3 py-2.5 text-gray-800 font-semibold uppercase ${isClosed ? "line-through text-red-500 opacity-75" : ""}`}
                            >
                              {bug.testerName || "Kamatchi"}{" "}
                              <span className="text-[10px] text-gray-400 font-normal">
                                ({bug.testerId || "TST201"})
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-800 font-semibold uppercase">
                              {bug.developer}{" "}
                              <span className="text-[10px] text-gray-400 font-normal">
                                ({bug.developerId || "N/A"})
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-600 font-mono">
                              {formatDateStandard(bug.Assgined_Date || bug.assignedOn)}
                            </td>
                            <td className="px-3 py-2.5 text-gray-600 font-mono">
                              {formatDateStandard(bug.endDate || bug.dueDate)}
                            </td>

                            <td className="px-3 py-2.5">
                              {isBugAuthor ? (
                                <select
                                  value={bug.status || "Open"}
                                  title={!canCloseBug(bug) ? "Developer must resolve this bug before it can be closed by tester" : ""}
                                  onChange={(e) =>
                                    handleTesterStatusChange(
                                      bug.rawId || bug.id || bug.bugId,
                                      e.target.value,
                                    )
                                  }
                                  className={`w-auto px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer outline-none ${getStatusBadgeStyle(bug.status)}`}
                                >
                                  {bug.status !== "Open" &&
                                    bug.status !== "Closed" &&
                                    bug.status !== "Not Fixed" && (
                                      <option value={bug.status}>
                                        {bug.status}
                                      </option>
                                    )}
                                  <option value="Open">Open</option>
                                  <option
                                    value="Closed"
                                    disabled={!canCloseBug(bug)}
                                    title="Developer Not Resolved ..."
                                  >
                                    Closed
                                  </option>
                                  <option value="Not Fixed">Not Fixed</option>
                                </select>
                              ) : (
                                <span
                                  title={`Only the reporting tester (${bug.testerName || "Author"}) can change this status`}
                                  className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-lg border cursor-not-allowed opacity-90 ${getStatusBadgeStyle(bug.status)}`}
                                >
                                  {bug.status || "Open"}
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleOpenDetails(bug)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                >
                                  <Eye size={13} /> Details
                                </button>
                                {isBugAuthor && (
                                  <>
                                    <button
                                      onClick={() => handleEditBug(bug)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                      title="Edit Bug Report"
                                    >
                                      <FileText size={13} /> Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteBug(bug.rawId)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                      title="Delete Bug Report"
                                    >
                                      <Trash2 size={13} /> Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="bg-white rounded-2xl shadow-2xs border border-gray-200 p-12 text-center text-gray-400">
          <Bug size={48} className="mx-auto text-gray-300 stroke-1 mb-2" />
          <p className="font-semibold text-sm text-gray-700">
            No bug reports logged.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Fill out the Report Form to submit a bug and populate this list.
          </p>
        </div>
      )}

      <div className="p-4 bg-gray-50 flex justify-between items-center text-xs font-medium text-gray-500 rounded-2xl border border-gray-200">
        <span>
          Showing {filteredBugs.length} of {bugs.length} recorded entries
        </span>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 transition-all duration-300">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden transform scale-100 transition-all duration-300 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                Add New Bug Report
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="projectname"
                  className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider"
                >
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="projectname"
                  name="projectname"
                  required
                  placeholder="e.g. Authentication"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 focus:bg-white"
                />
              </div>
              <div>
                <label
                  htmlFor="testname"
                  className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider"
                >
                  Test Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  id="testname"
                  name="testname"
                  placeholder="e.g. John Doe"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer"
                >
                  Add new project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingBug && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto flex flex-col border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-150 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeStyle(viewingBug.status)}`}
                >
                  {viewingBug.status}
                </span>
                <h3 className="font-bold text-gray-900 text-sm truncate uppercase tracking-wider">
                  {viewingBug.id} - {viewingBug.module} - Bug Details
                </h3>
              </div>
              <button
                onClick={() => setViewingBug(null)}
                className="text-gray-400 hover:text-gray-655 font-bold text-lg p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Bug Title
                </h4>
                <p className="text-sm font-bold text-gray-900 mt-0.5 break-words break-all leading-snug">
                  {viewingBug.title}
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Description
                </h4>
                <p className="text-gray-700 mt-1 bg-gray-50 p-2.5 rounded border border-gray-200 whitespace-pre-wrap break-words break-all leading-relaxed max-h-48 overflow-y-auto">
                  {viewingBug.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Reported By & Developer
                  </h4>
                  <p className="text-gray-800 mt-1.5 font-medium">
                    Tester:{" "}
                    <strong className="text-blue-700 uppercase">
                      {viewingBug.testerName || "Kamatchi"} (
                      {viewingBug.testerId || "TST201"})
                    </strong>
                  </p>
                  <p className="text-gray-800 mt-1 font-medium">
                    Developer:{" "}
                    <strong className="text-gray-800 uppercase">
                      {viewingBug.developer} ({viewingBug.developerId || "N/A"})
                    </strong>
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Timeline
                  </h4>
                  <p className="text-gray-800 mt-1.5 font-medium">
                    Assigned On:{" "}
                    <strong className="text-gray-700">
                      {viewingBug.Assgined_Date}
                    </strong>
                  </p>
                  <p className="text-gray-800 mt-1 font-medium">
                    Due Date:{" "}
                    <strong className="text-gray-700">
                      {viewingBug.endDate}
                    </strong>
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Bug Classification
                  </h4>
                  <p className="text-gray-800 mt-1.5 font-medium">
                    Severity:{" "}
                    <span className="font-bold text-gray-700 uppercase">
                      {viewingBug.severity}
                    </span>
                  </p>
                  <p className="text-gray-800 mt-1 font-medium">
                    Type:{" "}
                    <span className="font-bold text-indigo-600">
                      {viewingBug.bugType}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Steps to Reproduce
                </h4>
                <div className="text-gray-700 mt-1 bg-gray-50 p-2.5 rounded border border-gray-200">
                  {(() => {
                    const text = viewingBug?.stepsText || viewingBug?.steps_text || viewingBug?.steps_to_reproduce || "";
                    if (!text.trim()) {
                      return (
                        <span className="text-gray-400 italic">
                          No reproduction steps provided.
                        </span>
                      );
                    }
                    const lines = text
                      .split(/\r?\n/)
                      .map((l) => l.trim())
                      .filter((l) => l.length > 0);
                    if (lines.length === 0) {
                      return (
                        <span className="text-gray-400 italic">
                          No reproduction steps provided.
                        </span>
                      );
                    }
                    return (
                      <ol className="list-decimal pl-5 space-y-1.5 text-gray-800 font-medium">
                        {lines.map((line, idx) => {
                          const cleaned = line.replace(/^[-*•\d+.]\s*/, "");
                          return <li key={`step-${idx}`}>{cleaned}</li>;
                        })}
                      </ol>
                    );
                  })()}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Attached Screenshots & Files
                </h4>
                {viewingBug.files?.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {viewingBug.files.map((file, fIdx) => {
                      const fileSrc = file.preview || file.url || (typeof file === "string" ? file : "");
                      const fileName = file.name || (typeof file === "string" ? file : `Attachment_${fIdx + 1}`);
                      return (
                        <div
                          key={file.id || fIdx}
                          className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-100 h-20 w-20 shrink-0 shadow-2xs group flex flex-col items-center justify-center p-1"
                        >
                          {fileSrc ? (
                            <a
                              href={fileSrc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full h-full"
                              title={`View ${fileName}`}
                            >
                              <img
                                src={fileSrc}
                                alt={fileName}
                                className="w-full h-full object-cover hover:scale-105 transition-transform"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = "flex";
                                  }
                                }}
                              />
                              <div className="hidden flex-col items-center justify-center w-full h-full p-1 text-center bg-gray-50">
                                <FileText size={18} className="text-blue-600 mb-1" />
                                <span className="text-[9px] font-semibold text-gray-700 truncate w-full">
                                  {fileName}
                                </span>
                              </div>
                            </a>
                          ) : (
                            <div className="flex flex-col items-center justify-center w-full h-full p-1 text-center">
                              <FileText size={18} className="text-blue-600 mb-1" />
                              <span className="text-[9px] font-semibold text-gray-700 truncate w-full">
                                {fileName}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-xs">No screenshots or files attached.</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-150 flex justify-end bg-gray-50/50">
              <button
                onClick={() => setViewingBug(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Close Report Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {editingBug && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-150 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded uppercase">
                  Edit Mode
                </span>
                <h3 className="font-bold text-gray-900 text-sm truncate uppercase tracking-wider">
                  {editingBug.id} - Edit Bug Report
                </h3>
              </div>
              <button
                onClick={() => setEditingBug(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label
                  htmlFor="bugtitle"
                  className="block text-xs font-semibold text-gray-600 mb-1"
                >
                  Bug Title <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="bugtitle"
                  name="bugtitle"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 break-words break-all leading-snug resize-y"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="editdescription"
                  className="block text-xs font-semibold text-gray-600 mb-1"
                >
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="editdescription"
                  name="editdescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 resize-y"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="editseverity"
                    className="block text-xs font-semibold text-gray-600 mb-1"
                  >
                    Severity <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="editseverity"
                    name="editseverity"
                    value={editSeverity}
                    onChange={(e) => setEditSeverity(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800"
                  >
                    <option value="Blocker">Blocker</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="bugtype"
                    className="block text-xs font-semibold text-gray-600 mb-1"
                  >
                    Bug Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="bugtype"
                    name="bugtype"
                    value={editBugType}
                    onChange={(e) => setEditBugType(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800"
                  >
                    <option value="Functional">Functional</option>
                    <option value="UI/UX">UI/UX</option>
                    <option value="Performance">Performance</option>
                    <option value="Security">Security</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="stepreproduce"
                  className="block text-xs font-semibold text-gray-600 mb-1"
                >
                  Steps to Reproduce
                </label>
                <textarea
                  name="stepreproduce"
                  id="stepreproduce"
                  value={editStepsText}
                  onChange={(e) => setEditStepsText(e.target.value)}
                  onKeyDown={handleEditStepsKeyDown}
                  onFocus={handleEditStepsFocus}
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 resize-y"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setEditingBug(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Mybugreport;