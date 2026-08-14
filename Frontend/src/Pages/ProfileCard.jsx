import { Mail, Search, Calendar, Shield, FileSpreadsheet, User } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { API_BASE, authFetch } from '../lib/api';

function ProfileCard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState([]);
  // const [isExporting, setIsExporting] = useState(false);
  const [confirmExportUser, setConfirmExportUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await authFetch(`${API_BASE}/api/users/`);
      if (response.ok) {
        const data = await response.json();
        const results = Array.isArray(data) ? data : (data.results || []);
        setEmployees(results);
        localStorage.setItem("all_employees_list", JSON.stringify(results));
      } else {
        const cached = localStorage.getItem("all_employees_list");
        if (cached) {
          setEmployees(JSON.parse(cached));
        }
      }
    } catch {
      const cached = localStorage.getItem("all_employees_list");
      if (cached) {
        setEmployees(JSON.parse(cached));
      }
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const filteredUsers = employees.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.personal_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.company_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportUserBugs = async (user) => {
    try {
      const response = await authFetch(`${API_BASE}/api/bugs/`);
      if (!response.ok) {
        throw new Error('Unable to load bug reports.');
      }

      const reports = await response.json();
      const userName = (user.name || '').toLowerCase();
      const employeeId = (user.employee_id || user.id || '').toString().toLowerCase();
      const role = (user.role || '').toLowerCase();

      const filteredReports = (Array.isArray(reports) ? reports : []).filter((report) => {
        const developerName = (report.developer_name || report.developerName || '').toLowerCase();
        const testerName = (report.tester_name || report.testerName || '').toLowerCase();
        const developerId = (report.developer_id || report.developerId || '').toLowerCase();
        const testerId = (report.tester_id || report.testerId || '').toLowerCase();

        if (role === 'developer') {
          return developerName.includes(userName) || developerId.includes(employeeId);
        } else if (role === 'tester') {
          return testerName.includes(userName) || testerId.includes(employeeId);
        }
        return developerName.includes(userName) || testerName.includes(userName) || 
               developerId.includes(employeeId) || testerId.includes(employeeId);
      });

      if (!filteredReports.length) {
        alert(`No bug reports found for ${user.name || 'this user'}.`);
        return;
      }

      const headers = ['Bug ID', 'Title', 'Status', 'Severity', 'Project Name', 'Developer Name', 'Developer ID', 'Tester Name', 'Tester ID', 'Created At'];
      const rows = filteredReports.map((report) => [
        report.bug_id || report.id,
        report.title || '',
        report.status || '',
        report.severity || '',
        report.module || '',
        report.developer_name || report.developerName || '',
        report.developer_id || report.developerId || '',
        report.tester_name || report.testerName || '',
        report.tester_id || report.testerId || '',
        report.created_at || report.assignedOn || ''
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bug-report-${user.name.replaceAll(' ', '_')}-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();  
      link.remove();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("error in profilecard",error);
      
      alert(error.message || 'Unable to generate the report.');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
        <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-1">
            User Profile
          </h2>
        </div>
      </div>
      
      <div className="bg-white border border-[var(--color-sidebar-border,rgba(0,0,0,0.1))] p-4 rounded-xl shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:max-w-2xl">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name, email, role, or employee ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-44 rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-700 font-medium shrink-0"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div> 

      
      {filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-gray-300 text-center">
          <Search className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-700">No members found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
  {filteredUsers.map((user) => (
    <button 
      key={user.id} 
      type="button"
      onClick={() => setConfirmExportUser(user)}
      aria-label={`Export bug report for ${user.name}, Role: ${user.role || 'User'}, Employee ID: ${user.employee_id || 'N/A'}`}
      className="w-full text-left border border-[var(--color-sidebar-border,rgba(0,0,0,0.1))] p-5 rounded-xl shadow-sm bg-white transition-all hover:shadow-md hover:-translate-y-1 focus:-translate-y-1 focus:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 flex flex-col justify-between cursor-pointer group"
    >
      <div className="w-full">
        <div className="flex items-center space-x-4 mb-4">
          <div className="h-12 w-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 text-lg uppercase group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 group-focus:bg-emerald-50 group-focus:text-emerald-600 group-focus:border-emerald-100 transition-colors">
            {user.name ? user.name.substring(0, 2) : 'AA'}
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800">{user.name}</h3>
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium mt-1 ${
              user.role === 'Developer' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
            }`}>
              <Shield className="h-3 w-3" aria-hidden="true" />
              {user.role}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-2.5 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Email
            </span>
            <span className="font-medium text-gray-700 truncate max-w-[160px]" title={user.company_email || user.personal_email}>
              {user.company_email || user.personal_email}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" aria-hidden="true" /> Employee ID
            </span>
            <span className="font-mono text-gray-700 font-bold uppercase">
              {user.employee_id || 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" /> Status
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
              user.status === 'Active'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
              {user.status || 'Active'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> Created
            </span>
            <span className="font-medium text-gray-700">{user.created_at}</span>
          </div>
        </div>
      </div>

      <div className="w-full mt-4 pt-3 border-t border-dashed border-gray-100 flex items-center justify-between text-xs text-gray-400 group-hover:text-emerald-600 group-focus:text-emerald-600 font-semibold transition-colors">
        <span>Export Bug Report</span>
        <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
      </div>
    </button>
  ))}
</div>

      )}

      {confirmExportUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-150 animate-in zoom-in-95 duration-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            
            <div className="space-y-1 text-gray-800">
              <h3 className="font-bold text-gray-900 text-base">Generate Excel Report?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Would you like to export the bug report for <strong className="text-gray-805 font-bold">{confirmExportUser.name}</strong> as an Excel spreadsheet?
              </p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmExportUser(null)}
                className="flex-1 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer border border-gray-200"
              >
                No, Cancel
              </button>
              <button
                onClick={() => {
                  exportUserBugs(confirmExportUser);
                  setConfirmExportUser(null);
                }}
                className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-xs border border-transparent"
              >
                Yes, Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileCard;
