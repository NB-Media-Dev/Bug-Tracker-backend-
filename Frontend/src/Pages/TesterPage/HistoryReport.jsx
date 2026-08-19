import { useState, useEffect } from 'react';
import { History, Eye, FileText, Clock, RefreshCw, FileSpreadsheet, CheckCircle2Icon } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import { normalizeBug, getTesterInfo, matchesTester, downloadFile, getStatusBadgeStyle } from '../../lib/utils';
import StatusFilterSelect from '../../components/shared/StatusFilterSelect';
import BugDetailModal from '../../components/shared/BugDetailModal';

const getProjectAcronym = (projectName) => {
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

function HistoryReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');
  const [viewingHistory, setViewingHistory] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);


  const loadHistoryLogs = async () => {
    const { name: testerName, email: testerEmail, id: testerId } = getTesterInfo();

    try {
      const queryParams = new URLSearchParams();
      if (testerId) queryParams.append("tester_id", testerId);
      if (testerEmail) queryParams.append("tester_email", testerEmail);
      if (testerName) queryParams.append("tester_name", testerName);

      const response = await fetch(`${API_BASE}/api/bugs/?${queryParams.toString()}`);
      if (!response.ok) return;

      const data = await response.json();
      const filteredData = data.filter(b => matchesTester(b, testerName, testerEmail, testerId));
      
      const projectBugCounts = {};
      const mapped = filteredData.map(b => {
        const norm = normalizeBug(b, { testerName, testerId, testerEmail });
        const projName = norm.module || "General";
        const acronym = getProjectAcronym(projName);
        projectBugCounts[acronym] = (projectBugCounts[acronym] || 0) + 1;
        const sequenceNum = String(projectBugCounts[acronym]).padStart(3, "0");
        const customBugId = `${acronym}-${sequenceNum}`;
        return {
          ...norm,
          bugId: customBugId,
          id: customBugId,
          originalBugId: norm.bugId || norm.id,
        };
      });
      setHistoryLogs(mapped);
    } catch (e) {
      console.error("Error loading history logs from API", e);
    }
  };

  useEffect(() => {
    loadHistoryLogs();
  }, []);

  
  const projectsList = ['All', ...new Set(historyLogs.map(log => log.module || 'General').filter(Boolean))];

  
  const filteredLogs = historyLogs.filter(log => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      log.bugId?.toLowerCase().includes(search) ||
      log.title?.toLowerCase().includes(search) ||
      log.developerName?.toLowerCase().includes(search) ||
      log.develper?.toLowerCase().includes(search) ||
      log.module?.toLowerCase().includes(search);

    const matchesStatus = statusFilter === 'All' || log.status === statusFilter || log.testerStatus === statusFilter || log.devStatus === statusFilter;
    const matchesProject = projectFilter === 'All' || log.module === projectFilter;

    return matchesSearch && matchesStatus && matchesProject;
  });


  const totalCount = historyLogs.length;
  const closedCount = historyLogs.filter(l => l.status === 'Closed' || l.testerStatus === 'Closed').length;
  const openCount = historyLogs.filter(l => l.status === 'Open' || l.testerStatus === 'Open').length;
  const resolvedCount = historyLogs.filter(l => l.devStatus === 'Resolved').length;

 
  const exportHistoryToCSV = () => {
    if (filteredLogs.length === 0) {
      alert("No history logs available to export.");
      return;
    }
    const headers = [
      "Bug ID", "Project Name", "Bug Title", "Description", "Severity",
      "Bug Type", "Tester Name", "Developer Assigned", "Developer ID",
      "Start Date (Assigned On)", "End Date (Due Date)", "Status", "Steps to Reproduce"
    ];
    const rows = filteredLogs.map(log => [
      log.bugId || `BUG-${log.id}`,
      log.module || "General",
      log.title,
      log.description,
      log.severity,
      log.bugType || "Functional",
      log.testerName ? `${log.testerName} (${log.testerId || 'N/A'})` : "N/A",
      log.developerName || log.develper,
      log.developerId || "N/A",
      log.assignedOn || "N/A",
      log.dueDate || "N/A",
      log.status || "Open",
      log.stepsText,
    ]);
    const blob = new Blob(
      ["\uFEFF" + [headers.join(","), ...rows.map(r => r.map(v => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","))].join("\n")],
      { type: "text/csv;charset=utf-8;" }
    );
    downloadFile(blob, `history_bug_report_${Date.now()}.csv`);
  };

  const bugTitle = viewingHistory? `${viewingHistory.bugId || 'BUG-' + viewingHistory.id} - History Detail`: '';  
  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 font-sans text-gray-800 antialiased">

    
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">History Report</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Comprehensive audit trail & historical bugs of all submitted bug reports.</p>
        </div>

        <button
          onClick={exportHistoryToCSV}
          className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <FileSpreadsheet size={16} /> Export History Excel Report
        </button>
      </div>

     
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Total Reports Bugs</span>
            <span className="text-2xl font-bold text-gray-900 mt-1 block">{totalCount}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <FileText size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Active Bugs</span>
            <span className="text-2xl font-bold text-blue-600 mt-1 block">{openCount}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Closed & Verified</span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">{closedCount}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2Icon size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Dev Resolved</span>
            <span className="text-2xl font-bold text-indigo-600 mt-1 block">{resolvedCount}</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <RefreshCw size={20} />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-200 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor='searchterm' className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Search History</label>
          <div className="relative">
            <input
              type="text"
              name='searchterm'
              id='searchterm'
              placeholder="Search by ID, Title, Project, Developer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs">
                âœ•
              </button>
            )}
          </div>
        </div>

        <div>
          <label htmlFor='projectfilter' className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Filter by Project</label>
          <select
          id='projectfilter'
          name='projectfilter'
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          >
            {projectsList.map(proj => (
              <option key={proj} value={proj}>{proj === 'All' ? 'All Projects' : proj}</option>
            ))}
          </select>
        </div>

        <StatusFilterSelect
          id="statusfilter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="p-4 w-28">Bug ID</th>
                <th className="p-4">Project Name</th>
                <th className="p-4">Tester Name</th>
                <th className="p-4">Assigned Developer</th>
                <th className="p-4 w-32">Start Date</th>
                <th className="p-4 w-32">End Date</th>
                <th className="p-4 w-36">Status</th>
                <th className="p-4 w-32 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-4 font-mono font-bold text-gray-900">{log.bugId || `BUG-${log.id}`}</td>
                    <td className="p-4">
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-xs border border-blue-200 font-bold uppercase tracking-wider">
                        {log.module || "General"}
                      </span>
                      {log.systemNotes && (
                        <div className="text-[11px] text-gray-500 italic mt-1 font-normal max-w-[150px] truncate" title={log.systemNotes}>
                          Note: {log.systemNotes}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-gray-800 font-semibold uppercase">
                      {log.testerName || "Kamatchi"} <span className="text-[10px] text-gray-400 font-normal">({log.testerId || "TST201"})</span>
                    </td>
                    <td className="p-4 text-gray-800 font-semibold uppercase">
                      {log.developerName || log.develper || "Unassigned"} <span className="text-[10px] text-gray-400 font-normal">({log.developerId || "N/A"})</span>
                    </td>
                    <td className="p-4 text-gray-600 font-mono">{log.assignedOn || "N/A"}</td>
                    <td className="p-4 text-gray-600 font-mono">{log.dueDate || "N/A"}</td>
                    <td className="p-4">
  <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border inline-block ${getStatusBadgeStyle(log.status)}`}>
    {log.status || 'Open'}
  </span>
</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setViewingHistory(log)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors cursor-pointer"
                      >
                        <Eye size={13} /> View 
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-450 bg-gray-50/50 italic text-xs">
                    <p className="font-semibold text-sm text-gray-700">No historical logs match your queries.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      
     

      <BugDetailModal
        bug={viewingHistory}
        onClose={() => setViewingHistory(null)}
        title={bugTitle}
      />

    </div>
  );
}

export default HistoryReport;
