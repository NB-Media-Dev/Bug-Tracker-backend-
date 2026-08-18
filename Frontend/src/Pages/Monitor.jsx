import React, { useState, useEffect } from "react";
import { Search, Eye, X, ExternalLink } from "lucide-react";
import { API_BASE, authFetch } from "../lib/api";

function Monitor() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [confirmGenerateProject, setConfirmGenerateProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [bugs, setBugs] = useState([]);

 const normalizeName = (name) =>
  (name || "")
    .toString()
    .replaceAll(/\([^()]*\)/g, "")
    .replaceAll(/\s+/g, " ")
    .trim()
    .toLowerCase(); 

const stripDeveloperIdFromName = (name) => {
  const raw = (name || "").toString().trim();
  let cleaned = raw;


  if (cleaned.endsWith(")")) {
    const open = cleaned.lastIndexOf("(");
    if (open !== -1) {
      cleaned = cleaned.slice(0, open).trim();
    }
  }

  
  cleaned = cleaned.replace(/\bDEV[-_ ]?\d+$/i, "").trim();

  return cleaned || raw;
};
    const isUrlValue = (value) => /^((https?:\/\/)|(www\.))/i.test((value || '').toString().trim());
const matchesBugToSubmission = (b, sub) => {
  const bugProject = (b.module || '').toString().trim().toUpperCase();
  const submissionProject = (sub.project || sub.project_name || '').toString().trim().toUpperCase();
  const bugDevId = (b.developerId || b.developer_id || '').toString().trim().toUpperCase();
  const subDevId = (sub.developerId || sub.developer_id || '').toString().trim().toUpperCase();
  const bugDevName = normalizeName(b.developerName || b.developer_name || '');
  const subDevName = normalizeName(sub.developer || sub.developer_name || '');

  let developerMatches = true;
  if (subDevId) {
    developerMatches = bugDevId === subDevId;
  } else if (subDevName) {
    developerMatches = bugDevName === subDevName;
  }

  return bugProject === submissionProject && developerMatches;
};

const getProjectBugs = (sub, allBugs = bugs) => {
  return allBugs.filter(b => matchesBugToSubmission(b, sub));
};

 
const mapSubmissionToProject = (sub, allBugs) => {
  const projectBugs = getProjectBugs(sub, allBugs);
  const hasOpenBugs = projectBugs.some(b => b.status !== 'Closed');

  const startDate = sub.date_submitted
    ? new Date(sub.date_submitted).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric"
      })
    : "N/A";

  const dueDates = projectBugs
    .map(b => b.due_date || b.dueDate)
    .filter(Boolean)
    .map(dStr => new Date(dStr));

  let endDate = "Not Set";

  if (dueDates.length > 0) {
    const maxDate = new Date(Math.max(...dueDates));
    endDate = maxDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  let displayStatus = "Open";

  if (
    sub.status === "Closed" ||
    (sub.claimed_by && projectBugs.length > 0 && !hasOpenBugs)
  ) {
    displayStatus = "Closed";
  }

  return {
    id: sub.id,
    project: sub.project_name,

    developer: stripDeveloperIdFromName(
      sub.developer_name || "Unknown Developer"
    ),

    developerId: (
      sub.developer_id ||
      sub.developerId ||
      "N/A"
    ).toString().toUpperCase(),

    // Tester name
    tester:
      sub.claimed_by ||
      sub.tester_name ||
      sub.testerName ||
      "Not Claimed",

    // Tester ID
    testerId: (
      sub.tester_id ||
      sub.testerId ||
      sub.claimed_by_id ||
      sub.claimedById ||
      "N/A"
    ).toString().toUpperCase(),

    startDate,
    endDate,
    status: displayStatus,
    subject: sub.subject || "No Subject/Notes",
    projectLink: sub.project_link
  };
};


  const loadData = async () => {
    try {
      const response = await authFetch(`${API_BASE}/api/bugs/submissions/`);
      if (!response.ok) return;

      const data = await response.json();

      const bugsRes = await authFetch(`${API_BASE}/api/bugs/`);
      let allBugs = [];
      if (bugsRes.ok) {
        allBugs = await bugsRes.json();
        setBugs(allBugs);
      }

      const mapped = data
        .filter(sub => !sub.id.startsWith("FIX-"))
        .map(sub => mapSubmissionToProject(sub, allBugs));

      setProjects(mapped);
    } catch (e) {
      console.error("Error loading monitor project submissions data", e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const generateProjectReport = (project) => {
    const projectBugs = getProjectBugs(project);
    if (!projectBugs.length) {
      alert(`No bug reports found for ${project.project || project.id}.`);
      return;
    }

    const headers = [
      'Bug ID',
      'Title',
      'Status',
      'Severity',
      'Project Name',
      'Project ID',
      'Developer Name',
      'Developer ID',
      'Tester Name',
      'Tester ID',
      'Assigned On',
      'Due Date'
    ];

    const rows = projectBugs.map((bug) => [
      bug.bug_id || bug.id,
      bug.title || '',
      bug.status || bug.testerStatus || '',
      bug.severity || '',
      project.project || project.project_name || '',
      project.id || '',
      bug.developer_name || bug.developerName || '',
      bug.developer_id || bug.developerId || '',
      bug.tester_name || bug.testerName || '',
      bug.tester_id || bug.testerId || '',
      bug.assigned_on || bug.assignedOn || '',
      bug.due_date || bug.dueDate || ''
    ]);

   const csvContent = '\uFEFF' + [  headers.join(','), ...rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
link.href = url;
link.download = `project-report-${(project.project || project.id || 'project').toString().replaceAll(/[^a-zA-Z0-9-_]/g, '_')}-${project.id}.csv`;
document.body.appendChild(link);
link.click();
link.remove();
URL.revokeObjectURL(url);

  };

  const filteredProjects = projects.filter((p) =>
    p.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.developer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tester.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
     
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-1 text-foreground">
            Monitor Project Management
          </h2>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Manage developer submissions, track project status, and toggle verification cycles.
          </p>
        </div>
      </div>

    
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-900">Project Monitoring Overview</div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 text-sky-700 px-3 py-1 text-[11px] font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> {projects.length} submissions
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-[11px] font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {bugs.length} total bugs
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-[11px] font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> {bugs.filter(b => (b.status || 'Open') === 'Open').length} open
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 text-slate-700 px-3 py-1 text-[11px] font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500" /> {bugs.filter(b => ['Closed','Resolved','Not Fixed'].includes((b.status || '').toString())).length} closed
            </span>
          </div>
        </div>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects by name, developer, tester..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-all"
          />
        </div>
      </div>

    
      <div className="bg-card border border-[var(--color-sidebar-border)] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200 uppercase tracking-wider">
                <th className="px-4 py-3 font-bold w-32">Project ID</th>
                <th className="px-4 py-3 font-bold">Project Name</th>
                <th className="px-4 py-3 font-bold w-56">Developer</th>
                <th className="px-4 py-3 font-bold w-48">Tester</th>
                <th className="px-4 py-3 font-bold w-20 text-center">Total</th>
                <th className="px-4 py-3 font-bold w-20 text-center">Open</th>
                <th className="px-4 py-3 font-bold w-20 text-center">Closed</th>
                <th className="px-4 py-3 font-bold w-28 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-sidebar-border)] text-gray-700 dark:text-gray-300">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[var(--color-muted-foreground)] italic text-sm">
                    No project submissions match your search query.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  const projectBugs = getProjectBugs(p);

                  const totalBugs = projectBugs.length;
                  const openCount = projectBugs.filter(b => (b.status || b.testerStatus || 'Open') === 'Open').length;
                  const closedCount = projectBugs.filter(b => ['Closed', 'Resolved', 'Not Fixed'].includes((b.status || b.testerStatus || '').toString())).length;

                  return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-[11px] text-slate-500 whitespace-nowrap">
                          {p.id}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white uppercase">
                          {p.project}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-200 truncate">
                          {p.developer}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-200 truncate">
                          {p.tester}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-900">{totalBugs}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center min-w-[2rem] rounded-full bg-blue-50 text-blue-700 px-2 py-1 text-[11px] font-semibold">
                            {openCount}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center min-w-[2rem] rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 text-[11px] font-semibold">
                            {closedCount}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedProject(p)}
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" /> Detail
                            </button>
                            <button
                              onClick={() => setConfirmGenerateProject(p)}
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              Generate
                            </button>
                          </div>
                        </td>
                      </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-[var(--color-sidebar-border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 bg-white dark:bg-slate-900">
            
     
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-sidebar-border)] bg-[var(--color-muted)]/30">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                  {selectedProject.id}
                </span>
                <h3 className="font-bold text-sm truncate max-w-[260px] text-gray-900 dark:text-white uppercase">
                  {selectedProject.project}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-1 rounded-lg hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

         
            <div className="p-5 space-y-4 text-xs">
              
         
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-[var(--color-muted-foreground)] block font-semibold uppercase tracking-wide">Developer Name</span>
                  <p className="font-extrabold text-sm text-gray-900 dark:text-white uppercase">{selectedProject.developer}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase tracking-wide">Developer ID</span>
                  <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100 uppercase">{selectedProject.developerId || 'N/A'}</p>
                </div>
                 <div className="p-3  bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-[var(--color-muted-foreground)] block font-semibold uppercase tracking-wide">Tester Assigned</span>
                <p className="font-extrabold text-sm text-blue-700 dark:text-blue-400 uppercase">{selectedProject.tester}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-800 rounded-xl space-y-1">
  <span className="text-[10px] text-[var(--color-muted-foreground)] block font-semibold uppercase tracking-wide">
    Tester ID
  </span>
  <p className="font-extrabold text-sm text-blue-700 dark:text-blue-400 uppercase">
    {selectedProject.testerId || "N/A"}
  </p>
</div>
              </div>

      
             
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase tracking-wide">Total Bugs</span>
                  <p className="mt-2 text-lg font-extrabold text-slate-900 dark:text-white">{getProjectBugs(selectedProject).length}</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <span className="text-[10px] text-blue-700 block font-semibold uppercase tracking-wide">Open Bugs</span>
                  <p className="mt-2 text-lg font-extrabold text-blue-900">{getProjectBugs(selectedProject).filter(b => (b.status || b.testerStatus || 'Open') === 'Open').length}</p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <span className="text-[10px] text-emerald-700 block font-semibold uppercase tracking-wide">Closed Bugs</span>
                  <p className="mt-2 text-lg font-extrabold text-emerald-900">{getProjectBugs(selectedProject).filter(b => ['Closed', 'Resolved', 'Not Fixed'].includes((b.status || b.testerStatus || '').toString())).length}</p>
                </div>
              </div>

              {selectedProject.subject && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase tracking-wide">Admin Notes</span>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{selectedProject.subject}</p>
                </div>
              )}

              {selectedProject.projectLink && (
                <div className="pt-2">
                  <span className="text-[10px] text-[var(--color-muted-foreground)] block font-semibold mb-1">Project Link / URL</span>
                  {isUrlValue(selectedProject.projectLink) ? (
                    <a
                      href={selectedProject.projectLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-[11px] break-all font-semibold"
                    >
                      {selectedProject.projectLink} <ExternalLink size={12} />
                    </a>
                  ) : (
                    <p className="font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all">
                      {selectedProject.projectLink}
                    </p>
                  )}
                </div>
              )}

            </div>

           
            <div className="p-3 border-t border-[var(--color-sidebar-border)] bg-[var(--color-muted)]/20 flex justify-end">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {confirmGenerateProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 space-y-4">
            <div className="text-left">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Confirm Export</p>
              <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">Generate report for this project?</h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Project: <span className="font-semibold text-slate-800 dark:text-slate-200">{confirmGenerateProject.project}</span>
                <br />
                Project ID: <span className="font-semibold text-slate-800 dark:text-slate-200">{confirmGenerateProject.id}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmGenerateProject(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                No, cancel
              </button>
              <button
                onClick={() => {
                  generateProjectReport(confirmGenerateProject);
                  setConfirmGenerateProject(null);
                }}
                className="flex-1 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                Yes, generate
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Monitor;
