import React, { useState, useEffect, useCallback } from 'react';
import { FileArchive, CheckCircle2, Send, Layers, User, Edit2, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { API_BASE, authFetch } from '../../lib/api';

function DesignerSendProject({ designer }) {
  const designerName = designer?.name || 'Designer';
  const designerId = designer?.employee_id || (designer?.id ? `DES${String(designer.id).padStart(3, '0')}` : 'DES001');
  const fullDesignerName = `${designerName}`;

  const [projectName, setProjectName] = useState('');
  const [projectLink, setProjectLink] = useState('');
  const [editId, setEditId] = useState(null);
  const [submittedProjects, setSubmittedProjects] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [duplicateError, setDuplicateError] = useState('');

  const createSubmissionId = (projName, dId, existingSubs = []) => {
    const cleanId = (dId || 'des001').trim().toLowerCase();
    const cleanProj = (projName || 'prj').trim();
    const words = cleanProj.match(/[a-zA-Z0-9]+/g) || [];

    let acronym = 'prj';
    if (words.length > 1) {
      acronym = words.map((w) => w[0]).join('').toLowerCase();
    } else if (words.length === 1) {
      const w = words[0].toLowerCase();
      acronym = w.slice(0, 3);
    }
    const prefix = `${cleanId}-${acronym}`;

    const matching = (existingSubs || []).filter((s) => {
      const sId = (s.id || '').toLowerCase();
      return sId.startsWith(prefix);
    });

    let maxSeq = 0;
    matching.forEach((s) => {
      const parts = s.id.split('-');
      if (parts.length >= 3) {
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });

    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    return `${prefix}-${nextSeq}`;
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
      const res = await authFetch(`${API_BASE}/api/bugs/submissions/?developer_id=${encodeURIComponent(designerId)}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.results || [];
        setSubmittedProjects(items);
      }
    } catch (e) {
      console.error("Error loading submissions", e);
    }
  }, [designerId]);

  useEffect(() => {
    loadSubmissions();
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
    setEditId(null);
    setDuplicateError('');
  };

  const handleEditSubmission = async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/bugs/submissions/${editId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: projectName.trim(),
          version: '',
          project_link: projectLink.trim(),
          projectLink: projectLink.trim(),
        })
      });
      if (res.ok) {
        loadSubmissions();
        setSuccessMessage(`Project successfully updated!`);
        resetSubmissionForm();
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        const errJson = await res.json();
        const msg = errJson.detail || JSON.stringify(errJson);
        alert(`Failed to update project: ${msg}`);
      }
    } catch (err) {
      console.error("Error patching project submission", err);
    }
  };

  const handleCreateSubmission = async () => {
    const subId = createSubmissionId(projectName, designerId, submittedProjects);

    const postPayload = {
      id: subId,
      project_name: projectName.trim(),
      version: '',
      projectLink: projectLink.trim(),
      developer_name: fullDesignerName,
      developer_id: designerId,
      subject: `${projectName.trim()} Project Submission`,
      status: "Unread",
      downloaded: "false",
      project_link: projectLink.trim(),
    };

    try {
      const res = await authFetch(`${API_BASE}/api/bugs/submissions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postPayload)
      });
      if (res.ok) {
        loadSubmissions();
        sendAdminNotification(`Designer ${fullDesignerName} submitted project "${projectName.trim()}".`);
        setSuccessMessage(`Project logged successfully!`);
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
      const errMsg = `You have already submitted a project with the name "${projectName.trim()}". Duplicate project submissions are not allowed!`;
      setDuplicateError(errMsg);
      alert(errMsg);
      return;
    }

    if (!projectLink.trim()) {
      alert("Please provide the Project Link / URL.");
      return;
    }

    if (editId) {
      await handleEditSubmission();
    } else {
      await handleCreateSubmission();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-gray-800 antialiased">
      <div>
        <div className="flex items-center gap-2">
          <FileArchive className="h-6 w-6 text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-900">Send Project to Testers</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          Provide the project link (Figma, prototype, design URL) to submit directly to testers for review.
        </p>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold shadow-2xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

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
              placeholder="e.g. Authentication Module UI, E-Commerce Mobile App Design"
              className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-gray-50/30 font-medium"
              required
            />
            {duplicateError && (
              <p className="mt-1.5 text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg border border-red-200">
                {duplicateError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor='designername' className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Designer Name (Fixed)
            </label>
            <div className="flex items-center gap-2 bg-gray-100 border border-gray-300 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-700 cursor-not-allowed">
              <User size={15} className="text-gray-500" />
              <span>{fullDesignerName}</span>
              <span className="ml-auto text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-semibold uppercase">Auto-Filled</span>
            </div>
          </div>

          <div className="space-y-4">
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
                placeholder="e.g. https://www.figma.com/file/... or https://localhost:3000/design"
                className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-gray-50/30 font-medium"
                required
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Send size={15} /> {editId ? "Update Project Submission" : "Send Project to All Testers"}
              </button>
              {editId && (
                <button
                  type="button"
                  onClick={resetSubmissionForm}
                  className="py-3 px-5 bg-gray-500 hover:bg-gray-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-2xs border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-emerald-600" size={18} />
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Sent Projects ({submittedProjects.length})</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="p-4">Project Name</th>
                <th className="p-4">Designer</th>
                <th className="p-4">Project Link</th>
                <th className="p-4">Submitted Date</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
              {submittedProjects.length > 0 ? (
                submittedProjects.map((item) => {
                  const linkVal = item.projectLink || item.project_link || '';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-4">
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded text-xs border border-emerald-200 font-bold uppercase tracking-wider">
                          {item.projectName || item.project_name}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-gray-800 uppercase">{item.developerName || item.developer_name}</td>
                      <td className="p-4 text-[11px] text-gray-700">
                        {linkVal ? (
                          <a
                            href={linkVal}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:underline flex items-center gap-1 font-mono"
                          >
                            <LinkIcon size={12} /> {linkVal}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">No link</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-600 whitespace-nowrap">
                        {(() => {
                          const raw = item.date_submitted || item.created_at;
                          if (raw) {
                            const d = new Date(raw);
                            if (!isNaN(d.getTime())) {
                              return d.toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }) + ", " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                            }
                          }
                          return item.date || 'N/A';
                        })()}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditId(item.id);
                              setProjectName(item.projectName || item.project_name || '');
                              setProjectLink(linkVal);
                              setDuplicateError('');
                            }}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors cursor-pointer"
                            title="Edit Project"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400 italic text-xs">
                    No projects sent yet.
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

export default DesignerSendProject;
