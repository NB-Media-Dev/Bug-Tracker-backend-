import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Bug ID formatters
// ---------------------------------------------------------------------------
export const getProjectAcronym = (projectName) => {
  if (!projectName?.trim()) return "PRJ";
  const clean = projectName.trim().replace(/[^a-zA-Z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words.map((w) => w[0]).join("").toUpperCase();
  }
  const word = words[0];
  if (word.length <= 4) return word.toUpperCase();
  return word.slice(0, 2).toUpperCase();
};

export const formatBugId = (b, projectIndex = null) => {
  if (!b) return "PRJ-001";
  if (typeof b === "string" || typeof b === "number") {
    const str = String(b);
    if (!str.toUpperCase().startsWith("BUG-") && !str.toUpperCase().startsWith("BUG_") && !str.startsWith("SAVED-")) {
      return str;
    }
    const numStr = str.replace(/\D/g, "");
    const seq = numStr ? String(parseInt(numStr, 10)).padStart(3, "0") : "001";
    return `PRJ-${seq}`;
  }

  const proj = b.module || b.project_name || b.projectName || "General";
  const acronym = getProjectAcronym(proj);

  if (projectIndex !== null && projectIndex !== undefined) {
    const seq = String(projectIndex + 1).padStart(3, "0");
    return `${acronym}-${seq}`;
  }

  const raw = String(b.bugId || b.bug_id || "");
  if (raw && !raw.toUpperCase().startsWith("BUG-") && !raw.toUpperCase().startsWith("BUG_") && !raw.startsWith("SAVED-")) {
    return raw;
  }

  const numStr = String(b.id || b.rawId || raw || "1").replace(/\D/g, "");
  const seq = numStr ? String(parseInt(numStr, 10)).padStart(3, "0") : "001";
  return `${acronym}-${seq}`;
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

  if (message.startsWith("Project:") || message.toLowerCase().includes("| status:")) {
    const parts = message.split("|");
    const pName = (projectName && projectName !== "General" ? projectName : parts[0].replace(/Project:/i, "").trim()).toUpperCase();
    
    let pct = 0;
    if (Array.isArray(bugsList) && bugsList.length > 0) {
      const projBugs = bugsList.filter(b => (b.module || b.project_name || "").trim().toUpperCase() === pName);
      if (projBugs.length > 0) {
        const closed = projBugs.filter(b => ['Closed', 'Resolved'].includes((b.status || b.testerStatus || '').toString())).length;
        pct = Math.round((closed / projBugs.length) * 100);
      } else {
        pct = 100;
      }
    } else {
      pct = message.toLowerCase().includes("completed") ? 100 : 0;
    }
    return `${pName} progress is ${pct}%`;
  }

  return message.replace(/(\[?BUG-(\d+)\]?)/gi, (match, fullMatch, num) => {
    const formatted = formatBugId({ id: num, module: projectName });
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

// ---------------------------------------------------------------------------
// Standard Date Formatter for consistent Start Date / End Date displays
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Normalize a raw API bug object into the standard shape used across all pages
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Download a URL as a file via a temporary <a> tag  (blob or encoded-URI)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Escape a field for CSV export
// ---------------------------------------------------------------------------
export const escapeCSV = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replaceAll('"', '""');
  return `"${str}"`;
};

// ---------------------------------------------------------------------------
// Build a CSV data-URI and trigger a download
// ---------------------------------------------------------------------------
export const downloadCsv = (headers, rows, filename) => {
  const csvContent =
    "data:text/csv;charset=utf-8,\uFEFF" +
    [headers.join(","), ...rows.map((r) => r.map(escapeCSV).join(","))].join("\n");
  downloadFile(encodeURI(csvContent), filename);
};

// ---------------------------------------------------------------------------
// Navigation helper — uses onNavigate callback if provided, else popstate
// ---------------------------------------------------------------------------
export const navigateTo = (path, onNavigate) => {
  if (typeof onNavigate === "function") {
    onNavigate(path);
  } else {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
};

// ---------------------------------------------------------------------------
// Read tester info from localStorage (used by Mybugreport + HistoryReport)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Match a bug to a tester by id / email / name (used by HistoryReport)
// ---------------------------------------------------------------------------
export const matchesTester = (bug, testerName, testerEmail, testerId) => {
  const norm = (v) => (v || "").trim().toLowerCase();
  if (testerId && norm(bug.tester_id || bug.testerId) === norm(testerId)) return true;
  if (testerEmail && norm(bug.tester_email || bug.testerEmail) === norm(testerEmail)) return true;
  if (testerName && norm(bug.tester_name || bug.testerName) === norm(testerName)) return true;
  return false;
};

// ---------------------------------------------------------------------------
// Status badge styling (used across 5+ pages)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Render steps-to-reproduce text as a cleaned list
// ---------------------------------------------------------------------------
export const parseStepsText = (stepsText) => {
  if (!stepsText?.trim()) return [];
  return stepsText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((line) => line.replace(/^[-*•\d+.]\s*/, ""));
};
