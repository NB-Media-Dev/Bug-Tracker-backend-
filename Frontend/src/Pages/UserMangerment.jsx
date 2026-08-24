import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE, authFetch } from '../lib/api';
import {
  UserPlus,
  Search,
  X,
  Mail,
  ShieldCheck,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Edit3,
  Trash2,
  Save,
  User,
  CheckCircle2,
  Code,
} from 'lucide-react';

const Toast = React.memo(({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success:
      'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    error:
      'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
  };

  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div
      className={`fixed top-6 right-6 z-[100] flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl
        max-w-sm text-sm font-medium backdrop-blur-md animate-in slide-in-from-top-2 duration-300
        ${styles[type] || styles.error}`}
    >
      <Icon className="h-5 w-5 mt-0.5 shrink-0" />

      <span className="leading-relaxed">{message}</span>

      <button
        type="button"
        onClick={onClose}
        className="ml-auto shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
});

function UserManagement({ isReadOnly = false, userRole = '' }) {
  const isReadOnlyMode =
    isReadOnly ||
    (userRole || '').toString().toLowerCase() === 'cto';

  const [searchQuery, setSearchQuery] = useState('');
  const [adduser, setAdduser] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const [editingUser, setEditingUser] = useState(null);

  const [editUserData, setEditUserData] = useState({
    name: '',
    email: '',
    role: 'Developer',
    status: 'Active',
    password: '',
  });

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    role: 'Developer',
  });

  // --------------------------------------------------
  // FETCH EMPLOYEES
  // --------------------------------------------------

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setFetchError('');

    try {
      const response = await authFetch(`${API_BASE}/api/users/`);

      if (!response.ok) {
        throw new Error(
          `Server responded with status ${response.status}`
        );
      }

      const data = await response.json();

      setEmployees(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : []
      );
    } catch (err) {
      console.error('Error in fetchEmployees:', err);

      setFetchError(
        'Could not load employees. Make sure the backend server is running on port 8000.'
      );

      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // --------------------------------------------------
  // FILTER EMPLOYEES
  // --------------------------------------------------

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) {
      return employees;
    }

    const query = searchQuery.toLowerCase().trim();

    return employees.filter((emp) => {
      const name = emp?.name?.toLowerCase() || '';
      const email = emp?.company_email?.toLowerCase() || '';
      const role = emp?.role?.toLowerCase() || '';
      const status = emp?.status?.toLowerCase() || '';

      return (
        name.includes(query) ||
        email.includes(query) ||
        role.includes(query) ||
        status.includes(query)
      );
    });
  }, [employees, searchQuery]);

  // --------------------------------------------------
  // STATS
  // --------------------------------------------------

  const stats = useMemo(() => {
    const totalUsersCount = employees.length;
    const testersCount = employees.filter(
      (e) => (e?.role || '').toString().toLowerCase() === 'tester'
    ).length;
    const developersCount = employees.filter(
      (e) => (e?.role || '').toString().toLowerCase() === 'developer'
    ).length;

    return [
      {
        id: 'total-users',
        label: 'TOTAL USERS',
        value: totalUsersCount,
        icon: User,
        color: 'bg-purple-600 text-white shadow-xs',
        accent: 'bg-purple-500',
      },
      {
        id: 'testers',
        label: 'TESTERS',
        value: testersCount,
        icon: CheckCircle2,
        color: 'bg-teal-500 text-white shadow-xs',
        accent: 'bg-teal-500',
      },
      {
        id: 'developers',
        label: 'DEVELOPERS',
        value: developersCount,
        icon: Code,
        color: 'bg-blue-600 text-white shadow-xs',
        accent: 'bg-blue-500',
      },
    ];
  }, [employees]);

  // --------------------------------------------------
  // ROLE BADGE
  // --------------------------------------------------

  const getRoleBadge = (role) => {
    const baseClasses =
      'inline-flex items-center justify-center min-w-20 h-7 px-3 rounded-md text-xs font-semibold border';

    switch (role) {
      case 'Admin':
        return `${baseClasses} bg-indigo-500/10 text-indigo-500 border-indigo-500/20`;

      case 'CTO':
        return `${baseClasses} bg-purple-500/10 text-purple-500 border-purple-500/20`;

      case 'Tester':
        return `${baseClasses} bg-amber-500/10 text-amber-500 border-amber-500/20`;

      default:
        return `${baseClasses} bg-blue-500/10 text-blue-500 border-blue-500/20`;
    }
  };

  // --------------------------------------------------
  // FORM HANDLERS
  // --------------------------------------------------

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setNewUserData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;

    setEditUserData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // --------------------------------------------------
  // OPEN EDIT
  // --------------------------------------------------

  const openEditModal = (emp) => {
    setFormErrors({});

    setEditingUser(emp);

    setEditUserData({
      name: emp?.name || '',
      email: emp?.company_email || emp?.email || '',
      role: emp?.role || 'Developer',
      status: emp?.status || 'Active',
      password: '',
    });
  };

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  const validateRequiredFields = (data) => {
    const errors = {};

    if (!data?.name?.trim()) {
      errors.name = 'Full name is required.';
    }

    const emailVal = data?.email || data?.personal_email;

    if (!emailVal?.trim()) {
      errors.email = 'Email address is required.';
    }

    return errors;
  };

  const parseFieldErrors = (data) => {
    const fieldErrors = {};

    if (!data || typeof data !== 'object') {
      return fieldErrors;
    }

    Object.keys(data).forEach((key) => {
      const value = data[key];

      fieldErrors[key] = Array.isArray(value)
        ? value[0]
        : typeof value === 'object' && value !== null
        ? JSON.stringify(value)
        : value;
    });

    return fieldErrors;
  };

  // --------------------------------------------------
  // UPDATE EMPLOYEE
  // --------------------------------------------------

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();

    if (!editingUser) {
      return;
    }

    const validationErrors =
      validateRequiredFields(editUserData);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setFormErrors({});
    setUpdating(true);

    try {
      const payload = {
        name: editUserData.name.trim(),
        email: editUserData.email.trim(),
        role: editUserData.role,
        status: editUserData.status,
      };

      if (editUserData.password?.trim()) {
        payload.password = editUserData.password;
      }

      const response = await authFetch(
        `${API_BASE}/api/users/${editingUser.id}/`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 400 && data) {
          setFormErrors(parseFieldErrors(data));
        } else {
          setFormErrors({
            general:
              data?.detail ||
              'Unable to update employee.',
          });
        }

        return;
      }

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === editingUser.id ? data : emp
        )
      );

      window.dispatchEvent(
        new Event('user_status_changed')
      );

      window.dispatchEvent(
        new Event('notifications_updated')
      );

      window.dispatchEvent(
        new Event('user_profile_updated')
      );

      setToast({
        type: 'success',
        message:
          'Employee details updated successfully.',
      });

      setEditingUser(null);

      setEditUserData({
        name: '',
        email: '',
        role: 'Developer',
        status: 'Active',
        password: '',
      });
    } catch (err) {
      console.error(
        'Error updating employee:',
        err
      );

      setFormErrors({
        general:
          'Could not update employee profile.',
      });
    } finally {
      setUpdating(false);
    }
  };

  // --------------------------------------------------
  // DELETE EMPLOYEE
  // --------------------------------------------------

  const handleDeleteEmployee = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);

    try {
      const response = await authFetch(
        `${API_BASE}/api/users/${deleteTarget.id}/`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => null);

        throw new Error(
          data?.detail ||
            'Unable to delete employee.'
        );
      }

      setEmployees((prev) =>
        prev.filter(
          (emp) => emp.id !== deleteTarget.id
        )
      );

      window.dispatchEvent(
        new Event('user_status_changed')
      );

      window.dispatchEvent(
        new Event('notifications_updated')
      );

      setToast({
        type: 'success',
        message:
          'Employee deleted successfully.',
      });

      setDeleteTarget(null);
    } catch (err) {
      console.error(
        'Error deleting employee:',
        err
      );

      setToast({
        type: 'error',
        message:
          err?.message ||
          'Could not delete employee.',
      });
    } finally {
      setDeleting(false);
    }
  };

  // --------------------------------------------------
  // SEND INVITE
  // --------------------------------------------------

  const handleSendInvite = async (e) => {
    e.preventDefault();

    const validationErrors =
      validateRequiredFields(newUserData);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setFormErrors({});
    setSubmitting(true);

    try {
      const response = await authFetch(
        `${API_BASE}/api/users/invite/`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: newUserData.name.trim(),
            email: newUserData.email.trim(),
            role: newUserData.role,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        if (response.status === 400 && data) {
          setFormErrors(parseFieldErrors(data));
        } else {
          setFormErrors({
            general:
              data?.detail ||
              'Failed to send invite.',
          });
        }

        return;
      }

      if (data?.employee) {
        setEmployees((prev) => [
          data.employee,
          ...prev,
        ]);
      } else {
        // Refresh the list if backend does not
        // return the newly-created employee.
        await fetchEmployees();
      }

      setToast({
        type: 'success',
        message:
          data?.message ||
          `Invite sent to ${newUserData.email}!`,
      });

      setNewUserData({
        name: '',
        email: '',
        role: 'Developer',
      });

      setFormErrors({});
      setAdduser(false);

      window.dispatchEvent(
        new Event('notifications_updated')
      );
    } catch (err) {
      console.error(
        'Error in handleSendInvite:',
        err
      );

      setFormErrors({
        general:
          'Cannot connect to the server. Make sure the backend is running.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------
  // RENDER EMPLOYEE ROWS
  // --------------------------------------------------

  const renderEmployeeRows = () => {
    const columnCount = isReadOnlyMode ? 6 : 7;

    if (loading) {
      return (
        <tr>
          <td
            colSpan={columnCount}
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
            colSpan={columnCount}
            className="py-12 text-center text-[var(--color-muted-foreground)]"
          >
            {searchQuery
              ? 'No employees match your search query.'
              : 'No employees added yet. Click "Add User" to get started.'}
          </td>
        </tr>
      );
    }

    return filteredEmployees.map((emp) => {
      const onlineIndicatorClass = emp?.is_online
        ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
        : 'bg-slate-300 dark:bg-slate-600';

      const onlineTitle = emp?.is_online
        ? 'Online now'
        : 'Offline';

      const statusClass =
        emp?.status === 'Active'
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
          : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20';

      return (
        <tr
          key={emp.id}
          className="hover:bg-[var(--color-muted)]/50 transition-colors"
        >
          {/* Employee */}
          <td className="px-6 py-4 font-semibold text-foreground">
            <div className="flex items-center gap-2.5">
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${onlineIndicatorClass}`}
                title={onlineTitle}
              />

              <span>
                {emp?.name || 'Unknown User'}
              </span>
            </div>
          </td>

          {/* Email */}
          <td className="px-6 py-4 font-mono text-xs text-foreground">
            {emp?.company_email ||
              emp?.email ||
              '—'}
          </td>

          {/* Role */}
          <td className="px-6 py-4">
            <span
              className={getRoleBadge(emp?.role)}
            >
              {emp?.role || 'Developer'}
            </span>
          </td>

          {/* Account Status */}
          <td className="px-6 py-4">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}`}
            >
              {emp?.status || 'Inactive'}
            </span>
          </td>

          {/* Presence */}
          <td className="px-6 py-4">
            {emp?.is_online ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                Offline
              </span>
            )}
          </td>

          {/* Created Date */}
          <td className="px-6 py-4 text-xs text-[var(--color-muted-foreground)]">
            {emp?.created_at || '—'}
          </td>

          {/* Actions */}
          {!isReadOnlyMode && (
            <td className="px-6 py-4 text-right">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openEditModal(emp)
                  }
                  className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)] text-foreground transition-colors cursor-pointer"
                  title="Edit employee"
                >
                  <Edit3 className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget(emp)
                  }
                  className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-red-500/10 text-red-600 hover:border-red-500/30 transition-colors cursor-pointer"
                  title="Delete employee"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </td>
          )}
        </tr>
      );
    });
  };

  // --------------------------------------------------
  // CLOSE EDIT MODAL
  // --------------------------------------------------

  const closeEditModal = () => {
    setEditingUser(null);

    setFormErrors({});

    setEditUserData({
      name: '',
      email: '',
      role: 'Developer',
      status: 'Active',
      password: '',
    });
  };

  // --------------------------------------------------
  // CLOSE ADD MODAL
  // --------------------------------------------------

  const closeAddModal = () => {
    if (submitting) {
      return;
    }

    setAdduser(false);

    setFormErrors({});

    setNewUserData({
      name: '',
      email: '',
      role: 'Developer',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* TOAST */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5 border-[var(--color-border)]">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            User Management
          </h2>

          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            Manage employee access, track
            Active/Inactive accounts and Online
            status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchEmployees}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Refresh list">
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? 'animate-spin' : ''
              }`}
            />Refresh
          </button>
          {!isReadOnlyMode && (
            <button
              type="button"
              onClick={() => {
                setFormErrors({});
                setAdduser(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <UserPlus className="h-4 w-4" />
              Add User
            </button>
          )}
        </div>
      </div>

      {/* STATS - ADMIN ONLY */}
      {!isReadOnlyMode && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-2xs hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider line-clamp-1">
                    {item.label}
                  </span>

                  <div
                    className={`p-2 rounded-xl shrink-0 ${item.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                    {item.value}
                  </span>

                  {item.change && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-semibold">
                      <span>
                        {item.change}
                      </span>
                    </p>
                  )}
                </div>

                <div
                  className={`mt-4 h-1 rounded-full ${item.accent}`}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* SEARCH */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-2xl border border-[var(--color-border)] shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)]" />

          <input
            type="text"
            placeholder="Search by name, email, role, or status..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            className="w-full pl-10 pr-10 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-[var(--color-muted-foreground)] font-medium">
          Total Employees:{' '}
          <strong className="text-foreground">
            {employees.length}
          </strong>
        </div>
      </div>

      {/* FETCH ERROR */}
      {fetchError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />

            <span>{fetchError}</span>
          </div>

          <button
            type="button"
            onClick={fetchEmployees}
            className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-card rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-muted)] text-[var(--color-muted-foreground)] uppercase text-[11px] tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">
                  Employee
                </th>

                <th className="px-6 py-4">
                  Email
                </th>

                <th className="px-6 py-4">
                  Role
                </th>

                <th className="px-6 py-4">
                  Account Status
                </th>

                <th className="px-6 py-4">
                  Presence
                </th>

                <th className="px-6 py-4">
                  Added Date
                </th>

                {!isReadOnlyMode && (
                  <th className="px-6 py-4 text-right">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--color-border)]">
              {renderEmployeeRows()}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl border border-[var(--color-border)] shadow-2xl p-6 relative space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={closeEditModal}
              className="absolute right-4 top-4 p-1 rounded-lg text-[var(--color-muted-foreground)] hover:text-foreground hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                Edit Employee
              </span>

              <h3 className="text-xl font-bold tracking-tight mt-2">
                Update {editingUser?.name}
              </h3>
            </div>

            {formErrors.general && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  {formErrors.general}
                </span>
              </div>
            )}

            <form
              onSubmit={handleUpdateEmployee}
              className="space-y-4"
            >
              {/* NAME */}
              <div>
                <label
                  htmlFor="edit-name"
                  className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5"
                >
                  Full Name{' '}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  name="name"
                  id="edit-name"
                  required
                  placeholder="e.g. John Doe"
                  value={editUserData.name}
                  onChange={handleEditInputChange}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-[var(--color-background)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                    formErrors.name
                      ? 'border-red-500'
                      : 'border-[var(--color-border)]'
                  }`}
                />

                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1">
                    {formErrors.name}
                  </p>
                )}
              </div>

              {/* EMAIL */}
              <div>
                <label
                  htmlFor="edit-email"
                  className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5"
                >
                  Email{' '}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)]" />

                  <input
                    type="email"
                    name="email"
                    id="edit-email"
                    required
                    placeholder="user@zoho.com"
                    value={editUserData.email}
                    onChange={handleEditInputChange}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm bg-[var(--color-background)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                      formErrors.email
                        ? 'border-red-500'
                        : 'border-[var(--color-border)]'
                    }`}
                  />
                </div>

                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1">
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* ROLE */}
              <div>
                <label
                  htmlFor="edit-role"
                  className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5"
                >
                  System Role
                </label>

                <select
                  name="role"
                  id="edit-role"
                  value={editUserData.role}
                  onChange={handleEditInputChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                >
                  <option value="Developer">
                    Developer
                  </option>

                  <option value="Tester">
                    Tester
                  </option>

                  <option value="CTO">
                    CTO
                  </option>
                </select>
              </div>

              {/* STATUS */}
              <div>
                <label
                  htmlFor="edit-status"
                  className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5"
                >
                  Account Status
                </label>

                <select
                  name="status"
                  id="edit-status"
                  value={editUserData.status}
                  onChange={handleEditInputChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </div>

              {/* PASSWORD */}
              <div>
                <label
                  htmlFor="edit-password"
                  className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5"
                >
                  New Password{' '}
                  <span className="text-[10px] text-gray-400 font-normal">
                    (Leave blank to keep current)
                  </span>
                </label>

                <input
                  type="password"
                  id="edit-password"
                  name="password"
                  placeholder="Enter new password"
                  value={
                    editUserData.password || ''
                  }
                  onChange={handleEditInputChange}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-[var(--color-background)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                    formErrors.password
                      ? 'border-red-500'
                      : 'border-[var(--color-border)]'
                  }`}
                />

                {formErrors.password && (
                  <p className="text-xs text-red-500 mt-1">
                    {formErrors.password}
                  </p>
                )}
              </div>

              {/* BUTTONS */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={updating}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--color-muted)] transition-colors cursor-pointer disabled:opacity-50"
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

      {/* DELETE MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-[var(--color-border)] shadow-2xl p-6 relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-lg font-semibold">
                  Delete employee?
                </h3>

                <p className="text-sm text-[var(--color-muted-foreground)]">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-sm text-[var(--color-muted-foreground)]">
              Remove{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name}
              </span>{' '}
              from the system?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--color-muted)] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
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

      {/* ADD USER MODAL */}
      {adduser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl border border-[var(--color-border)] shadow-2xl p-6 relative space-y-5">
            <button
              type="button"
              onClick={closeAddModal}
              className="absolute right-4 top-4 p-1 rounded-lg text-[var(--color-muted-foreground)] hover:text-foreground hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                New Employee
              </span>

              <h3 className="text-xl font-bold tracking-tight mt-2">
                Add New Employee
              </h3>
            </div>

            {formErrors.general && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />

                <span>
                  {formErrors.general}
                </span>
              </div>
            )}

            <form
              onSubmit={handleSendInvite}
              className="space-y-4"
            >
              {/* NAME */}
              <div>
                <label
                  htmlFor="add-name"
                  className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5"
                >
                  Full Name{' '}
                  <span className="text-red-500">
                    *
                  </span>
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
                    formErrors.name
                      ? 'border-red-500'
                      : 'border-[var(--color-border)]'
                  }`}
                />

                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1">
                    {formErrors.name}
                  </p>
                )}
              </div>

              {/* EMAIL */}
              <div>
                <label
                  htmlFor="add-email"
                  className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5"
                >
                  Email{' '}
                  <span className="text-red-500">
                    *
                  </span>
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
                      formErrors.email
                        ? 'border-red-500'
                        : 'border-[var(--color-border)]'
                    }`}
                  />
                </div>

                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1">
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* ROLE */}
              <div>
                <label
                  htmlFor="add-role"
                  className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5"
                >
                  System Role
                </label>

                <select
                  id="add-role"
                  name="role"
                  value={newUserData.role}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                >
                  <option value="Developer">
                    Developer
                  </option>

                  <option value="Tester">
                    Tester
                  </option>

                  <option value="CTO">
                    CTO
                  </option>
                </select>
              </div>

              {/* BUTTONS */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--color-muted)] transition-colors cursor-pointer disabled:opacity-50"
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
