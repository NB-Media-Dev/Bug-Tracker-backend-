
import { useState, useEffect } from "react";
import {
  Send,
  UploadCloud,
  Trash2,
  Layers,
  FileSpreadsheet,
  Eye,
  ArrowLeft,
  Save,
  Edit3,
} from "lucide-react";
import { getProjectPrefix } from "../../lib/theme";
import { API_BASE, authFetch } from "../../lib/api";
import { formatDateStandard, generateContinuousBugId, formatBugId } from "../../lib/utils";

function Reportform({ onNavigate }) {
  const [developerList, setDeveloperList] = useState([]);

  const [isDeveloperLocked, setIsDeveloperLocked] = useState(false);
  const [isProjectFixed, setIsProjectFixed] = useState(false);
  const [isReopenMode, setIsReopenMode] = useState(false);
  const [reopenBugId, setReopenBugId] = useState(null);
  const [editingBugId, setEditingBugId] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    severity: "critical",
    develper: "",
    module: "",
    dueDate: "",
    stepsText: "",
    bugType: "Functional",
    status: "Open",
  });
  const [selectedDeveloperId, setSelectedDeveloperId] = useState("");
  const [selectedDeveloperName, setSelectedDeveloperName] = useState("");

  const [allBugs, setAllBugs] = useState([]);
  const [projectSubmissions, setProjectSubmissions] = useState([]);
  const [files, setFiles] = useState([]);
  const [viewingBug, setViewingBug] = useState(null);
  const [submittedBugs, setSubmittedBugs] = useState([]);
  const [showBackModal, setShowBackModal] = useState(false);

  const collectAllUnpostedBugs = () => {
    let list = [...submittedBugs];
    if (formData.title?.trim() && formData.description?.trim()) {
      const { name: parsedDevName, id: parsedDevId } = parseDevString(
        formData.develper,
      );
      const {
        name: testerName,
        id: testerId,
        email: testerEmail,
      } = getTesterInfo();
      const normalizedModule = (formData.module || "General")
        .trim()
        .toUpperCase();

      const currentFormBug = {
        ...formData,
        module: normalizedModule,
        project_name: normalizedModule,
        projectName: normalizedModule,
        id: Date.now(),
        bugId: generateContinuousBugId(allBugs, submittedBugs, normalizedModule),
        testerName: testerName || "Tester",
        testerId: testerId || "TS001",
        testerEmail,
        developerName: parsedDevName,
        developerId: parsedDevId,
        assignedOn: formatDateStandard(new Date()),
        files: files.map((f) => ({ name: f.name, preview: f.preview })),
        isPosted: false,
      };
      list = [currentFormBug, ...list];
    }
    return list;
  };

  const navigateToMyBugReport = () => {
    window.dispatchEvent(
      new CustomEvent("tester_report_form_dirty", {
        detail: { isDirty: false },
      }),
    );
    if (onNavigate) {
      onNavigate("/tester/bugreport");
    } else {
      window.history.pushState({}, "", "/tester/bugreport");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const handleSendAllReports = async () => {
    const bugsToSend = collectAllUnpostedBugs();
    if (bugsToSend.length === 0) {
      alert("Please fill out or generate at least one bug report to send.");
      return;
    }

    for (const b of bugsToSend) {
      if (b.isPosted) continue;
      try {
        await authFetch('/api/bugs/', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bug_id: b.bugId,
            title: b.title,
            description: b.description,
            severity: b.severity,
            bug_type: b.bugType || "Functional",
            status: b.status || "Open",
            steps_text: b.stepsText || b.steps_text || "",
            stepsText: b.stepsText || b.steps_text || "",
            module: (b.module || "General").trim().toUpperCase(),
            files: b.files || [],
            tester_name: b.testerName || "Kamatchi",
            tester_id: b.testerId || "TS001",
            tester_email: b.testerEmail || "prasanna_tester@gmail.com",
            developer_name: b.developerName || b.develper || "Unassigned",
            developer_id: b.developerId || "DEV001",
            due_date: b.dueDate || null,
          }),
        });
      } catch (err) {
        console.error("Error posting bug to backend", err);
      }
    }

    alert("Report successfully sent to developers!");
    setSubmittedBugs([]);
    resetFormState(false);
    setShowBackModal(false);
    navigateToMyBugReport();
  };

  const handleSaveAllReports = () => {
    const bugsToSave = collectAllUnpostedBugs();
    if (bugsToSave.length === 0) {
      alert("Please fill out or generate at least one bug report to save.");
      return;
    }

    try {
      const existingStr = localStorage.getItem("saved_bug_reports");
      const existing = existingStr ? JSON.parse(existingStr) : [];
      const formattedBugs = bugsToSave.map((b) => ({
        ...b,
        isSaved: true,
        status: "Saved",
        savedAt: new Date().toISOString(),
      }));
      const updated = [...formattedBugs, ...existing];
      localStorage.setItem("saved_bug_reports", JSON.stringify(updated));
      window.dispatchEvent(new Event("saved_bugs_updated"));
      alert("Report successfully saved to your My Bug Reports page!");
    } catch (e) {
      console.error("Error saving reports to local storage", e);
    }

    setSubmittedBugs([]);
    resetFormState(false);
    setShowBackModal(false);
    navigateToMyBugReport();
  };

  const handleBackClick = () => {
    const unposted = collectAllUnpostedBugs();
    if (unposted.length > 0 || isFormDirty) {
      setShowBackModal(true);
    } else {
      if (onNavigate) {
        onNavigate("/tester/bugreport");
      }
    }
  };



  const resolveDeveloperSelection = (name, id, devList = []) => {
    const rawName = name?.trim() || "";
    const rawId = id?.trim() || "";

    if (rawName && rawId) {
      let cleanedName = rawName.trim();

      if (cleanedName.endsWith(")")) {
        const open = cleanedName.lastIndexOf("(");
        if (open !== -1) {
          cleanedName = cleanedName.slice(0, open).trim();
        }
      }

      return `${cleanedName} (${rawId})`;
    }

    if (rawName) {
      const match = devList.find(
        (dev) =>
          dev.name === rawName ||
          `${dev.name} (${dev.id})` === rawName ||
          dev.id === rawName,
      );
      if (match) {
        return `${match.name} (${match.id})`;
      }
      return rawName;
    }

    if (rawId) {
      const match = devList.find(
        (dev) => dev.id === rawId || dev.id === rawId.replace(/^DEV/i, ""),
      );
      if (match) {
        return `${match.name} (${match.id})`;
      }
      return rawId.startsWith("DEV") ? rawId : `DEV${rawId}`;
    }

    return "";
  };

  const loadAllBugs = async () => {
    try {
      const res = await authFetch('/api/bugs/');
      if (res.ok) {
        const data = await res.json();
        setAllBugs(data);
      }
    } catch (e) {
      console.error("Error loading all bugs in report form", e);
    }
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case "Critical":
      case "Blocker":
        return "bg-red-50 text-red-700 border border-red-200";
      case "High":
        return "bg-orange-50 text-orange-700 border border-orange-200";
      case "Medium":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      default:
        return "bg-blue-50 text-blue-700 border border-blue-200";
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Open":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "In Progress":
        return "bg-indigo-50 text-indigo-700 border border-indigo-200";
      case "Pending":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "Resolved":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "Not Fixed":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-300";
    }
  };

  const loadProjectSubmissions = async () => {
    try {
      const res = await authFetch('/api/bugs/submissions/');
      if (res.ok) {
        const data = await res.json();
        const items = data.results || (Array.isArray(data) ? data : []);
        setProjectSubmissions(items);
      }
    } catch (e) {
      console.error("Could not load project submissions from API", e);
    }
  };

  const loadDevelopers = async () => {
    try {
      const res = await authFetch('/api/users/?role=Developer');
      if (res.ok) {
        const data = await res.json();
        const devItems = data.results || (Array.isArray(data) ? data : []);
        if (devItems.length > 0) {
          const formatted = devItems.map((d) => ({
            id: d.employee_id || `DEV${String(d.id).padStart(3, "0")}`,
            name: d.name,
          }));
          setDeveloperList(formatted);
        }
      }
    } catch (e) {
      console.error("Could not load developers from API", e);
    }
  };

  const handleReopenData = (reopenData) => {
    try {
      const bug = JSON.parse(reopenData);
      setIsReopenMode(true);
      setReopenBugId(bug.rawId || bug.id);
      const cleanTitle = bug.title
        ? bug.title.replace(/^\[REOPENED\]\s*/, "")
        : "";
      let devSelection = bug.develper || "";
      if (!devSelection) {
        const dName = bug.developerName || bug.developer;
        if (dName) {
          devSelection = `${dName} (${bug.developerId || "EMP101"})`;
        }
      }
      if (devSelection && !devSelection.includes("(") && bug.developerId) {
        devSelection = `${devSelection} (${bug.developerId})`;
      }

      setFormData((prev) => ({
        ...prev,
        title: `[REOPENED] ${cleanTitle}`,
        description: bug.description || prev.description,
        severity: bug.severity || prev.severity,
        bugType: bug.bugType || prev.bugType,
        module: bug.module || prev.module,
        develper: devSelection,
        stepsText: bug.stepsText || prev.stepsText,
        status: "Reopen",
      }));
      setIsDeveloperLocked(true);
      setIsProjectFixed(true);
    } catch (e) {
      console.error("Error reading reopen_bug_data", e);
    }
    localStorage.removeItem("reopen_bug_data");
  };

  const handleAutofillData = () => {
    const rawProjName =
      localStorage.getItem("selected_project_name") || "General";
    let projName = rawProjName.trim();
    if (projName.endsWith(")")) {
      const open = projName.lastIndexOf("(");
      if (open !== -1) {
        projName = projName.slice(0, open).trim();
      }
    }
    projName ||= "General";

    const devName = localStorage.getItem("selected_developer_name");
    const devId = localStorage.getItem("selected_developer_id");
    const rawSelectedName = devName?.trim() || "";
    const rawSelectedId = devId?.trim() || "";
    setSelectedDeveloperId(rawSelectedId);
    setSelectedDeveloperName(rawSelectedName);

    const resolvedDev = resolveDeveloperSelection(
      rawSelectedName,
      rawSelectedId,
    );
    const hasAssignedDeveloper = rawSelectedName !== "" || rawSelectedId !== "";

    setFormData((prev) => ({
      ...prev,
      module: projName,
      develper: resolvedDev,
    }));
    setIsDeveloperLocked(hasAssignedDeveloper);
    setIsProjectFixed(true);

    if (!hasAssignedDeveloper) {
      localStorage.removeItem("selected_developer_name");
    }

    localStorage.removeItem("autofill_report_form");
    localStorage.removeItem("selected_project_name");
  };

  const availableProjects = Array.from(
    new Set([
      ...projectSubmissions
        .map((p) => (p.project_name || p.projectName || "").trim())
        .filter(Boolean),
      ...allBugs
        .map((b) => (b.module || b.project_name || b.projectName || "").trim())
        .filter(Boolean),
    ]),
  ).sort();

  const handleProjectSelect = (selectedProjName) => {
    const cleaned = (selectedProjName || "").trim();
    setFormData((prev) => ({
      ...prev,
      module: cleaned,
    }));

    if (cleaned) {
      const subMatch = projectSubmissions.find(
        (p) =>
          (p.project_name || p.projectName || "").trim().toLowerCase() ===
          cleaned.toLowerCase(),
      );
      if (subMatch) {
        const devName = subMatch.developer_name || subMatch.developerName || "";
        const devId = subMatch.developer_id || subMatch.developerId || "";
        if (devName || devId) {
          const resolvedDev = resolveDeveloperSelection(
            devName,
            devId,
            developerList,
          );
          if (resolvedDev) {
            setFormData((prev) => ({ ...prev, develper: resolvedDev }));
            setIsDeveloperLocked(true);
            setSelectedDeveloperName(devName);
            setSelectedDeveloperId(devId);
            return;
          }
        }
      }
    }
    setIsDeveloperLocked(false);
  };

  const isFormDirty = Boolean(
    (formData.title?.trim() !== "" ||
      formData.description?.trim() !== "" ||
      formData.stepsText?.trim() !== "" ||
      (formData.module?.trim() !== "" && !isProjectFixed) ||
      formData.develper?.trim() !== "" ||
      files.length > 0 ||
      (isReopenMode && formData.title?.trim() !== "") ||
      submittedBugs.some((b) => !b.isPosted)) &&
    !editingBugId,
  );

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("tester_report_form_dirty", {
        detail: { isDirty: isFormDirty },
      }),
    );

    const handleBeforeUnload = (e) => {
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved details in your bug report. If you leave, your entered bug details will be erased!";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.dispatchEvent(
        new CustomEvent("tester_report_form_dirty", {
          detail: { isDirty: false },
        }),
      );
    };
  }, [isFormDirty]);

  useEffect(() => {
    const handleClearDraft = () => {
      resetFormState(false);
      setSubmittedBugs([]);
      setIsReopenMode(false);
      setReopenBugId(null);
      setEditingBugId(null);
      setIsDeveloperLocked(false);
      setIsProjectFixed(false);
      setSelectedDeveloperId("");
      setSelectedDeveloperName("");
      localStorage.removeItem("reopen_bug_data");
      localStorage.removeItem("autofill_report_form");
      localStorage.removeItem("selected_project_name");
      localStorage.removeItem("selected_developer_name");
      localStorage.removeItem("selected_developer_id");
    };
    window.addEventListener("clear_tester_report_form_draft", handleClearDraft);
    return () =>
      window.removeEventListener(
        "clear_tester_report_form_draft",
        handleClearDraft,
      );
  }, []);

  useEffect(() => {
    loadAllBugs();
    loadDevelopers();
    loadProjectSubmissions();

    const reopenData = localStorage.getItem("reopen_bug_data");
    const autofill = localStorage.getItem("autofill_report_form");

    if (reopenData) {
      handleReopenData(reopenData);
    } else if (autofill === "true") {
      handleAutofillData();
    } else {
      setIsProjectFixed(false);
      setIsDeveloperLocked(false);
    }
  }, []);

  useEffect(() => {
    if (
      !developerList.length ||
      (!selectedDeveloperId && !selectedDeveloperName)
    )
      return;

    const resolvedDev = resolveDeveloperSelection(
      selectedDeveloperName,
      selectedDeveloperId,
      developerList,
    );

    if (resolvedDev && resolvedDev !== formData.develper) {
      setFormData((prev) => ({
        ...prev,
        develper: resolvedDev,
      }));
      setIsDeveloperLocked(true);
    }

    if (selectedDeveloperId) {
      const match = developerList.find((dev) => dev.id === selectedDeveloperId);
      if (match) {
        setSelectedDeveloperName(match.name);
        localStorage.setItem("selected_developer_name", match.name);
      }
    }
  }, [
    developerList,
    selectedDeveloperId,
    selectedDeveloperName,
    formData.develper,
  ]);

  const exportToExcel = () => {
    if (submittedBugs.length === 0) {
      alert("No bugs reported to export.");
      return;
    }

    const escapeCSV = (val) => {
      if (val == null) return "";
      return String(val).replaceAll('"', '""');
    };

    const headers = [
      "Bug ID",
      "Bug Title",
      "Description",
      "Severity",
      "Bug Type",
      "Module/Project Name",
      "Tester Name",
      "Developer Assigned",
      "Assigned On",
      "Due Date",
      "Steps to Reproduce",
      "Status",
      "Screenshots",
    ];

    const rows = submittedBugs.map((bug, index) => [
      escapeCSV(formatBugId(bug)),
      escapeCSV(bug.title),
      escapeCSV(bug.description),
      escapeCSV(bug.severity),
      escapeCSV(bug.bugType),
      escapeCSV(bug.module || "General"),
      escapeCSV(
        bug.testerName
          ? `${bug.testerName} (${bug.testerId || "TST201"})`
          : "Kamatchi (TST201)",
      ),
      escapeCSV(bug.develper),
      escapeCSV(
        bug.assignedOn ||
        new Date().toLocaleDateString("en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      ),
      escapeCSV(bug.dueDate || ""),
      escapeCSV(bug.stepsText),
      escapeCSV(bug.expectedResult),
      escapeCSV(bug.actualResult),
      escapeCSV(bug.status || "Open"),
      escapeCSV((bug.files || []).map((f) => f.name).join(", ") || "None"),
    ]);

    const csvContent =
      "\uFEFF" +
      [
        headers.join(","),
        ...rows.map((e) => e.map((val) => `"${val}"`).join(",")),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bug_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();

    setSubmittedBugs([]);

    alert(
      "Excel/CSV sheet generated and downloaded! Report successfully sent with Excel attachment.",
    );
    if (onNavigate) {
      onNavigate("/tester/bugreport");
    }
  };

  const getTesterInfo = () => {
    try {
      const testerUser = JSON.parse(
        localStorage.getItem("tester_user") || "{}",
      );
      const name = testerUser?.name || localStorage.getItem("test_name") || "";
      const email = testerUser?.company_email || "";
      const id =
        testerUser?.employee_id ||
        (testerUser?.id ? `TS${String(testerUser.id).padStart(3, "0")}` : "");
      return { name, id, email };
    } catch {
      return { name: "", id: "", email: "" };
    }
  };

  const parseDevString = (devStr = "") => {
    const str = devStr.trim();
    const openIdx = str.lastIndexOf("(");
    if (openIdx > 0 && str.endsWith(")")) {
      const name = str.slice(0, openIdx).trim();
      const id = str.slice(openIdx + 1, -1).trim();
      return { name, id };
    }
    return { name: str, id: "" };
  };

  const formatDeveloperSelection = (bug = {}) => {
    const rawDevelper = bug.develper || bug.developer || "";
    const providedName = bug.developerName || bug.developer_name || "";
    const providedId =
      bug.developerId ||
      bug.developer_id ||
      bug.assignedTo ||
      bug.assigned_to ||
      "";

    const trimmedDevelper = rawDevelper.toString().trim();
    const normalizedProvidedName = providedName.toString().trim();
    const normalizedProvidedId = providedId.toString().trim();

    if (trimmedDevelper.includes("(") && trimmedDevelper.includes(")")) {
      return trimmedDevelper;
    }

    if (normalizedProvidedName && normalizedProvidedId) {
      return `${normalizedProvidedName} (${normalizedProvidedId})`;
    }

    if (trimmedDevelper && normalizedProvidedId) {
      return `${trimmedDevelper} (${normalizedProvidedId})`;
    }

    return trimmedDevelper;
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && (i === 0 || line[i - 1] !== "\\")) {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result.map((s) => {
      let value = s;
      if (value.startsWith('"')) {
        value = value.slice(1);
      }
      if (value.endsWith('"')) {
        value = value.slice(0, -1);
      }
      return value.replaceAll('""', '"');
    });
  };

  const buildHeaderMap = (headerRow) => {
    const map = {};
    headerRow.forEach((h, idx) => {
      map[h.toLowerCase().replaceAll(/[^a-z0-9]/g, "")] = idx;
    });
    return map;
  };

  const getCSVVal = (headerMap, row, possibleKeys, defaultVal = "") => {
    for (const key of possibleKeys) {
      const idx = headerMap[key];
      if (idx !== undefined && row[idx]?.trim()) return row[idx].trim();
    }
    return defaultVal;
  };

  const getNextBugIdForProject = (project, localDrafts, dbBugs) => {
    const allBugsList = [...localDrafts, ...dbBugs];
    const currentProject = (project || "General")
      .toString()
      .trim()
      .toLowerCase();
    const projectBugs = allBugsList.filter((b) => {
      const bugProject =
        b.module || b.project_name || b.projectName || "General";
      return bugProject.toString().trim().toLowerCase() === currentProject;
    });

    let maxProjectBugNum = 0;
    projectBugs.forEach((b) => {
      if (b.projectBugNumber && typeof b.projectBugNumber === "number") {
        if (b.projectBugNumber > maxProjectBugNum)
          maxProjectBugNum = b.projectBugNumber;
      } else if (b.bugId || b.bug_id) {
        const bugIdStr = String(b.bugId || b.bug_id);
        const lastDash = bugIdStr.lastIndexOf("-");
        const numStr =
          lastDash !== -1 ? bugIdStr.slice(lastDash + 1) : bugIdStr;
        const num = Number.parseInt(numStr, 10);
        if (!Number.isNaN(num) && num > maxProjectBugNum) {
          maxProjectBugNum = num;
        }
      }
    });

    const nextProjectBugNum = maxProjectBugNum + 1;
    const projectPrefix = getProjectPrefix(currentProject);
    return {
      bugId: `${projectPrefix}-${nextProjectBugNum}`,
      projectBugNumber: nextProjectBugNum,
    };
  };

  const buildImportedBug = (
    row,
    headerMap,
    rowIndex,
    testerName,
    testerId,
    drafts,
    existingBugs,
  ) => {
    const get = (keys, def = "") => getCSVVal(headerMap, row, keys, def);

    const title = get(
      ["title", "bugtitle", "summary", "subject"],
      `Imported Bug #${rowIndex}`,
    );
    const description = get(
      ["description", "desc", "details", "summary"],
      title,
    );
    const severity = get(["severity"], "Major");
    const bugType = get(["bugtype", "type", "classification"], "Functional");
    const rawModule = get(
      ["projectname", "project", "module"],
      formData.module || "Authentication",
    );
    const module = rawModule.trim() || "General";
    const developer = get(
      ["developername", "developer", "assignedto"],
      formData.develper,
    );
    const stepsText = get(
      ["stepstoreproduce", "steps", "reproductionsteps"],
      "",
    );

    const { name: developerName, id: developerId } = parseDevString(developer);
    const { bugId, projectBugNumber } = getNextBugIdForProject(
      module,
      drafts,
      existingBugs,
    );

    const normalizedModule = module.toUpperCase();

    return {
      id: Date.now() + rowIndex,
      bugId,
      projectBugNumber,
      title,
      description,
      severity,
      bugType,
      dueDate: "",
      stepsText,
      module: normalizedModule,
      project_name: normalizedModule,
      projectName: normalizedModule,
      develper: developer,
      developerName,
      developerId: developerId || "DEV001",
      testerName,
      testerId,
      Assgined_Date: new Date().toLocaleDateString(),
      endDate: "",
      status: "Open",
      files: [],
      isPosted: false,
    };
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { name: rawTesterName, id: rawTesterId } = getTesterInfo();
    const testerName = rawTesterName || "Kamatchi";
    const testerId = rawTesterId || "TS001";

    const processCSVFile = async (text) => {
      if (!text) return;

      const lines = text.split(/\r\n|\n/).filter((l) => l.trim() !== "");
      if (lines.length <= 1) {
        alert("The uploaded Excel/CSV file is empty or missing data rows.");
        return;
      }

      let existingBugs = [];
      try {
        const res = await authFetch('/api/bugs/');
        if (res.ok) existingBugs = await res.json();
      } catch (err) {
        console.error("Error loading database bugs for import", err);
      }

      const headerMap = buildHeaderMap(parseCSVLine(lines[0]));
      const importedBugsList = [];

      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (!row.some((val) => val.trim())) continue;

        const drafts = [...submittedBugs, ...importedBugsList];
        const bug = buildImportedBug(
          row,
          headerMap,
          i,
          testerName,
          testerId,
          drafts,
          existingBugs,
        );
        importedBugsList.push(bug);
      }

      if (importedBugsList.length > 0) {
        setSubmittedBugs((prev) => [...importedBugsList, ...prev]);
        const first = importedBugsList[0];
        setFormData((prev) => ({
          ...prev,
          title: first.title,
          description: first.description,
          severity: first.severity,
          module: first.module,
          develper: first.develper,
          stepsText: first.stepsText,
          expectedResult: first.expectedResult,
          actualResult: first.actualResult,
        }));
        alert(
          `Successfully imported ${importedBugsList.length} bug report(s) from Excel/CSV sheet!`,
        );
      }
    };

    const text = await file.text();
    processCSVFile(text);
    e.target.value = "";
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStepsKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const bullet = "\n• ";
      const newValue = val.substring(0, start) + bullet + val.substring(end);

      setFormData((prev) => ({
        ...prev,
        stepsText: newValue,
      }));

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + bullet.length;
      }, 0);
    }
  };

  const handleStepsFocus = () => {
    if (!formData.stepsText?.trim()) {
      setFormData((prev) => ({
        ...prev,
        stepsText: "• ",
      }));
    }
  };

  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files || []);
    uploadedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Url = reader.result;
        const newFile = {
          id: Date.now() + Math.random(),
          name: file.name,
          preview: base64Url,
          url: base64Url,
          file,
        };
        setFiles((prev) => [...prev, newFile]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditPreviewBug = (bug) => {
    const selectedModule =
      bug.module || bug.project_name || bug.projectName || "";
    const devFormatted = formatDeveloperSelection(bug);
    const parsedDev = parseDevString(devFormatted);
    const parsedDevName =
      parsedDev.name || bug.developerName || bug.developer || "";
    const parsedDevId =
      parsedDev.id ||
      bug.developerId ||
      bug.developer_id ||
      bug.assignedTo ||
      bug.assigned_to ||
      "";

    const displayDeveloper =
      parsedDevName && parsedDevId
        ? `${parsedDevName} (${parsedDevId})`
        : devFormatted;

    setEditingBugId(bug.id || bug.rawId);
    setFormData({
      title: bug.title || "",
      description: bug.description || "",
      severity: bug.severity || "Low",
      develper: displayDeveloper,
      module: selectedModule,
      dueDate: bug.dueDate || bug.due_date || "",
      stepsText: bug.stepsText || bug.steps_text || "",
      bugType: bug.bugType || bug.bug_type || "Functional",
      status: bug.status || "Open",
    });
    setSelectedDeveloperName(parsedDevName);
    setSelectedDeveloperId(parsedDevId);
    setIsDeveloperLocked(true);
    setIsProjectFixed(true);

    if (bug.files) {
      setFiles(bug.files);
    }
  };

  const resetFormState = (keepProjectInfo = false) => {
    setFormData((prev) => ({
      title: "",
      description: "",
      severity: "critical",
      develper: keepProjectInfo ? prev.develper : "",
      module: keepProjectInfo ? prev.module : "",
      dueDate: "",
      stepsText: "",
      bugType: "Functional",
      status: "Open",
    }));
    setFiles([]);
  };

  const applyDraftEdit = (parsedDevName, parsedDevId) => {
    const developerSelection = parsedDevId
      ? `${parsedDevName} (${parsedDevId})`
      : parsedDevName;

    setSubmittedBugs((prev) =>
      prev.map((b) =>
        b.id === editingBugId || b.rawId === editingBugId
          ? {
            ...b,
            ...formData,
            module: formData.module,
            project_name: formData.module,
            projectName: formData.module,
            develper: developerSelection,
            developerName: parsedDevName,
            developerId: parsedDevId,
            files,
          }
          : b,
      ),
    );
    setEditingBugId(null);
    resetFormState(true);
  };

  const applyPostedEdit = async (parsedDevName, parsedDevId) => {
    const response = await authFetch(`/api/bugs/${editingBugId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        bug_type: formData.bugType,
        bugType: formData.bugType,
        steps_text: formData.stepsText,
        stepsText: formData.stepsText,
        files: files.map((f) => ({ name: f.name, preview: f.preview })),
        due_date: formData.dueDate || null,
        dueDate: formData.dueDate || null,
        develper: `${parsedDevName} (${parsedDevId})`,
        developer_name: `${parsedDevName} (${parsedDevId})`,
        developer_id: parsedDevId,
        developerId: parsedDevId,
        developerName: parsedDevName,
        module: formData.module,
        project_name: formData.module,
        projectName: formData.module,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      alert("Failed to update bug report: " + JSON.stringify(err));
      return;
    }

    const developerSelection = parsedDevId
      ? `${parsedDevName} (${parsedDevId})`
      : parsedDevName;

    alert("Bug report updated successfully!");
    setSubmittedBugs((prev) =>
      prev.map((b) =>
        b.id === editingBugId || b.rawId === editingBugId
          ? {
            ...b,
            ...formData,
            module: formData.module,
            project_name: formData.module,
            projectName: formData.module,
            develper: developerSelection,
            developerName: parsedDevName,
            developerId: parsedDevId,
            files,
          }
          : b,
      ),
    );
    setEditingBugId(null);
    resetFormState(true);
  };

  const handleEditSubmit = async (parsedDevName, parsedDevId) => {
    const targetDraft = submittedBugs.find(
      (b) => b.id === editingBugId || b.rawId === editingBugId,
    );
    if (targetDraft && !targetDraft.isPosted) {
      applyDraftEdit(parsedDevName, parsedDevId);
      return;
    }
    try {
      await applyPostedEdit(parsedDevName, parsedDevId);
    } catch (err) {
      console.error("Error updating bug:", err);
      alert("Error updating bug report. Please try again.");
    }
  };

  const handleReopenBugSubmit = async () => {
    try {
      const response = await authFetch(`/api/bugs/${reopenBugId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          severity: formData.severity,
          bug_type: formData.bugType,
          bugType: formData.bugType,
          steps_text: formData.stepsText,
          stepsText: formData.stepsText,
          files: files.map((f) => ({ name: f.name, preview: f.preview })),
          status: "Reopen",
          dev_status: "In Progress",
          devStatus: "In Progress",
        }),
      });
      if (response.ok) {
        alert("Bug report reopened and updated successfully!");
        if (onNavigate) {
          onNavigate("/tester/bugreport");
        } else {
          window.history.pushState({}, "", "/tester/bugreport");
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      } else {
        const err = await response.json();
        alert("Failed to reopen bug report: " + JSON.stringify(err));
      }
    } catch (err) {
      console.error("Error reopening bug:", err);
      alert("Error reopening bug report. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      alert("Please fill out all required fields.");
      return;
    }

    const { name: parsedDevName, id: parsedDevId } = parseDevString(
      formData.develper,
    );

    if (editingBugId) {
      await handleEditSubmit(parsedDevName, parsedDevId);
      return;
    }

    if (isReopenMode) {
      await handleReopenBugSubmit();
      return;
    }

    const normalizedModule = (formData.module || "General")
      .trim()
      .toUpperCase();

    let existingBugs = [];
    try {
      const res = await authFetch('/api/bugs/');
      if (res.ok) existingBugs = await res.json();
    } catch (err) {
      console.error("Error loading existing bugs for ID calculation", err);
    }

    const nextBugId = generateContinuousBugId(existingBugs, submittedBugs, normalizedModule);

    const {
      name: testerName,
      id: testerId,
      email: testerEmail,
    } = getTesterInfo();

    const newBug = {
      ...formData,
      module: normalizedModule,
      project_name: normalizedModule,
      projectName: normalizedModule,
      id: Date.now(),
      bugId: nextBugId,
      testerName: testerName || "Tester",
      testerId: testerId || "TS001",
      testerEmail,
      developerName: parsedDevName,
      developerId: parsedDevId,
      assignedOn: new Date().toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      files: files.map((f) => ({ name: f.name, preview: f.preview })),
      isPosted: false,
    };

    setSubmittedBugs((prev) => [newBug, ...prev]);
    resetFormState(true);
  };

  return (
    <div className="w-full font-sans text-gray-800 antialiased">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <button
            type="button"
            onClick={handleBackClick}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Bug Reports
          </button>
          {isReopenMode ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-purple-700 bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  Reopen Mode
                </span>
                {formData.module && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                    Project: {formData.module}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Reopen Bug Report
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Re-submitting and updating details for a reopened bug report.
              </p>
            </div>
          ) : (
            <div>
              {formData.module && (
                <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md uppercase tracking-wider mb-2 inline-block">
                  Project: {formData.module}
                </span>
              )}
              <h1 className="text-2xl font-bold text-gray-900">
                Report New Bugs
              </h1>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label
            htmlFor="excel"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={16} />
            Import Excel Sheet
            <input
              type="file"
              name="excel"
              id="excel"
              accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleImportExcel}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form className="lg:col-span-12 space-y-6" onSubmit={handleSubmit}>
          {editingBugId && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-amber-800">
                  Editing bug report. Click "Save Changes" at the bottom to
                  update, or cancel to reset.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingBugId(null);
                  resetFormState(true);
                }}
                className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Cancel Edit
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="font-bold text-gray-900 text-sm tracking-wide uppercase">
                  Bug Details
                </h2>
              </div>

              <div>
                <label
                  htmlFor="title"
                  className="block text-xs font-semibold text-gray-600 mb-1"
                >
                  Bug Title <span className="text-red-500">*</span>
                  {isReopenMode && (
                    <span className="ml-2 text-[10px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 uppercase">
                      [REOPENED] Prefix Protected
                    </span>
                  )}
                </label>
                <input
                  id="title"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (isReopenMode && !val.startsWith("[REOPENED] ")) {
                      val =
                        "[REOPENED] " + val.replaceAll(/^\[REOPENED\]\s*/, "");
                    }
                    handleInputChange({
                      target: { name: "title", value: val },
                    });
                  }}
                  placeholder="Short and descriptive title of the bug"
                  className={`w-full px-3 py-2 text-xs border rounded-lg transition-all text-gray-800 ${isReopenMode
                    ? "border-purple-300 bg-purple-50/20 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold text-purple-900"
                    : "border-gray-300 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-xs font-semibold text-gray-600 mb-1"
                >
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  id="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the bug in detail..."
                  maxLength={3000}
                  rows={4}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 resize-y"
                  required
                />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h2 className="font-bold text-gray-900 text-sm tracking-wide uppercase">
                  Steps to Reproduce
                </h2>
              </div>

              <div>
                <label
                  htmlFor="stepsText"
                  className="block text-xs font-semibold text-gray-600 mb-1.5"
                >
                  Steps to Reproduce <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="stepsText"
                  id="stepsText"
                  value={formData.stepsText}
                  onChange={handleInputChange}
                  onKeyDown={handleStepsKeyDown}
                  onFocus={handleStepsFocus}
                  placeholder="Provide step-by-step instructions to reproduce the bug..."
                  maxLength={2000}
                  rows={6}
                  className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-lg bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 resize-none font-medium"
                  required
                />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <h2 className="font-bold text-gray-900 text-sm tracking-wide uppercase">
                  Project & Environment
                </h2>
              </div>

              <div>
                <label
                  htmlFor="module"
                  className="block text-xs font-semibold text-gray-600 mb-1"
                >
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="module"
                  id="module"
                  value={formData.module}
                  disabled
                  readOnly
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-gray-100 font-bold text-gray-800 cursor-not-allowed uppercase"
                />
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="block text-xs font-semibold text-gray-600 mb-1"
                >
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  id="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800"
                >
                  <option value="Open">Open (Default)</option>
                </select>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full font-bold text-xs flex items-center justify-center">
                  4
                </span>
                <h2 className="font-bold text-gray-900 text-sm tracking-wide uppercase">
                  Classification & Assignee
                </h2>
              </div>

              <div>
                <label
                  htmlFor="severity"
                  className="block text-xs font-semibold text-gray-600 mb-1"
                >
                  Severity <span className="text-red-500">*</span>
                </label>
                <select
                  name="severity"
                  id="severity"
                  value={formData.severity}
                  onChange={handleInputChange}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800"
                >
                  <option value="Blocker">Blocker</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="bugType"
                    className="block text-xs font-semibold text-gray-600 mb-1"
                  >
                    Bug Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="bugType"
                    id="bugType"
                    value={formData.bugType}
                    onChange={handleInputChange}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800"
                  >
                    <option value="Functional">Functional</option>
                    <option value="UI/UX">UI/UX</option>
                    <option value="Performance">Performance</option>
                    <option value="Security">Security</option>
                    <option value="Maintainability">Maintainability</option>
                    <option value="Reliability">Reliability</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="devloper"
                    className="block text-xs font-semibold text-gray-600 mb-1"
                  >
                    Assign Developer <span className="text-red-500">*</span>
                  </label>
                  {isDeveloperLocked ? (
                    <input
                      type="text"
                      name="develper"
                      id="devloper"
                      value={
                        formData.develper ||
                        resolveDeveloperSelection(
                          selectedDeveloperName,
                          selectedDeveloperId,
                          developerList,
                        ) ||
                        "Selected Developer"
                      }
                      disabled
                      readOnly
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-gray-100 font-semibold text-gray-700 cursor-not-allowed"
                    />
                  ) : (
                    <select
                      name="develper"
                      id="devloper"
                      value={formData.develper}
                      onChange={handleInputChange}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800"
                      required
                    >
                      <option value="">Select Developer...</option>
                      {formData.develper &&
                        !developerList.some(
                          (dev) => `${dev.name} (${dev.id})` === formData.develper,
                        ) && (
                          <option value={formData.develper}>
                            {formData.develper}
                          </option>
                        )}
                      {developerList.map((dev) => {
                        const val = `${dev.name} (${dev.id})`;
                        return (
                          <option key={dev.id} value={val}>
                            {val}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="dueDate"
                  className="block text-xs font-semibold text-gray-600 mb-1"
                >
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dueDate"
                  id="dueDate"
                  value={formData.dueDate || ""}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-700"
                  required
                />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-3">
                  <UploadCloud size={18} className="text-blue-600" />
                  <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">
                    Screenshot (optional)
                  </h3>
                </div>

                <div className="space-y-3">
                  <label
                    htmlFor="file"
                    className="flex items-center justify-center gap-2 border border-gray-300 rounded-lg p-2.5 cursor-pointer hover:bg-gray-50 hover:border-blue-500 transition-colors bg-white shadow-2xs font-semibold text-xs text-gray-700"
                  >
                    <UploadCloud size={16} className="text-blue-600" />
                    <span>Upload Screenshot</span>
                    <input
                      type="file"
                      id="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {files.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-1 max-h-[100px] overflow-y-auto pr-1">
                      {files.map((file, idx) => (
                        <div
                          key={file.id || file.name}
                          className="relative group rounded border border-gray-200 overflow-hidden bg-gray-50 h-14"
                        >
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white rounded cursor-pointer"
                          >
                            <Trash2
                              size={12}
                              className="hover:text-red-400 transition-colors"
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 mt-auto">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {editingBugId ? (
                    <>
                      <Save size={14} />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Generate Bug
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 mt-8">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Layers className="text-blue-600" size={18} />
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">
              Reported Bugs ({submittedBugs.length})
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {submittedBugs.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleSendAllReports}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
                >
                  <Send size={12} /> Send Report
                </button>
                <button
                  type="button"
                  onClick={handleSaveAllReports}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
                >
                  <Save size={12} /> Save Report
                </button>
                <button
                  type="button"
                  onClick={exportToExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
                >
                  <FileSpreadsheet size={12} /> Send Report with Excel Sheet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedBugs([]);
                  }}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer ml-2"
                >
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>

        {submittedBugs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs italic">
            No bugs reported yet. Fill out the form above and submit to populate
            this list.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{}}></div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-700 text-[11px] font-semibold border-b border-gray-200 uppercase tracking-wider">
                  <th className="p-3">Bug ID</th>
                  <th className="p-3">Project</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Tester</th>
                  <th className="p-3">Developer</th>
                  <th className="p-3">Assigned On</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Screenshots</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {submittedBugs.map((bug, index) => (
                  <tr
                    key={bug.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="p-3 font-mono font-bold text-gray-500 whitespace-nowrap">
                      {formatBugId(bug)}
                    </td>
                    <td className="p-3 font-semibold text-blue-600 bg-blue-50/30">
                      <span className="text-[10px] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                        {bug.module ||
                          bug.project_name ||
                          bug.projectName ||
                          "General"}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-gray-900">{bug.title}</td>
                    <td
                      className="p-3 text-gray-600 max-w-xs truncate"
                      title={bug.description}
                    >
                      {bug.description}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusClass(bug.status)}`}
                      >
                        {bug.status || "Open"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold w-fit bg-red-50 text-red-700 border border-red-200">
                        {bug.severity}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {bug.bugType}
                      </span>
                    </td>
                    <td className="p-3 text-gray-900 font-semibold uppercase">
                      {bug.testerName || "Kamatchi"}{" "}
                      <span className="text-[10px] text-gray-400 font-normal">
                        ({bug.testerId || "TST201"})
                      </span>
                    </td>
                    <td className="p-3 text-gray-900 uppercase font-semibold">
                      {bug.develper ||
                        formatDeveloperSelection(bug) ||
                        "Unassigned"}
                    </td>
                    <td className="p-3 text-gray-900 whitespace-nowrap font-mono">
                      {formatDateStandard(bug.assignedOn || bug.assigned_on)}
                    </td>
                    <td className="p-3 text-gray-900 whitespace-nowrap font-mono">
                      {formatDateStandard(bug.dueDate || bug.due_date)}
                    </td>
                    <td className="p-3">
                      {bug.files?.length > 0 ? (
                        <div className="flex gap-1 overflow-x-auto max-w-[120px] py-1">
                          {bug.files.map((file) => (
                            <a
                              key={file.id || file.name}
                              href={file.preview}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative group shrink-0"
                            >
                              <img
                                src={file.preview}
                                alt={file.name}
                                className="w-8 h-8 rounded border border-gray-200 object-cover hover:scale-105 transition-transform"
                                title={file.name}
                              />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingBug(bug)}
                          className="text-gray-400 hover:text-blue-500 transition-colors p-1 cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditPreviewBug(bug)}
                          className="text-gray-400 hover:text-amber-500 transition-colors p-1 cursor-pointer"
                          title="Edit Bug Report"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = submittedBugs.filter(
                              (_, i) => i !== index,
                            );
                            setSubmittedBugs(updated);
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                          title="Delete Report"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formData.module && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 mt-8">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2">
              <Layers className="text-red-500 animate-pulse" size={18} />
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">
                Existing Bug Reports in {formData.module} (
                {
                  allBugs.filter(
                    (b) =>
                      (b.module || "General").trim().toLowerCase() ===
                      (formData.module || "").trim().toLowerCase(),
                  ).length
                }
                )
              </h3>
            </div>
          </div>

          {(() => {
            const projectBugs = allBugs.filter(
              (b) =>
                (b.module || "General").trim().toLowerCase() ===
                (formData.module || "").trim().toLowerCase(),
            );

            if (projectBugs.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500 text-xs italic">
                  No existing bug reports found for project "{formData.module}".
                </div>
              );
            }

            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700 text-[11px] font-semibold border-b border-gray-200 uppercase tracking-wider">
                      <th className="p-3 w-24">Bug ID</th>
                      <th className="p-3">Title</th>
                      <th className="p-3 w-64">Description</th>
                      <th className="p-3 w-28 text-center">Severity</th>
                      <th className="p-3 w-24 text-center">Status</th>
                      <th className="p-3 w-32">Developer</th>
                      <th className="p-3 w-32">Tester</th>
                      <th className="p-3 w-28">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {projectBugs.map((bug, index) => {
                      const seqIndex = projectBugs.length - 1 - index;
                      const bugIdStr = formatBugId(bug, seqIndex >= 0 ? seqIndex : index);
                      return (
                        <tr
                          key={bug.id}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="p-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                            {bugIdStr}
                          </td>
                          <td className="p-3 font-bold text-gray-900">
                            {bug.title}
                          </td>
                          <td
                            className="p-3 text-gray-600 max-w-xs truncate"
                            title={bug.description}
                          >
                            {bug.description}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityClass(bug.severity)}`}
                            >
                              {bug.severity}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusClass(bug.status)}`}
                            >
                              {bug.status || "Open"}
                            </span>
                          </td>
                          <td className="p-3 text-gray-800 font-semibold uppercase truncate">
                            {bug.developerName ||
                              bug.developer_name ||
                              "Unassigned"}
                          </td>
                          <td className="p-3 text-gray-800 font-semibold uppercase truncate">
                            {bug.testerName || bug.tester_name || "Tester"}
                          </td>
                          <td className="p-3 text-gray-600 font-mono whitespace-nowrap">
                            {bug.dueDate || bug.due_date || ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {viewingBug && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusClass(viewingBug.status)}`}
                >
                  {viewingBug.status || "Open"}
                </span>
                <h3 className="font-bold text-gray-900 text-sm truncate uppercase tracking-wider">
                  {viewingBug.bugId || "BUG-XXX"} -{" "}
                  {viewingBug.module ||
                    viewingBug.project_name ||
                    viewingBug.projectName ||
                    "General"}{" "}
                  - Bug Details
                </h3>
              </div>
              <button
                onClick={() => setViewingBug(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Bug Title
                </h4>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {viewingBug.title}
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Description
                </h4>
                <p className="text-gray-700 mt-1 bg-gray-50 p-2.5 rounded border border-gray-200 whitespace-pre-wrap">
                  {viewingBug.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Bug Classification
                  </h4>

                  <p className="text-gray-800 mt-1 font-medium">
                    Severity:{" "}
                    <span className="font-bold text-gray-700">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Assignee
                  </h4>
                  <p className="text-gray-800 mt-1.5 font-bold uppercase">
                    {viewingBug.develper ||
                      formatDeveloperSelection(viewingBug) ||
                      "Unassigned"}
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Due Date
                  </h4>
                  <p className="text-gray-800 mt-1.5 font-bold">
                    {viewingBug.dueDate || ""}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Steps to Reproduce
                </h4>
                <div className="text-gray-700 mt-1 bg-gray-50 p-2.5 rounded border border-gray-200">
                  {(() => {
                    const text = viewingBug.stepsText;
                    if (!text?.trim()) {
                      return (
                        <span className="text-gray-400 italic">
                          No reproduction steps provided.
                        </span>
                      );
                    }

                    const lines = text
                      .split(/\r?\n/)
                      .map((l) => l.trim())
                      .filter(Boolean);
                    if (lines.length === 0) {
                      return (
                        <span className="text-gray-400 italic">
                          No reproduction steps provided.
                        </span>
                      );
                    }
                    return (
                      <ul className="list-disc pl-5 space-y-1 text-gray-800 font-medium">
                        {lines.map((line) => {
                          const cleaned = line.replace(/^[*\-•\d+.]\s*/, "");
                          return <li key={`step-${cleaned}`}>{cleaned}</li>;
                        })}
                      </ul>
                    );
                  })()}
                </div>
              </div>

              {viewingBug?.files?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Attached Screenshots
                  </h4>
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {viewingBug.files.map((file) => (
                      <div
                        key={file.id || file.name}
                        className="relative rounded border border-gray-200 overflow-hidden bg-gray-100 h-16 w-16 shrink-0"
                      >
                        {file.preview ? (
                          <a
                            href={file.preview}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={file.preview}
                              alt={file.name}
                              className="w-full h-full object-cover hover:scale-105 transition-transform"
                            />
                          </a>
                        ) : (
                          <span className="text-[9px] text-gray-400 p-1 flex items-center justify-center h-full text-center truncate">
                            {file.name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end bg-gray-50/50">
              <button
                onClick={() => setViewingBug(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Close Detail View
              </button>
            </div>
          </div>
        </div>
      )}

      {showBackModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 text-left space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Save size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Unsent Bug Report
                </h3>
                <p className="text-xs text-gray-500">
                  You have generated bug report(s). Choose what to do before leaving.
                </p>
              </div>
            </div>

            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 space-y-1.5">
              <p className="font-bold text-amber-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                {collectAllUnpostedBugs().length} Bug Report(s) Pending Action
              </p>
              <div className="text-[11px] text-amber-800 space-y-1 pt-1 border-t border-amber-200/60">
                <p>
                  • <strong>Send Report:</strong> Sends directly to the assigned developer.
                </p>
                <p>
                  • <strong>Save Report:</strong> Saves to your "My Bug Report" page so you can send later.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBackModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAllReports}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Save size={14} /> Save Report
              </button>
              <button
                type="button"
                onClick={handleSendAllReports}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Send size={14} /> Send Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reportform;