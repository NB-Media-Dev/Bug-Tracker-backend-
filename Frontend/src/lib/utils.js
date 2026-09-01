import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const getProjectAcronym = (projectName) => {
  if (!projectName?.trim()) return "PRJ";
  const clean = projectName.trim().replace(/[^a-zA-Z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words.map((w) => w[0]).join("").toUpperCase();
  }
  const word = words[0];
  if (word.length <= 4) return word.toUpperCase();
  if (word.toLowerCase().startsWith("auth")) return "AUTH";
  return word.slice(0, 3).toUpperCase();
};

export const formatBugId = (b, projectIndex = null) => {
  if (!b) return "PRJ-001";

  const proj = (typeof b === "object" ? (b.module || b.project_name || b.projectName || "") : "") || "General";
  const acronym = getProjectAcronym(proj);

  if (projectIndex !== null && projectIndex !== undefined) {
    const seq = String(projectIndex + 1).padStart(3, "0");
    return `${acronym}-${seq}`;
  }

  if (typeof b === "string" || typeof b === "number") {
    const str = String(b).trim();
    const match = str.match(/^(?:([a-zA-Z0-9]+)-)?(\d+)$/);
    if (match) {
      const prefix = match[1] && !["BUG", "PRJ", "GE"].includes(match[1].toUpperCase()) ? match[1].toUpperCase() : acronym;
      const numVal = parseInt(match[2], 10);
      const seq = String((numVal > 100 && numVal <= 999 && numVal % 100 !== 0 ? numVal % 100 : numVal) || 1).padStart(3, "0");
      return `${prefix}-${seq}`;
    }
    return `${acronym}-001`;
  }

  const raw = String(b.bugId || b.bug_id || b.id || b.rawId || "").trim();
  if (raw) {
    const hyphenMatch = raw.match(/^([a-zA-Z0-9]+)-(\d+)$/);
    if (hyphenMatch) {
      const prefix = !["BUG", "PRJ", "GE"].includes(hyphenMatch[1].toUpperCase()) ? hyphenMatch[1].toUpperCase() : acronym;
      const numVal = parseInt(hyphenMatch[2], 10);
      const seq = String((numVal > 100 && numVal <= 999 && numVal % 100 !== 0 ? numVal % 100 : numVal) || 1).padStart(3, "0");
      return `${prefix}-${seq}`;
    }
    if (/^\d+$/.test(raw)) {
      const numVal = parseInt(raw, 10);
      const seq = String((numVal > 100 && numVal <= 999 && numVal % 100 !== 0 ? numVal % 100 : numVal) || 1).padStart(3, "0");
      return `${acronym}-${seq}`;
    }
  }

  return `${acronym}-001`;
};

export const generateContinuousBugId = (allExistingBugs = [], localDrafts = [], projectName = "General") => {
  const acronym = getProjectAcronym(projectName);
  const targetProj = (projectName || "General").trim().toUpperCase();

  const combined = [...(allExistingBugs || []), ...(localDrafts || [])];
  const projBugs = combined.filter((b) => {
    const p = (b.module || b.project_name || b.projectName || "General").trim().toUpperCase();
    return p === targetProj || getProjectAcronym(p) === acronym;
  });

  const count = projBugs.length;
  const nextSeq = String(count + 1).padStart(3, "0");
  return `${acronym}-${nextSeq}`;
};

export const formatNotificationMessage = (message, projectName = "General", bugsList = []) => {
  if (!message) return "";

  let cleaned = message;
  cleaned = cleaned.replace(/^Developer\s+/i, "");
  cleaned = cleaned.replace(/\(([A-Za-z0-9]+)\)\s*\(\1\)/gi, "($1)");

  const msgLower = cleaned.toLowerCase();
  if (
    cleaned.startsWith("Project:") ||
    msgLower.includes("| status:") ||
    msgLower.includes("progress is") ||
    msgLower.includes("fully completed")
  ) {
    let pName = (projectName && projectName !== "General" ? projectName : "").trim().toUpperCase();
    if (!pName) {
      const match = cleaned.match(/^([A-Za-z0-9_\-\s]+)\s+progress/i) || cleaned.match(/^Project\s+([A-Za-z0-9_\-\s]+)/i);
      if (match) {
        pName = match[1].trim().toUpperCase();
      } else {
        pName = cleaned.split(" ")[0].trim().toUpperCase();
      }
    }

    let pct = 0;
    let allClosed = false;
    let allResolved = false;

    if (Array.isArray(bugsList) && bugsList.length > 0) {
      const projBugs = bugsList.filter((b) => (b.module || b.project_name || "").trim().toUpperCase() === pName);
      if (projBugs.length > 0) {
        const closedCount = projBugs.filter((b) => (b.status || b.testerStatus || "").toString().toLowerCase() === "closed").length;
        const resolvedCount = projBugs.filter((b) => ["closed", "resolved", "fixed"].includes((b.status || b.testerStatus || "").toString().toLowerCase())).length;
        allClosed = closedCount === projBugs.length;
        allResolved = resolvedCount === projBugs.length;
        pct = Math.round((resolvedCount / projBugs.length) * 100);
      } else {
        pct = 0;
      }
    } else {
      const pctMatch = cleaned.match(/(\d+)%/);
      if (pctMatch) {
        pct = parseInt(pctMatch[1], 10);
      }
      allClosed = msgLower.includes("closed the project") || msgLower.includes("closed all bugs") || msgLower.includes("fully completed");
    }

    // ONLY when tester verified and closed all bugs:
    if (allClosed) {
      return `Project ${pName} fully completed (100% progress)`;
    }

    if (allResolved && pct === 100) {
      return `${pName} progress is 100% (Resolved by Developer)`;
    }

    return `${pName} progress is ${pct}%`;
  }

  return cleaned.replace(/(\[?([A-Z0-9]+-\d+|\bBUG-\d+|\bGE-\d+)\]?)/gi, (match, fullMatch, bugIdStr) => {
    const parts = bugIdStr.split("-");
    if (parts.length === 2 && parts[0] && !["BUG", "PRJ", "GE"].includes(parts[0].toUpperCase())) {
      const numVal = parseInt(parts[1], 10);
      const seq = !isNaN(numVal) ? String((numVal > 100 && numVal <= 999 && numVal % 100 !== 0 ? numVal % 100 : numVal) || 1).padStart(3, "0") : "001";
      const formattedId = `${parts[0].toUpperCase()}-${seq}`;
      return match.startsWith("[") ? `[${formattedId}]` : formattedId;
    }

    const lastPart = parts[parts.length - 1];
    const numVal = parseInt(lastPart, 10);
    const seq = !isNaN(numVal) ? String((numVal > 100 && numVal <= 999 && numVal % 100 !== 0 ? numVal % 100 : numVal) || 1).padStart(3, "0") : "001";
    const acronym = getProjectAcronym(projectName);
    const formatted = `${acronym}-${seq}`;
    if (match.startsWith("[")) {
      return `[${formatted}]`;
    }
    return formatted;
  });
};

export const normalizeFiles = (filesInput) => {
  if (!filesInput) return [];
  let rawList = filesInput;
  if (typeof filesInput === "string") {
    try {
      rawList = JSON.parse(filesInput);
    } catch {
      return [{ id: "file-0", name: filesInput, preview: filesInput, url: filesInput }];
    }
  }
  if (!Array.isArray(rawList)) return [];

  return rawList.map((item, idx) => {
    if (typeof item === "string") {
      return { id: `file-${idx}`, name: item, preview: item, url: item };
    }
    const name = item.name || item.fileName || item.file_name || item.filename || `Attachment_${idx + 1}`;
    const url = item.preview || item.url || item.path || item.src || item.link || "";
    return {
      id: item.id || `file-${idx}`,
      name,
      preview: url,
      url: url,
    };
  });
};

export const formatDateStandard = (dateVal) => {
  if (!dateVal || dateVal === "N/A" || dateVal === "null" || dateVal === "undefined") return "N/A";
  
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const normalizeBug = (b, fallbacks = {}) => {
  const formattedAssigned = formatDateStandard(b.assignedOn || b.assigned_on || new Date());
  const formattedDue = formatDateStandard(b.dueDate || b.due_date);

  return {
    id: formatBugId(b),
    bugId: formatBugId(b),
    rawId: b.id,
    title: b.title || "",
    description: b.description || "",
    module: (b.module || "General").trim().toUpperCase(),
    status: b.status || "Open",
    testerStatus: b.status || "Open",
    devStatus: b.status || "Open",
    developer: b.developerName || b.developer_name || "Unassigned",
    developerName: b.developerName || b.developer_name || "Unassigned",
    developerId: b.developerId || b.developer_id || "N/A",
    testerName: b.testerName || b.tester_name || fallbacks.testerName || "",
    testerId: b.testerId || b.tester_id || fallbacks.testerId || "",
    testerEmail: b.testerEmail || b.tester_email || fallbacks.testerEmail || "",
    Assgined_Date: formattedAssigned,
    assignedOn: formattedAssigned,
    dueDate: formattedDue,
    endDate: formattedDue,
    severity: b.severity || "Minor",
    bugType: b.bugType || b.bug_type || "Functional",
    stepsText: b.stepsText || b.steps_text || b.steps_to_reproduce || b.stepsToReproduce || "",
    files: normalizeFiles(b.files || b.attachments || b.screenshots),
    devResolved: b.devResolved || b.dev_resolved || false,
  };
};

export const downloadFile = (hrefOrBlob, filename) => {
  const url =
    hrefOrBlob instanceof Blob
      ? URL.createObjectURL(hrefOrBlob)
      : hrefOrBlob;

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();

  if (hrefOrBlob instanceof Blob) {
    URL.revokeObjectURL(url);
  }
};

export const escapeCSV = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replaceAll('"', '""');
  return `"${str}"`;
};

export const downloadCsv = (headers, rows, filename) => {
  const csvContent =
    "data:text/csv;charset=utf-8,\uFEFF" +
    [headers.join(","), ...rows.map((r) => r.map(escapeCSV).join(","))].join("\n");
  downloadFile(encodeURI(csvContent), filename);
};

export const navigateTo = (path, onNavigate) => {
  if (typeof onNavigate === "function") {
    onNavigate(path);
  } else {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
};

export const getTesterInfo = () => {
  try {
    const tUser = JSON.parse(localStorage.getItem("tester_user") || "{}");
    const name = tUser?.name || localStorage.getItem("test_name") || "";
    const email = tUser?.company_email || "";
    const id =
      tUser?.employee_id ||
      (tUser?.id ? `TS${String(tUser.id).padStart(3, "0")}` : "");
    return { name, email, id };
  } catch {
    return { name: "", email: "", id: "" };
  }
};

export const matchesTester = (bug, testerName, testerEmail, testerId) => {
  const norm = (v) => (v || "").trim().toLowerCase();
  if (testerId && norm(bug.tester_id || bug.testerId) === norm(testerId)) return true;
  if (testerEmail && norm(bug.tester_email || bug.testerEmail) === norm(testerEmail)) return true;
  if (testerName && norm(bug.tester_name || bug.testerName) === norm(testerName)) return true;
  return false;
};
export const matchesSubmissionTester = (sub, testerName, testerEmail, testerId) => {
  if (!sub) return false;
  const norm = (v) => (v || "").trim().toLowerCase();
  const claimedById = norm(sub.claimedById || sub.claimed_by_id);
  const claimedBy = norm(sub.claimedBy || sub.claimed_by);

  if (testerId && claimedById && claimedById === norm(testerId)) return true;
  if (testerName && claimedBy && claimedBy === norm(testerName)) return true;
  return false;
};
export const getDeveloperInfo = (propDeveloper = null) => {
  try {
    const dUser = JSON.parse(localStorage.getItem("developer_user") || "{}");
    const name = propDeveloper?.name || dUser?.name || localStorage.getItem("developer_name") || "";
    const email = propDeveloper?.email || dUser?.company_email || dUser?.email || "";
    const id =
      propDeveloper?.employee_id ||
      propDeveloper?.id ||
      dUser?.employee_id ||
      localStorage.getItem("developer_id") ||
      localStorage.getItem("developer_employee_id") ||
      (dUser?.id ? `DEV${String(dUser.id).padStart(3, "0")}` : "");
    return { name, email, id };
  } catch {
    return {
      name: propDeveloper?.name || "",
      email: propDeveloper?.email || "",
      id: propDeveloper?.employee_id || propDeveloper?.id || "",
    };
  }
};
export const matchesDeveloper = (bug, devName, devEmail, devId) => {
  if (!bug) return false;
  const norm = (v) => (v || "").toString().trim().toLowerCase();

  const bDevId = norm(bug.developer_id || bug.developerId || bug.developer_employee_id || bug.developerIdStr);
  const bDevEmail = norm(bug.developer_email || bug.developerEmail);
  const bDevName = norm(bug.developer_name || bug.developerName || bug.developer);

  const targetId = norm(devId);
  const targetEmail = norm(devEmail);
  const targetName = norm(devName);

  if (targetId && bDevId && (bDevId === targetId || bDevId.includes(targetId) || targetId.includes(bDevId))) return true;
  if (targetEmail && bDevEmail && bDevEmail === targetEmail) return true;
  if (targetName && bDevName && (bDevName === targetName || bDevName.includes(targetName) || targetName.includes(bDevName))) return true;

  return false;
};
export const formatSubmissionId = (sub) => {
  if (!sub) return "prj-001";
  const idStr = String(sub.id || sub.pk || "").trim();

  const rawProj = sub.project_name || sub.projectName || sub.project || "PRJ";
  const acronym = getProjectAcronym(rawProj).toLowerCase();

  const numMatch = idStr.match(/\d+$/);
  let seq = "001";
  if (numMatch) {
    const rawNum = parseInt(numMatch[0], 10);
    seq = String((rawNum % 100) || 1).padStart(3, "0");
  }

  return `${acronym}-${seq}`;
};
export const getStatusBadgeStyle = (status) => {
  switch (status) {
    case "Open":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "In Progress":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "Pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Resolved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Not Fixed":
      return "bg-red-50 text-red-700 border-red-200";
    case "Closed":
      return "bg-gray-100 text-gray-600 border-gray-300";
    default:
      return "bg-gray-100 text-gray-600 border-gray-300";
  }
};
export const parseStepsText = (stepsText) => {
  if (!stepsText?.trim()) return [];
  return stepsText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((line) => line.replace(/^[-*•\d+.]\s*/, ""));
};
export const truncateText = (text, maxWords = 20) => {
  if (!text) return "";
  const str = String(text).trim();
  if (!str) return "";
  const words = str.split(/\s+/);
  if (words.length <= maxWords) return str;
  return words.slice(0, maxWords).join(" ") + "...";
};

