import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Search,
  User,
  FolderGit2,
  Calendar,
  CheckCircle,
  AlertCircle,
  Filter,
  Trash2,
  Code,
  ArrowUpRight,
  UploadCloud
} from 'lucide-react';
import { API_BASE, authFetch } from '../../lib/api';

function InboxDashboard({ onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [activeMessageId, setActiveMessageId] = useState('MSG-001');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');

  const loadSubmissions = async () => {
    try {
      const response = await authFetch('/api/bugs/submissions/');
      if (!response.ok) return;

      const data = await response.json();
      if (!Array.isArray(data)) return;

      setMessages(data);
      if (data.length === 0) return;

      const targetId = localStorage.getItem("inbox_active_build_id");
      if (targetId && data.some(m => m.id === targetId)) {
        setActiveMessageId(targetId);
        localStorage.removeItem("inbox_active_build_id");
        return;
      }

      setActiveMessageId(prev => {
        if (prev && data.some(m => m.id === prev)) return prev;
        return data[0].id;
      });
    } catch (e) {
      console.error("Error loading submissions from backend API", e);
    }
  };

  useEffect(() => {
    loadSubmissions();
    window.addEventListener("notifications_updated", loadSubmissions);
    return () => {
      window.removeEventListener("notifications_updated", loadSubmissions);
    };
  }, []);

  const handleMarkAsRead = async (msgId) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return { ...m, status: 'Read' };
      }
      return m;
    }));

    try {
      await authFetch(`/api/bugs/submissions/${msgId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Read" })
      });
    } catch (e) {
      console.error("Error marking build as read on backend API", e);
    }
  };

  // const handleDeleteMessage = (msgId) => {
  //   const updated = messages.filter(m => m.id !== msgId);
  //   setMessages(updated);
  //   if (activeMessageId === msgId && updated.length > 0) {
  //     setActiveMessageId(updated[0].id);
  //   }
  // };

  const handleStartTesting = async (msg) => {
    try {
      let testerName = "Kamatchi";
      let testerId = "TS001";
      try {
        const testerUser = JSON.parse(localStorage.getItem("tester_user") || "{}");
        if (testerUser?.name) testerName = testerUser.name;
        if (testerUser?.employee_id || testerUser?.id) {
          testerId = testerUser?.employee_id || `TS${String(testerUser?.id).padStart(3, '0')}`;
        }
      } catch (err) { 
        console.error("error in inbox dashboard",err);
        
      }

      const response = await authFetch(`/api/bugs/submissions/${msg.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimedBy: testerName,
          claimedById: testerId,
          status: "Accepted"
        }),
      });

      if (response.ok) {
        window.dispatchEvent(new Event("notifications_updated"));
        alert(`Project build "${msg.projectName || msg.project_name}" has been accepted and is now in testing!`);
        loadSubmissions();
      } else {
        alert("Failed to accept project build for testing.");
      }
    } catch (err) {
      console.error("Error accepting project build", err);
      alert("Error accepting project build.");
    }
  };

  
  const projects = ['All', ...new Set(messages.map(m => m.projectName || m.project_name))];

  const filteredMessages = messages.filter(m => {
    const matchesSearch =
      m.developerName?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      m.projectName?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      m.subject?.toLowerCase().includes(searchTerm?.toLowerCase());

    const matchesProject = projectFilter === 'All' || m.projectName === projectFilter;

    return matchesSearch && matchesProject;
  });

  const activeMessage = filteredMessages.find(m => m.id === activeMessageId) || filteredMessages[0];

  return (
    <div className="w-full font-sans text-gray-800 antialiased">
  
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Inbox className="text-blue-600 h-6 w-6" /> Inbox Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Receive and review project modules, developer submissions, and patch build files.</p>
      </div>

      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-250 shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Inbox size={20} />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Total </span>
            <span className="text-lg font-bold text-gray-900">{messages.length}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-250 shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <AlertCircle size={20} />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Unread </span>
            <span className="text-lg font-bold text-gray-900">
              {messages.filter(m => m.status === 'Unread').length}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-250 shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-250 flex items-center justify-center text-emerald-600">
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Downloaded Files</span>
            <span className="text-lg font-bold text-gray-900">
              {messages.filter(m => m.downloaded).length}
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
       
        <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col h-[400px] lg:h-[600px]">
        
          <div className="p-4 border-b border-gray-150 bg-gray-50/50 space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Developer, Project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800"
              />
              <Search size={14} className="absolute left-2.5 top-3 text-gray-400" />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={12} className="text-gray-400" />
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="text-xs border border-gray-300 rounded bg-white px-2 py-1 text-gray-600 focus:outline-none w-full"
              >
                <option value="All">All Projects</option>
                {projects.filter(p => p !== 'All').map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

         
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic text-xs">
                No submissions found matching criteria.
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isActive = msg.id === activeMessageId;
                const isUnread = msg.status === 'Unread';
                const linkVal = msg.projectLink || msg.project_link || '';
                const isUrlFormat = linkVal.startsWith('http://') || linkVal.startsWith('https://');

                return (
                  <button
                    key={msg.id}
                    onClick={() => {
                      setActiveMessageId(msg.id);
                      handleMarkAsRead(msg.id);
                    }}
                    className={`w-full text-left p-4 cursor-pointer transition-all flex flex-col gap-1.5 hover:bg-slate-50/80 relative ${
                      isActive ? ' border-l-1 border-t-2 border-blue-100 bg-gray-100 pl-3.5' : 'pl-4 bg-white'
                    }`}
                  >
                    {isUnread && (
                      <span className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                    )}

                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold text-blue-700">
                          {msg.projectName || msg.project_name}
                        </span>
                        {msg.version && (
                          <span className="text-[9px] bg-purple-100 border border-purple-300 text-purple-800 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider">
                            {msg.version}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono shrink-0">{msg.date}</span>
                    </div>

                    <h3 className={`text-xs text-gray-900 break-words ${isUnread ? 'font-bold' : 'font-semibold'}`}>
                      {msg.subject}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                      <User size={12} className="text-gray-400 shrink-0" />
                      <span className="truncate font-medium">{msg.developerName || msg.developer_name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-150 w-fit max-w-full truncate mt-1">
                      {isUrlFormat ? (
                        <>
                          <Code size={11} className="text-blue-500 shrink-0" />
                          <span className="font-mono truncate">{linkVal}</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={11} className="text-emerald-500 shrink-0" />
                          <span className="text-emerald-700 font-medium truncate">{linkVal || "APK Mode Build"}</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

       
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden min-h-[400px] lg:h-[600px] flex flex-col">
          {activeMessage ? (
            <div className="flex flex-col h-full">
             
              <div className="p-6 border-b border-gray-150 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-blue-100 border border-blue-300 text-blue-800 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                      {activeMessage.projectName || activeMessage.project_name}
                    </span>
                    {activeMessage.version && (
                      <span className="text-xs bg-purple-100 border border-purple-300 text-purple-800 px-2.5 py-0.5 rounded font-extrabold uppercase tracking-wider">
                        {activeMessage.version}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                      <Calendar size={12} /> {activeMessage.date}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-gray-900 leading-tight">
                    {activeMessage.subject}
                  </h2>
                </div>

                {/* <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDeleteMessage(activeMessage.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Submission"
                  >
                    <Trash2 size={16} />
                  </button>
                </div> */}
              </div>

              
              <div className="flex-1 p-6 space-y-5 overflow-y-auto text-xs">
               
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-200 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0 text-xs">
                      {(activeMessage.developerName || activeMessage.developer_name || 'DV').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold block">Developer</span>
                      <strong className="text-gray-900 text-xs font-bold">{activeMessage.developerName || activeMessage.developer_name}</strong>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-200 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                      <FolderGit2 size={16} />
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold block">Project</span>
                      <strong className="text-gray-900 text-xs font-bold">{activeMessage.projectName || activeMessage.project_name}</strong>
                    </div>
                  </div>
                </div>

             
                <div className="space-y-3">
                  {(() => {
                    const linkVal = activeMessage.projectLink || activeMessage.project_link || '';
                    const isUrlFormat = linkVal.startsWith('http://') || linkVal.startsWith('https://');

                    if (!linkVal) {
                      return (
                        <div className="p-4 text-center text-gray-400 italic bg-gray-50 rounded-xl border border-gray-250">
                          No project link provided for this build.
                        </div>
                      );
                    }

                    if (isUrlFormat) {
                      return (
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Project Link / URL</h4>
                          <div className="flex items-center justify-between p-3.5 bg-blue-50/40 border border-blue-200 rounded-xl">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="h-9 w-9 rounded-lg bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-600 shrink-0">
                                <Code size={20} />
                              </div>
                              <div className="min-w-0 flex-1 mr-2">
                                <span className="block text-xs font-bold text-gray-900 truncate" title={linkVal}>
                                  {linkVal}
                                </span>
                              </div>
                            </div>
                            <a
                              href={linkVal}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                            >
                              <ArrowUpRight size={13} />
                              Open Link
                            </a>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">APK Build Status</h4>
                          <div className="flex items-center justify-between p-3.5 bg-emerald-50/40 border border-emerald-200 rounded-xl">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="h-9 w-9 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 shrink-0">
                                <UploadCloud size={20} />
                              </div>
                              <div className="min-w-0 flex-1 mr-2">
                                <span className="block text-xs font-bold text-emerald-900 truncate" title={linkVal}>
                                  {linkVal}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>

             
              <div className="p-4 border-t border-gray-150 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
                {(() => {
                  let tName = "Kamatchi";
                  let tId = "TS001";
                  try {
                    const testerUser = JSON.parse(localStorage.getItem("tester_user") || "{}");
                    if (testerUser?.name) tName = testerUser.name;
                    if (testerUser?.employee_id || testerUser?.id) {
                      tId = testerUser?.employee_id || `TS${String(testerUser?.id).padStart(3, '0')}`;
                    }
                  } catch (err) { 
                    console.error("error in inbox dashboard",err);
                    
                  }

                  const isClaimed = activeMessage.claimedBy || activeMessage.claimed_by || activeMessage.status === 'Testing' || activeMessage.status === 'Accepted';
                  const claimedByName = activeMessage.claimedBy || activeMessage.claimed_by;
                  const claimedById = activeMessage.claimedById || activeMessage.claimed_by_id;
                  const isClaimedByMe = isClaimed && (
                    (claimedById?.toLowerCase() === tId.toLowerCase()) ||
                    (claimedByName?.toLowerCase() === tName.toLowerCase())
                  );

                  if (isClaimed) {
                    if (isClaimedByMe) {
                      return (
                        <div className="text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                          Status: Accepted & Under Active Testing
                        </div>
                      );
                    } else {
                      return (
                        <>
                          <div className="text-xs text-amber-600 font-bold flex items-center gap-1.5">
                            <AlertCircle size={14} className="text-amber-500 animate-pulse" />
                            This build is already being tested by {claimedByName} ({claimedById || "TST001"}).
                          </div>
                          <button
                            disabled
                            className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 bg-gray-100 text-gray-400 font-bold text-xs rounded-xl cursor-not-allowed"
                          >
                            <CheckCircle size={15} /> Already Under Testing
                          </button>
                        </>
                      );
                    }
                  }

                  return (
                    <>
                      <div className="text-xs text-gray-500 italic">
                        Developer submission available for testing.
                      </div>
                      <button
                        onClick={() => handleStartTesting(activeMessage)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        <CheckCircle size={15} /> Accept & Start Testing
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 space-y-3">
              <Inbox size={48} className="text-gray-300 stroke-1" />
              <p className="text-xs italic">Select a package from the left list to review contents.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InboxDashboard;