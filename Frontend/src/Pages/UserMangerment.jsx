

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE, authFetch } from '../lib/api';
import { UserPlus, Search, X, Mail, ShieldCheck, Send, CheckCircle, AlertCircle, Loader2, RefreshCw, Edit3, Trash2, Save } from 'lucide-react';

const Toast = React.memo(({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
  };

  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div
      className={`fixed top-6 right-6 z-[100] flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl
        max-w-sm text-sm font-medium backdrop-blur-md animate-in slide-in-from-top-2 duration-300
        ${styles[type]}`}
    >
      <Icon className="h-5 w-5 mt-0.5 shrink-0" />
      <span className="leading-relaxed">{message}</span>
      <button onClick={onClose} className="ml-auto shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
});

function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [adduser, setAdduser] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserData, setEditUserData] = useState({
    name: '',
    email: '',
    role: 'Developer',
    status: 'Active',
  });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    role: 'Developer',
  });

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const response = await authFetch(`${API_BASE}/api/users/`);
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      const data = await response.json();
      setEmployees(data.results || []);
    } catch (err) {
      console.error("error in fetchemployess", err);
      setFetchError(
        'Could not load employees. Make sure the backend server is running on port 8000.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const query = searchQuery.toLowerCase().trim();
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(query) ||
        (emp.company_email && emp.company_email.toLowerCase().includes(query)) ||
        emp.role.toLowerCase().includes(query) ||
        emp.status?.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  const getRoleBadge = (role) => {
  const baseClasses =
    'inline-flex items-center justify-center w-20 h-7 px-3 rounded-md text-xs font-semibold border';

  switch (role) {
    case 'Admin':
      return `${baseClasses} bg-indigo-500/10 text-indigo-500 border-indigo-500/20`;

    case 'Tester':
      return `${baseClasses} bg-amber-500/10 text-amber-500 border-amber-500/20`;

    default:
      return `${baseClasses} bg-blue-500/10 text-blue-500 border-blue-500/20`;
  }
};


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUserData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditUserData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const openEditModal = (emp) => {
    setEditingUser(emp);
    setEditUserData({
      name: emp.name,
      email: emp.company_email,
      role: emp.role,
      status: emp.status,
      password: '',
    });
    setFormErrors({});
  };

  const validateRequiredFields = (data) => {
    const errors = {};
    if (!data.name?.trim()) errors.name = 'Full name is required.';
    const emailVal = data.email || data.personal_email;
    if (!emailVal?.trim()) errors.email = 'Email address is required.';
    return errors;
  };

  const parseFieldErrors = (data) => {
    const fieldErrors = {};
    Object.keys(data).forEach((key) => {
      fieldErrors[key] = Array.isArray(data[key]) ? data[key][0] : data[key];
    });
    return fieldErrors;
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    const validationErrors = validateRequiredFields(editUserData);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }
    setFormErrors({});

    setUpdating(true);
    try {
      const payload = { ...editUserData };
      if (!payload.password) delete payload.password;

      const response = await authFetch(`${API_BASE}/api/users/${editingUser.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setFormErrors(response.status === 400 && data ? parseFieldErrors(data) : { general: data?.detail || 'Unable to update employee.' });
        return;
      }

      setEmployees((prev) => prev.map((emp) => (emp.id === editingUser.id ? data : emp)));
      window.dispatchEvent(new Event("user_status_changed"));
      setToast({ type: 'success', message: 'Employee details updated successfully.' });
      setEditingUser(null);
      setEditUserData({ name: '', email: '', role: 'Developer', status: 'Active', password: '' });
    } catch {
      setFormErrors({ general: 'Could not update employee profile.' });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const response = await authFetch(`${API_BASE}/api/users/${deleteTarget.id}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail || 'Unable to delete employee.');
      }

      setEmployees((prev) => prev.filter((emp) => emp.id !== deleteTarget.id));
      window.dispatchEvent(new Event("user_status_changed"));
      setToast({ type: 'success', message: 'Employee deleted successfully.' });
      setDeleteTarget(null);
    } catch (err) {
      console.error("error in usermanagement", err);
      setToast({ type: 'error', message: err.message || 'Could not delete employee.' });
    } finally {
      setDeleting(false);
    }
  };

const renderEmployeeRows = () => {
  if (loading) {
    return (
      <tr>
        <td
          colSpan={8}
          className="py-12 text-center text-[var(--color-muted-foreground)]"
        >
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
          <span>Loading employees...</span>
        </td>
      </tr>
    );
  }

  if (filteredEmployees.length === 0) {
    return (
      <tr>
        <td
          colSpan={8}
          className="py-12 text-center text-[var(--color-muted-foreground)]"
        >
          {searchQuery
            ? "No employees match your search query."
            : 'No employees added yet. Click "Add User" to get started.'}
        </td>
      </tr>
    );
  }

  return filteredEmployees.map((emp) => {
    const onlineIndicatorClass = emp.is_online
      ? "bg-emerald-500 ring-4 ring-emerald-500/20"
      : "bg-slate-300 dark:bg-slate-600";

    const onlineTitle = emp.is_online ? "Online now" : "Offline";

    const statusClass =
      emp.status === "Active"
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
        : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20";

    const onlineStatus = emp.is_online ? (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
        Online
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
        Offline
      </span>
    );

    return (
      <tr
        key={emp.id}
        className="hover:bg-[var(--color-muted)]/50 transition-colors"
      >
        <td className="px-6 py-4 font-semibold text-foreground">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${onlineIndicatorClass}`}
              title={onlineTitle}
            />
            <span>{emp.name}</span>
          </div>
        </td>

        <td className="px-6 py-4 font-mono text-xs text-foreground">
          {emp.company_email}
        </td>

        <td className="px-6 py-4">
          <span
            className={`inline-block px-2.5 py-1 rounded-lg text-xs ${getRoleBadge(
              emp.role
            )}`}
          >
            {emp.role}
          </span>
        </td>

        <td className="px-6 py-4">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}`}
          >
            {emp.status}
          </span>
        </td>

        <td className="px-6 py-4">
          {onlineStatus}
        </td>

        <td className="px-6 py-4 text-xs text-[var(--color-muted-foreground)]">
          {emp.created_at}
        </td>

        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => openEditModal(emp)}
              className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)] text-foreground transition-colors cursor-pointer"
              title="Edit employee"
            >
              <Edit3 className="h-4 w-4" />
            </button>

            <button
              onClick={() => setDeleteTarget(emp)}
              className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-red-500/10 text-red-600 hover:border-red-500/30 transition-colors cursor-pointer"
              title="Delete employee"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  });
};

const employeeRows = renderEmployeeRows();

  const handleSendInvite = async (e) => {
    e.preventDefault();

    const validationErrors = validateRequiredFields(newUserData);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }
    setFormErrors({});
    setSubmitting(true);

    try {
      const response = await authFetch(`${API_BASE}/api/users/invite/`, {
        method: 'POST',
        body: JSON.stringify(newUserData),
      });
      const data = await response.json();

      if (!response.ok) {
        let errors;
        if (response.status === 400 && data) {
          errors = parseFieldErrors(data);
        } else {
          const detailMsg = data?.detail || 'Failed to send invite.';
          errors = { general: detailMsg };
        }
        setFormErrors(errors);
        setSubmitting(false);
        return;
      }

      if (data.employee) {
        setEmployees((prev) => [data.employee, ...prev]);
      }

      setToast({
        type: 'success',
        message: data.message || `Invite sent to ${newUserData.email}!`,
      });

      setNewUserData({ name: '', email: '', role: 'Developer' });
      setAdduser(false);
    } catch (err) {
      console.error("error in handlesendinvite", err);
      setFormErrors({
        general: 'Cannot connect to the server. Make sure the backend is running.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5 border-[var(--color-border)]">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            Manage employee access, track Active/Inactive accounts and Online status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchEmployees}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setAdduser(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-2xl border border-[var(--color-border)] shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            placeholder="Search by name, email, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs text-[var(--color-muted-foreground)] font-medium">
          Total Employees: <strong className="text-foreground">{employees.length}</strong>
        </div>
      </div>

      {fetchError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={fetchEmployees}
            className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-xs">
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-[var(--color-muted)] text-[var(--color-muted-foreground)] uppercase text-[11px] tracking-wider font-semibold">
        <tr>
          <th className="px-6 py-4">Employee</th>
          <th className="px-6 py-4">Email</th>
          <th className="px-6 py-4">Role</th>
          <th className="px-6 py-4">Account Status</th>
          <th className="px-6 py-4">Presence</th>
          <th className="px-6 py-4">Added Date</th>
          <th className="px-6 py-4 text-right">Actions</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-[var(--color-border)]">
       {employeeRows}
      </tbody>
    </table>
  </div>
</div>

      {editingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl border border-[var(--color-border)] shadow-2xl p-6 relative space-y-5">
            <button
              onClick={() => {
                setEditingUser(null);
                setFormErrors({});
              }}
              className="absolute right-4 top-4 p-1 rounded-lg text-[var(--color-muted-foreground)] hover:text-foreground hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                Edit Employee
              </span>
              <h3 className="text-xl font-bold tracking-tight mt-2">Update {editingUser.name}</h3>
            </div>

            {formErrors.general && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formErrors.general}</span>
              </div>
            )}

            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  placeholder="e.g. John Doe"
                  value={editUserData.name}
                  onChange={handleEditInputChange}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-[var(--color-background)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                    formErrors.name ? 'border-red-500' : 'border-[var(--color-border)]'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)]" />
                  <input
                    type="email"
                    name="email"
                    id="email"
                    required
                    placeholder="user@zoho.com"
                    value={editUserData.email}
                    onChange={handleEditInputChange}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm bg-[var(--color-background)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                      formErrors.email ? 'border-red-500' : 'border-[var(--color-border)]'
                    }`}
                  />
                </div>
                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="role" className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5">
                  System Role
                </label>
                <select
                  name="role"
                  id="role"
                  value={editUserData.role}
                  onChange={handleEditInputChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                >
                  <option value="Developer">Developer</option>
                  <option value="Tester">Tester</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5">
                  Account Status
                </label>
                <select
                  name="status"
                  id="status"
                  value={editUserData.status}
                  onChange={handleEditInputChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5">
                  New Password <span className="text-[10px] text-gray-400 font-normal">(Leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Enter new password"
                  value={editUserData.password || ''}
                  onChange={handleEditInputChange}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-[var(--color-background)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                    formErrors.password ? 'border-red-500' : 'border-[var(--color-border)]'
                  }`}
                />
                {formErrors.password && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setFormErrors({});
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-[var(--color-border)] shadow-2xl p-6 relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Delete employee?</h3>
                <p className="text-sm text-[var(--color-muted-foreground)]">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Remove <span className="font-semibold text-foreground">{deleteTarget.name}</span> from the system?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEmployee}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {adduser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl border border-[var(--color-border)] shadow-2xl p-6 relative space-y-5">
            <button
              onClick={() => {
                setAdduser(false);
                setFormErrors({});
              }}
              className="absolute right-4 top-4 p-1 rounded-lg text-[var(--color-muted-foreground)] hover:text-foreground hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                New Employee
              </span>
              <h3 className="text-xl font-bold tracking-tight mt-2">
                {'Add New Employee'}
              </h3>
            </div>

            {formErrors.general && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formErrors.general}</span>
              </div>
            )}
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label htmlFor="add-name" className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="add-name"
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. John Doe"
                  value={newUserData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-[var(--color-background)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                    formErrors.name ? 'border-red-500' : 'border-[var(--color-border)]'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="add-email" className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)]" />
                  <input
                    type="email"
                    id="add-email"
                    name="email"
                    required
                    placeholder="e.g. user@zoho.com"
                    value={newUserData.email}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm bg-[var(--color-background)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                      formErrors.email ? 'border-red-500' : 'border-[var(--color-border)]'
                    }`}
                  />
                </div>
                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="add-role" className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5">
                  System Role
                </label>
                <select
                  id="add-role"
                  name="role"
                  value={newUserData.role}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                >
                  <option value="Developer">Developer</option>
                  <option value="Tester">Tester</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => {
                    setAdduser(false);
                    setFormErrors({});
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending Invite...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Invite
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;  