import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Bug ID formatter
// ---------------------------------------------------------------------------
export const formatBugId = (b) => b.bugId || b.bug_id || `BUG-${b.id}`;

export const generateContinuousBugId = (allExistingBugs = [], localDrafts = []) => {
  let maxNum = 100;
  const combined = [...(allExistingBugs || []), ...(localDrafts || [])];

  combined.forEach((b) => {
    const idStr = String(b.bug_id || b.bugId || b.id || "");
    const match = idStr.match(/BUG-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  return `BUG-${maxNum + 1}`;
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
