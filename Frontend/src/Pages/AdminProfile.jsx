import { useState, useEffect, useRef } from "react";
import { User, Mail, Shield, Camera, CheckCircle, Lock, Award, Users, HardDrive, AlertOctagon } from "lucide-react";
import { API_BASE, authFetch } from "../lib/api";
import ToastNotification, { useToast } from "../components/ui/ToastNotification";
import PasswordInput from "../components/shared/PasswordInput";
import { getStoredAvatar, saveStoredAvatar } from "../lib/avatar";

export default function AdminProfile() {
  const adminUser = JSON.parse(localStorage.getItem("admin_user") || "{}");
  const [formData, setFormData] = useState({
    name: adminUser.username || adminUser.first_name || "Admin User",
    email: adminUser.email || "admin@example.com",
    role: "System Administrator",
    newPassword: "",
    confirmPassword: ""
  });
  const [metrics, setMetrics] = useState({ totalUsers: 0, monitors: 0, openIssues: 0 });
  const [avatarSrc, setAvatarSrc] = useState(() => getStoredAvatar(adminUser));
  const fileInputRef = useRef(null);

  const { toast, showToast } = useToast();

  useEffect(() => {
    const updateAvatar = () => {
      setAvatarSrc(getStoredAvatar(adminUser));
    };
    updateAvatar();
    window.addEventListener("user_profile_updated", updateAvatar);
    return () => {
      window.removeEventListener("user_profile_updated", updateAvatar);
    };
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file.", "error", 4000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image file size must be less than 5MB.", "error", 4000);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result;
      saveStoredAvatar(adminUser, base64Data);
      setAvatarSrc(base64Data);
      showToast("Admin profile picture updated successfully!", "success", 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    showToast("Admin profile info saved.", "success", 3000);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!formData.newPassword) {
      showToast("Please enter a new password.", "error", 4000);
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      showToast("New passwords do not match!", "error", 4000);
      return;
    }

    try {
      const response = await authFetch(`${API_BASE}/api/auth/change-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          new_password: formData.newPassword
        })
      });
      const data = await response.json();
      if (response.ok) {
        showToast("Admin password updated successfully in database!", "success", 4000);
        setFormData(prev => ({ ...prev, newPassword: "", confirmPassword: "" }));
      } else {
        showToast(data.detail || "Failed to update admin password.", "error", 4000);
      }
    } catch (err) {
      console.error("error in adminprofile", err);
      showToast("Server connection error.", "error", 4000);
    }
  };

  const normalizeRole = (user) => {
    return (user.role || user.user_role || "").toString().trim().toLowerCase();
  };

  const getBugStatus = (bug) => {
    return (bug.status || bug.testerStatus || bug.devStatus || "").toString().trim().toLowerCase();
  };

  const isOpenBug = (status) => {
    return !["closed", "resolved", "not fixed"].includes(status);
  };

  useEffect(() => {
    const loadAdminProfile = async () => {
      try {
        const usersRes = await authFetch(`${API_BASE}/api/users/`);
        const bugsRes = await authFetch(`${API_BASE}/api/bugs/`);

        let users = [];
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          users = Array.isArray(usersData) ? usersData : usersData.results || [];
          const backendAdmin = users.find((user) => {
            const emailMatches = user.email?.toLowerCase() === adminUser.email?.toLowerCase();
            const companyEmailMatches = user.company_email?.toLowerCase() === adminUser.email?.toLowerCase();
            const usernameMatches = user.username?.toLowerCase() === adminUser.email?.toLowerCase();
            return emailMatches || companyEmailMatches || usernameMatches;
          });
          if (backendAdmin) {
            setFormData((prev) => ({
              ...prev,
              name: backendAdmin.username || backendAdmin.first_name || prev.name,
              email: backendAdmin.email || backendAdmin.company_email || prev.email,
              role: backendAdmin.role || prev.role
            }));
          }

          const totalUsers = users.length;
          const monitors = users.filter((u) => normalizeRole(u) === "monitor").length;
          setMetrics((prev) => ({ ...prev, totalUsers, monitors }));
        }

        if (bugsRes.ok) {
          const bugs = await bugsRes.json();
          const bugList = Array.isArray(bugs) ? bugs : bugs.results || [];
          const openIssues = bugList.filter((bug) => {
            return isOpenBug(getBugStatus(bug));
          }).length;
          setMetrics((prev) => ({ ...prev, openIssues }));
        }
      } catch (error) {
        console.error("Error loading admin profile metrics", error);
      }
    };

    loadAdminProfile();
  }, [adminUser.email]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 font-sans text-gray-800 antialiased">
      <ToastNotification {...toast} />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarChange}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
      />

      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="h-32 md:h-44 bg-gradient-to-r from-slate-800 via-indigo-900 to-slate-900" />
        <div className="p-6 pt-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 -mt-12 md:-mt-16">
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-end w-full sm:w-auto">
            <div className="relative">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={formData.name || "Admin"}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-md object-cover bg-white shrink-0"
                />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-md bg-slate-100 flex items-center justify-center text-slate-800 font-bold text-3xl overflow-hidden uppercase shrink-0">
                  {formData.name ? formData.name.substring(0, 2) : "AD"}
                </div>
              )}
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 p-2 rounded-full bg-slate-800 text-white border-2 border-white shadow hover:bg-slate-950 hover:scale-105 transition-all cursor-pointer"
                title="Change Photo"
              >
                <Camera size={14} />
              </button>
            </div>
            <div className="text-center sm:text-left pb-2">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center justify-center sm:justify-start gap-2">
                {formData.name || "Admin User"}
                <Award size={18} className="text-blue-600 shrink-0" />
              </h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{formData.role}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full md:w-auto mt-2 md:mt-0 max-w-sm ml-auto">
            <div className="bg-violet-50/50 border border-violet-100 p-2.5 rounded-xl text-center">
              <div className="flex items-center justify-center text-violet-600 mb-1">
                <Users size={16} />
              </div>
              <div className="text-base font-bold text-gray-900">{metrics.totalUsers}</div>
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Total Users</div>
            </div>
            <div className="bg-teal-50/50 border border-teal-100 p-2.5 rounded-xl text-center">
              <div className="flex items-center justify-center text-teal-600 mb-1">
                <HardDrive size={16} />
              </div>
              <div className="text-base font-bold text-gray-900">{metrics.monitors}</div>
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Monitors</div>
            </div>
            <div className="bg-rose-50/50 border border-rose-100 p-2.5 rounded-xl text-center">
              <div className="flex items-center justify-center text-rose-600 mb-1">
                <AlertOctagon size={16} />
              </div>
              <div className="text-base font-bold text-gray-900">{metrics.openIssues}</div>
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Open Issues</div>
            </div>
          </div>
        </div>
      </div>

  
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
      
        <div className="lg:col-span-2 space-y-6">
       
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Admin Account Info</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage your system name and admin job title.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                    id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2 text-xs border border-gray-300 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800 transition-all text-gray-800 font-medium"
                      placeholder="e.g. Admin User"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="role" className="block text-xs font-semibold text-gray-600 mb-1">Job Title <span className="text-[10px] text-gray-500">(Read-only)</span></label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                    id="role"
                      type="text"
                      name="role"
                      value={formData.role}
                      readOnly
                      className="w-full pl-10 pr-4 py-2 text-xs border border-gray-300 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed transition-all"
                      placeholder="System Administrator"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-1">Email Address <span className="text-[10px] text-gray-500">(Read-only)</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                  id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    readOnly
                    className="w-full pl-10 pr-4 py-2 text-xs border border-gray-300 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed transition-all"
                    placeholder="admin@example.com"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm active:scale-95"
                >
                  <CheckCircle size={14} />
                  Save Admin Info
                </button>
              </div>
            </form>
          </div>
        </div>

        
        

      </div>
    </div>
  );
}
