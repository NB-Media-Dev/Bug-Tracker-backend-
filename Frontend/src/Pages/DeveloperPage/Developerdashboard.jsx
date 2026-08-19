
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Bug, Clock, FileText, CheckCircle2, AlertCircle, X, ArrowUpRight,
  Download,
} from 'lucide-react';
import { API_BASE, authFetch } from '../../lib/api';
import { formatBugId } from '../../lib/utils';

function DeveloperDashboard({ onNavigate }) {
  const [developerName, setDeveloperName] = useState('Unassigned');
  const [developerId, setDeveloperId] = useState('N/A');
  const [openBugs, setOpenBugs] = useState([]);
  const [inProgressBugs, setInProgressBugs] = useState([]);
  const [resolvedBugs, setResolvedBugs] = useState([]);
  const [notFixedBugs, setNotFixedBugs] = useState([]);
  const [assignedBugs, setAssignedBugs] = useState([]);
  const [viewingBug, setViewingBug] = useState(null);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintDetails, setComplaintDetails] = useState('');
  const [complaintToast, setComplaintToast] = useState('');
  const [complaintSending, setComplaintSending] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const storedDeveloper = JSON.parse(localStorage.getItem("developer_user") || "{}");
    if (storedDeveloper?.name) {
      setDeveloperName(storedDeveloper.name);
    } else {
      setDeveloperName(localStorage.getItem("developer_name") || "Unassigned");
    }
    if (storedDeveloper?.employee_id) {
      setDeveloperId(storedDeveloper.employee_id);
    } else {
      setDeveloperId(localStorage.getItem("developer_id") || "N/A");
    }

    loadBugs();
  }, []);

  const loadBugs = async () => {
    try {
      const devId = localStorage.getItem("developer_id") || localStorage.getItem("developer_employee_id") || "DEV001";
      const response = await authFetch(`${API_BASE}/api/bugs/`);
      if (response.ok) {
        const data = await response.json();
        const filtered = data
          .map(b => ({
            id: b.id,
            bugId: formatBugId(b),
            title: b.title,
            description: b.description,
            severity: b.severity || 'Minor',
            status: b.status || 'Open',
            testerStatus: b.testerStatus || b.status || 'Open',
            devStatus: b.devStatus || b.dev_status || 'In Progress',
            developer: b.developerName || b.developer_name || 'Unassigned',
            developerName: b.developerName || b.developer_name || 'Unassigned',
            developerId: b.developerId || b.developer_id || 'N/A',
            testerName: b.testerName || b.tester_name || 'Kamatchi',
            testerId: b.testerId || b.tester_id || 'TST001',
            assignedOn: b.assignedOn || b.assigned_on || new Date().toLocaleDateString(),
            dueDate: b.dueDate || b.due_date || 'N/A',
            Assgined_Date: b.assignedOn || b.assigned_on || new Date().toLocaleDateString(),
            endDate: b.dueDate || b.due_date || 'N/A',
            module: b.module || 'General',
            type: "bug_report",
            files: b.files || []
          }))
          .filter(b => b.developerId === devId || b.developer === developerName);

        setAssignedBugs(filtered);
        setOpenBugs(filtered.filter(b => b.status === 'Open'));
        setInProgressBugs(filtered.filter(b => b.status === 'In Progress' || b.status === 'Pending'));
        setResolvedBugs(filtered.filter(b => b.status === 'Closed' || b.status === 'Resolved'));
        setNotFixedBugs(filtered.filter(b => b.status === 'Not Fixed'));
      }
    } catch (e) {
      console.error("Error loading bugs", e);
    }
  };

  const filteredAssignedBugs = assignedBugs.filter(b => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      b.bugId?.toLowerCase().includes(search) ||
      b.title?.toLowerCase().includes(search) ||
      b.testerName?.toLowerCase().includes(search) ||
      b.module?.toLowerCase().includes(search);
    
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const exportHistoryToCSV = () => {
    if (filteredAssignedBugs?.length === 0) {
      alert("No history logs available to export.");
      return;
    }

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return "";
      let str = String(val);
      str = str.replaceAll('"', '""');
      return str;
    };

    const headers = [
      "Bug ID",
      "Project Name",
      "Bug Title",
      "Description",
      "Severity",
      "Developer Assigned",
      "Tester",
      "Status",
      "Assigned Date"
    ];

    const rows = filteredAssignedBugs?.map(b => [
      escapeCSV(b.bugId),
      escapeCSV(b.module || "General"),
      escapeCSV(b.title),
      escapeCSV(b.description),
      escapeCSV(b.severity),
      escapeCSV(`${b.developer} (${b.developerId})`),
      escapeCSV(`${b.testerName} (${b.testerId})`),
      escapeCSV(b.status),
      escapeCSV(b.assignedOn)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `developer_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const sendComplaintNotification = async () => {
    if (!complaintSubject.trim() && !complaintDetails.trim()) {
      setComplaintToast('Please enter a subject or message.');
      return;
    }

    setComplaintSending(true);
    setComplaintToast('');

    const storedDeveloper = JSON.parse(localStorage.getItem('developer_user') || '{}');
    const senderId = storedDeveloper?.employee_id || developerId || 'DEV001';
    const projectName = localStorage.getItem('selected_project_name');

    const messageParts = [complaintSubject.trim(), complaintDetails.trim()]
      .filter(Boolean)
      .join(' - ');
    const message = projectName
      ? `[${projectName}] ${messageParts}`
      : messageParts;

    const payload = {
      recipient_email: 'vasan11@gmail.com',
      recipient_role: 'Admin',
      recipient_name: 'System Admin',
      sender_id: senderId,
      notification_type: 'complaint',
      message: message || 'Developer submitted a notification to admin.'
    };

    try {
      const response = await authFetch(`${API_BASE}/api/bugs/notifications/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setComplaintToast('Complaint sent successfully.');
        setComplaintSubject('');
        setComplaintDetails('');
        setShowComplaintModal(false);
      } else {
        const errorData = await response.json();
        setComplaintToast(errorData.detail || 'Unable to send complaint.');
      }
    } catch (error) {
      console.error('Complaint submit failed', error);
      setComplaintToast('Network error while sending complaint.');
    } finally {
      setComplaintSending(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Open":
        return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
      case "In Progress":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100";
      case "Pending":
        return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
      case "Resolved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
      case "Not Fixed":
        return "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100";
    }
  };

  return (
    <div className="min-h-screen font-sans bg-gradient-to-br from-gray-50 to-blue-100">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-gray-800 text-white px-4 py-3 flex justify-between items-center z-50 shadow-md">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bug className="text-white" size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold">Developer Dashboard</h1>
            <p className="text-xs text-blue-200">{developerName} ({developerId})</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowComplaintModal(true)}
            className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg text-white"
          >
            <AlertCircle size={16} />
            <span>Report / Complain</span>
          </button>
          <button
            onClick={() => onNavigate('/developer/history')}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg"
          >
            <span>History</span>
            <FileText size={16} />
          </button>
        </div>
      </div>

      <div className="hidden lg:flex flex-col fixed top-0 left-0 h-full w-64 bg-gray-900 text-white p-5 z-50">
        <div className="flex items-center justify-center mb-10">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3 shadow-lg">
            <Bug size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Developer Dashboard</h1>
            <p className="text-xs text-blue-200">{developerName} ({developerId})</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => onNavigate('/developer/report')}
            className="w-full flex items-center px-3 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-xl transition-all group"
          >
            <FileText size={20} className="mr-3" />
            <span className="font-medium">Report Bug</span>
          </button>
          <button
            onClick={() => setShowComplaintModal(true)}
            className="w-full flex items-center px-3 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-xl transition-all group"
          >
            <AlertCircle size={20} className="mr-3" />
            <span className="font-medium">Report / Complain</span>
          </button>
          <button
            onClick={() => onNavigate('/developer/inbox')}
            className="w-full flex items-center px-3 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-xl transition-all group"
          >
            <LayoutDashboard size={20} className="mr-3" />
            <span className="font-medium">Inbox</span>
          </button>
          <button
            className="w-full flex items-center px-3 py-3 text-blue-400 bg-gray-800 rounded-xl shadow-lg font-bold border border-blue-500/50 cursor-default"
          >
            <Bug size={20} className="mr-3" />
            <span className="font-bold">My Work</span>
          </button>
          <div className="pt-2">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Work Stats</span>
              <Clock size={12} className="text-gray-500" />
            </div>
            <div className="space-y-1.5">
              <div className="bg-gray-800/50 px-3 py-2.5 rounded-xl border border-gray-800 flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-300">Open</div>
                  <div className="text-lg font-bold text-orange-400">{openBugs.length}</div>
                </div>
                <Bug size={18} className="text-orange-500/30" />
              </div>
              <div className="bg-gray-800/50 px-3 py-2.5 rounded-xl border border-gray-800 flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-300">Pending / In Progress</div>
                  <div className="text-lg font-bold text-blue-400">{inProgressBugs.length}</div>
                </div>
                <Clock size={18} className="text-blue-500/30" />
              </div>
              <div className="bg-gray-800/50 px-3 py-2.5 rounded-xl border border-gray-800 flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-300">Resolved / Closed</div>
                  <div className="text-lg font-bold text-emerald-400">{resolvedBugs.length}</div>
                </div>
                <CheckCircle2 size={18} className="text-emerald-500/30" />
              </div>
            </div>
          </div>
        </nav>

        <button
          onClick={() => onNavigate('/developer/history')}
          className="w-full mt-6 flex items-center px-3 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-xl transition-all border border-transparent hover:border-gray-700 group"
        >
          <FileText size={20} className="mr-3" />
          <span className="font-medium">History</span>
          <ArrowUpRight size={16} className="ml-auto text-gray-500 group-hover:text-white" />
        </button>
        <button className="w-full mt-2 flex items-center px-3 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-xl transition-all border border-transparent hover:border-gray-700 group">
          <LayoutDashboard size={20} className="mr-3" />
          <span className="font-medium">Settings</span>
        </button>
      </div>

      <div className="lg:ml-64 p-5 pt-8 lg:pt-6">
        <div className="max-w-7xl mx-auto">
          <div className="lg:hidden bg-gray-800 text-white p-3 rounded-xl mb-5 shadow-lg border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Bug className="text-white" size={16} />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Developer Workspace</h1>
                  <p className="text-xs text-blue-200">{developerName} ({developerId})</p>
                </div>
              </div>
              <div className="text-xs bg-orange-500/20 border border-orange-500/30 text-orange-400 px-2 py-1 rounded-lg font-bold">
                {openBugs.length} Open Bug(s)
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => onNavigate('/developer/report')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-2 rounded-lg text-sm font-bold flex flex-col items-center space-y-1 transition-all shadow-lg"
              >
                <FileText size={16} />
                <span>Report</span>
              </button>
              <button
                onClick={() => onNavigate('/developer/inbox')}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-2 rounded-lg text-sm font-bold flex flex-col items-center space-y-1 transition-all shadow-lg"
              >
                <LayoutDashboard size={16} />
                <span>Inbox</span>
              </button>
              <button
                onClick={() => onNavigate('/developer/history')}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-2 rounded-lg text-sm font-bold flex flex-col items-center space-y-1 transition-all shadow-lg"
              >
                <FileText size={16} />
                <span>History</span>
              </button>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Developer Workspace</h1>
                <p className="text-gray-600 text-lg">Here's what needs your attention today</p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("tester_user");
                  localStorage.removeItem("test_name");
                  onNavigate('/');
                }}
                className="text-gray-500 hover:text-red-500 transition-colors flex items-center space-x-2"
              >
                <span className="font-medium text-sm">Logout</span>
                <ArrowUpRight size={16} className="rotate-90" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-orange-100 rounded-xl">
                  <Bug className="text-orange-600" size={24} />
                </div>
                <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-lg">New</span>
              </div>
              <div className="mb-2">
                <h3 className="text-sm text-gray-500 font-medium">Open Bugs</h3>
                <p className="text-3xl font-bold text-gray-900">{openBugs.length}</p>
              </div>
              <p className="text-xs text-gray-500">Assigned to you</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Clock className="text-blue-600" size={24} />
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-lg">In Progress</span>
              </div>
              <div className="mb-2">
                <h3 className="text-sm text-gray-500 font-medium">Assigned Bugs</h3>
                <p className="text-3xl font-bold text-gray-900">{inProgressBugs.length}</p>
              </div>
              <p className="text-xs text-gray-500">Currently working on</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <CheckCircle2 className="text-emerald-600" size={24} />
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg">Closed</span>
              </div>
              <div className="mb-2">
                <h3 className="text-sm text-gray-500 font-medium">Resolved Bugs</h3>
                <p className="text-3xl font-bold text-gray-900">{resolvedBugs.length}</p>
              </div>
              <p className="text-xs text-gray-500">Fixed and closed</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-red-100 rounded-xl">
                  <AlertCircle className="text-red-600" size={24} />
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-lg">Not Fixed</span>
              </div>
              <div className="mb-2">
                <h3 className="text-sm text-gray-500 font-medium">Not Fixed Bugs</h3>
                <p className="text-3xl font-bold text-gray-900">{notFixedBugs.length}</p>
              </div>
              <p className="text-xs text-gray-500">Flagged as Not Fixed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 lg:mb-0">
                <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Open Bugs</h2>
                    <p className="text-xs text-gray-500">Bugs waiting for your attention</p>
                  </div>
                  <div className="bg-orange-500/20 text-orange-600 px-3 py-1 rounded-lg font-bold">
                    {openBugs.length}
                  </div>
                </div>

                <div className="p-1">
                  {openBugs.length > 0 ? (
                    openBugs.map((bug) => (
                      <button
                        key={bug.id}
                        onClick={() => onNavigate(`/developer/bug/${bug.id}`)}
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0 w-full text-left"
                      >
                        <div className="flex-shrink-0 w-3 h-3 rounded-full bg-orange-500 mr-3"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{bug.title}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                              {bug.severity}
                            </span>
                            <span className="text-xs text-gray-500">
                              Module: {bug.module}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 font-mono ml-auto">
                          {bug.assignedOn}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="text-center py-6 text-gray-400 italic text-xs">No open bugs assigned.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Work Items</h2>
                    <p className="text-xs text-gray-500">All tasks assigned to you</p>
                  </div>
                  <button
                    onClick={exportHistoryToCSV}
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={14} /> Export CSV
                  </button>
                </div>

                <div className="p-5">
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Search by ID, title, tester..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="All">All Status</option>
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Pending">Pending</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Not Fixed">Not Fixed</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {filteredAssignedBugs.length > 0 ? (
                      filteredAssignedBugs.map((bug) => (
                        <button
                          key={bug.id}
                          className="p-3 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-2xs transition-all flex flex-col gap-1.5 cursor-pointer w-full text-left"
                          onClick={() => setViewingBug(bug)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-gray-500">{bug.bugId}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeStyle(bug.status)}`}>
                              {bug.status}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-gray-900 leading-tight">{bug.title}</h4>
                          <div className="flex items-center justify-between text-[10px] text-gray-500">
                            <span>Tester: <strong className="text-gray-700 uppercase">{bug.testerName}</strong></span>
                            <span>Due: <strong className="text-gray-700">{bug.dueDate}</strong></span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-center py-6 text-gray-400 italic text-xs">No matching tasks found.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {viewingBug && (
       <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl shadow-2xs border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100 bg-blue-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-blue-50 border border-blue-250 text-blue-700 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                {viewingBug.bugId}
              </span>
              <h3 className="font-bold text-gray-900 text-sm">{viewingBug.module} - Bug Details</h3>
              <button
                onClick={() => setViewingBug(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Title</h4>
                <p className="font-bold text-gray-900 text-sm">{viewingBug.title}</p>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</h4>
                <p className="text-gray-700 bg-gray-50 p-2.5 rounded border border-gray-200 whitespace-pre-wrap">
                  {viewingBug.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Workflow Status</h4>
                  <p className="font-semibold text-gray-800">Status: <strong className="text-blue-600">{viewingBug.status}</strong></p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Severity</h4>
                  <p className="font-semibold text-gray-800">Severity: <strong className="text-red-600 uppercase">{viewingBug.severity}</strong></p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-150 flex justify-end bg-gray-50/50">
              <button
                onClick={() => setViewingBug(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showComplaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Send Notification to Admin</h2>
                <p className="text-sm text-slate-500">This will only create an admin notification, not a bug report.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowComplaintModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor='complaintsubject' className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  value={complaintSubject}
                  id='complaintsubject'
                  name='complaintsubject'
                  onChange={(e) => setComplaintSubject(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                  placeholder="Brief issue subject"
                />
              </div>
              <div>
                <label htmlFor='complaintdetails' className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Details</label>
                <textarea
                  value={complaintDetails}
                  id='complaintdetails'
                  name='complaintdetails'
                  onChange={(e) => setComplaintDetails(e.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                  placeholder="Describe your report or complaint for the admin."
                />
              </div>
              {complaintToast && (
                <div className="text-sm text-rose-600">{complaintToast}</div>
              )}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComplaintModal(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={sendComplaintNotification}
                  disabled={complaintSending}
                  className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {complaintSending ? 'Sending...' : 'Send Notification'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeveloperDashboard;