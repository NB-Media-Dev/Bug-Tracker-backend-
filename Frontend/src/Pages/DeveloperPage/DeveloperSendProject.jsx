
import React, { useState, useEffect, useCallback } from 'react';
import { UploadCloud, FileArchive, CheckCircle2, Send, Layers, Trash2, User, Edit2, Share2, Link } from 'lucide-react';
import { getProjectPrefix } from "../../lib/theme";
import { API_BASE, authFetch } from '../../lib/api';

function DeveloperSendProject({ developer }) {
  const devName = developer?.name || 'Vasanthan';
  const devId = developer?.employee_id || (developer?.id ? `DEV${String(developer.id).padStart(3, '0')}` : 'DEV001');
  const fullDevName = `${devName} (${devId})`;


  const [projectName, setProjectName] = useState('');
  const [projectLink, setProjectLink] = useState('');
  const [version, setVersion] = useState('v0.1');
  const [submissionMode, setSubmissionMode] = useState('url');
  const [testers, setTesters] = useState([]);
  const [editId, setEditId] = useState(null);
  const [submittedProjects, setSubmittedProjects] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [duplicateError, setDuplicateError] = useState('');

  const createBuildSubmissionId = (projName, dId) => {
    const prefix = getProjectPrefix(projName);
    const devSuffix = dId ? dId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() : "DEV";
    const timestamp = Date.now().toString().slice(-4);
    return `SUB-${prefix}-${devSuffix}-${timestamp}`;
  };

  const sendAdminNotification = async (messageText) => {
    try {
      await authFetch(`${API_BASE}/api/bugs/notifications/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_email: "admin@bugtracker.com",
          recipient_name: "Admin",
          recipient_role: "Admin",
          recipient_id: "ADM001",
          notification_type: "build_submitted",
          message: messageText,
        }),
      });
    } catch (e) {
      console.error("Error sending admin notification", e);
    }
  };

  const loadSubmissions = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/bugs/submissions/?developer_id=${encodeURIComponent(devId)}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.results || [];
        setSubmittedProjects(items);
      }
    } catch (e) {
      console.error("Error loading submissions", e);
    }
  }, [devId]);

  useEffect(() => {
    loadSubmissions();
    const loadTesters = async () => {
      try {
        const res = await authFetch(`${API_BASE}/api/users/?role=Tester`);
        if (res.ok) {
          const data = await res.json();
          setTesters(Array.isArray(data) ? data : data.results || []);
        }
      } catch (e) {
        console.error("Error loading testers", e);
      }
    };
    loadTesters();
  }, [loadSubmissions]);

  const checkDuplicateProject = (name, currentEditId = null) => {
    const trimmed = (name || '').trim().toLowerCase();
    if (!trimmed) return false;
    return submittedProjects.some((p) => {
      if (currentEditId && p.id === currentEditId) return false;
      const pName = (p.projectName || p.project_name || '').trim().toLowerCase();
      return pName === trimmed;
    });
  };

  const resetSubmissionForm = () => {
    setProjectName('');
    setProjectLink('');
    setVersion('v0.1');
    setEditId(null);
    setDuplicateError('');
  };

  const handleEditSubmission = async (computedLinkField) => {
    try {
      const res = await authFetch(`${API_BASE}/api/bugs/submissions/${editId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: projectName.trim(),
          version: version || 'v0.1',
          project_link: computedLinkField,
          projectLink: computedLinkField,
        })
      });
      if (res.ok) {
        loadSubmissions();
        setSuccessMessage(`Project build successfully updated!`);
        resetSubmissionForm();
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        const errJson = await res.json();
        const msg = errJson.detail || JSON.stringify(errJson);
        alert(`Failed to update project build: ${msg}`);
      }
    } catch (err) {
      console.error("Error patching project submission", err);
    }
  };

  const handleCreateSubmission = async (computedLinkField) => {
    const subId = createBuildSubmissionId(projectName, devId, submittedProjects);

    const postPayload = {
      id: subId,
      project_name: projectName.trim(),
      version: version || 'v0.1',
      projectLink: computedLinkField,
      developer_name: fullDevName,
      developer_id: devId,
      subject: `${projectName.trim()} (${version || 'v0.1'}) Project Build Submission`,
      status: "Unread",
      downloaded: "false",
      project_link: computedLinkField,
    };

    try {
      const res = await authFetch(`${API_BASE}/api/bugs/submissions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postPayload)
      });
      if (res.ok) {
        loadSubmissions();
        sendAdminNotification(`Developer ${fullDevName} submitted a project build for "${projectName.trim()}" (${version || 'v0.1'}).`);
        setSuccessMessage(`Build logged successfully!`);
        resetSubmissionForm();
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        const errJson = await res.json();
        const msg = errJson.detail || JSON.stringify(errJson);
        alert(`Submission failed: ${msg}`);
      }
    } catch (err) {
      console.error("Error creating submission", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setDuplicateError('');

    if (!projectName.trim()) {
      alert("Please enter the Project Name!");
      return;
    }

    if (checkDuplicateProject(projectName, editId)) {
      const errMsg = `You have already submitted a project with the name "${projectName.trim()}". Duplicate project submissions for the same developer are not allowed!`;
      setDuplicateError(errMsg);
      alert(errMsg);
      return;
    }

    if (submissionMode === 'url' && !projectLink.trim()) {
      alert("Please provide the Project Link / URL.");
      return;
    }

    const computedLinkField = submissionMode === 'url'
      ? projectLink.trim()
      : "Your APK file has been successfully submitted for testing";

    if (editId) {
      await handleEditSubmission(computedLinkField);
    } else {
      await handleCreateSubmission(computedLinkField);
    }
  };

  const handleShareClick = (e) => {
    if (e) e.preventDefault();
    window.open("https://workplace.zoho.com", "_blank", "noopener,noreferrer");
  };

  const handleDeleteSubmission = async (id) => {
    if (!window.confirm("Are you sure you want to delete this submission? This will also remove it from the testers' side.")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/bugs/submissions/${id}/`, {
        method: "DELETE"
      });
      if (res.ok) {
        const updated = submittedProjects.filter(p => p.id !== id);
        setSubmittedProjects(updated);
        localStorage.setItem("developer_project_submissions", JSON.stringify(updated));
        setSuccessMessage("Project and all related records deleted successfully!");
        setTimeout(() => {
          setSuccessMessage("");
        }, 4000);
      } else {
        alert("Failed to delete the project submission from the database.");
      }
    } catch (err) {
      console.error("Error deleting submission", err);
      alert("Error connection failed during submission delete.");
    }
  };


  const renderLinkOrBadge = (linkVal, isLinkFormat) => {
    if (!linkVal) {
      return <span className="text-gray-400 italic">No information provided</span>;
    }

    if (isLinkFormat) {
      return (
        <a
          href={linkVal}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline font-bold flex items-center gap-1.5 font-mono"
        >
          <Link size={13} className="text-blue-600 shrink-0" />
          <span className="truncate max-w-xs">{linkVal}</span>
        </a>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded border border-emerald-200">
        <UploadCloud size={13} className="shrink-0" />
        {linkVal}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-gray-800 antialiased">
      <div>
        <div className="flex items-center gap-2">
          <FileArchive className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Send Project Build to Testers</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          Provide the project URL or toggle actions to dispatch notification stacks dynamically.
        </p>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold shadow-2xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="flex items-center gap-4 bg-gray-100 p-1.5 rounded-xl max-w-xs">
        <button
          type="button"
          onClick={() => setSubmissionMode('url')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${submissionMode === 'url' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <Link size={14} /> URL Option
        </button>
        <button
          type="button"
          onClick={() => setSubmissionMode('apk')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${submissionMode === 'apk' ? 'bg-white text-emerald-600 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <UploadCloud size={14} /> APK Mode
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor='projectname' className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              id='projectname'
              name='projectname'
              type="text"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                setDuplicateError('');
              }}
              placeholder="e.g. Authentication Module, E-Commerce Mobile App"
              className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50/30 font-medium"
              required
            />
            {duplicateError && (
              <p className="mt-1.5 text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg border border-red-200">
                {duplicateError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor='version' className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Version <span className="text-red-500">*</span>
              </label>
              <input
                id='version'
                name='version'
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. v0.1"
                className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50/30 font-semibold"
                required
              />
            </div>

            <div>
              <label htmlFor='devlopername' className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Developer Name (Fixed)
              </label>
              <div className="flex items-center gap-2 bg-gray-100 border border-gray-300 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-700 cursor-not-allowed">
                <User size={15} className="text-gray-500" />
                <span>{fullDevName}</span>
                <span className="ml-auto text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-semibold uppercase">Auto-Filled</span>
              </div>
            </div>
          </div>

          {submissionMode === 'url' ? (
            <div>
              <label htmlFor='url' className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Project Link / URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                id='url'
                name='url'
                value={projectLink}
                onChange={(e) => setProjectLink(e.target.value)}
                placeholder="e.g. https://localhost:3000/project"
                className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50/30 font-medium"
                required={submissionMode === 'url'}
              />
            </div>
          ) : (
            <div className="space-y-3">

              <button
                type="button"
                onClick={handleShareClick}
                disabled={testers.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed uppercase tracking-wider"
              >
                <Share2 size={15} /> Share with Testers ({testers.length})
              </button>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Send size={15} /> {editId ? "Update Build Submission" : "Send Build to All Testers"}
            </button>
            {editId && (
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setProjectName('');
                  setProjectLink('');
                }}
                className="py-3 px-5 bg-gray-500 hover:bg-gray-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-2xs border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-blue-600" size={18} />
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Sent Project Builds ({submittedProjects.length})</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="p-4">Project Name</th>
                <th className="p-4">Developer</th>
                <th className="p-4">Testing Link / Action Format</th>
                <th className="p-4">Submitted Date</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
              {submittedProjects.length > 0 ? (
                submittedProjects.map((item) => {
                  const linkVal = item.projectLink || item.project_link || '';
                  const isLinkFormat = linkVal.startsWith('http://') || linkVal.startsWith('https://');

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-xs border border-blue-200 font-bold uppercase tracking-wider">
                            {item.projectName || item.project_name}
                          </span>
                          <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded font-extrabold border border-purple-300 uppercase tracking-wider">
                            {item.version || 'v0.1'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-gray-800 uppercase">{item.developerName || item.developer_name}</td>
                      <td className="p-4 text-[11px] text-gray-700">
                        {renderLinkOrBadge(linkVal, isLinkFormat)}
                      </td>
                      <td className="p-4 text-gray-600 whitespace-nowrap">{item.date || 'N/A'}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditId(item.id);
                              setProjectName(item.projectName || item.project_name || '');
                              setVersion(item.version || 'v0.1');
                              setProjectLink(isLinkFormat ? linkVal : '');
                              setSubmissionMode(isLinkFormat ? 'url' : 'apk');
                              setDuplicateError('');
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Edit Submission"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            onClick={() => handleDeleteSubmission(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Submission"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400 italic text-xs">
                    No project builds sent yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DeveloperSendProject;  