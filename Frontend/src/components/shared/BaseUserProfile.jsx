import { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  Shield,
  Camera,
  CheckCircle,
  Lock,
  Award,
  Bug,
  CheckSquare,
  Clock,
} from "lucide-react";
import { API_BASE } from "../../lib/api";
import ToastNotification, { useToast } from "../ui/ToastNotification";
import PasswordInput from "./PasswordInput";
import { getStoredAvatar, saveStoredAvatar } from "../../lib/avatar";

export default function BaseUserProfile({
  user,
  storageKey = "user",
  defaultValues = {},
  title = "Public Info",
  subtitle = "Manage your public account name and role title.",
  statCards: propStatCards,
  onFetchStats,
  saveSuccessMessage = "Profile info saved!",
  passwordUpdateSuccessMessage = "Password updated successfully in database!",
}) {
  const initialUserData =
    user || JSON.parse(localStorage.getItem(storageKey) || "{}");

  const userName =
    initialUserData.name ||
    initialUserData.username ||
    initialUserData.first_name ||
    defaultValues.name ||
    "User";

  const userEmail =
    initialUserData.company_email ||
    initialUserData.personal_email ||
    initialUserData.email ||
    defaultValues.email ||
    "user@company.com";

  const userRole =
    initialUserData.role || defaultValues.role || "Team Member";

  const userEmpId =
    initialUserData.employee_id ||
    (initialUserData.id ? `EMP${initialUserData.id}` : defaultValues.employeeId || "");

  const activeUserData = {
    ...defaultValues,
    ...initialUserData,
    name: userName,
    email: userEmail,
    role: userRole,
    employeeId: userEmpId,
  };

  const [formData, setFormData] = useState({
    name: userName,
    email: userEmail,
    role: userRole,
    employeeId: userEmpId,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [avatarSrc, setAvatarSrc] = useState(() => getStoredAvatar(activeUserData));
  const fileInputRef = useRef(null);

  useEffect(() => {
    const updateAvatar = () => {
      setAvatarSrc(getStoredAvatar(activeUserData));
    };
    updateAvatar();
    window.addEventListener("user_profile_updated", updateAvatar);
    return () => {
      window.removeEventListener("user_profile_updated", updateAvatar);
    };
  }, [user, storageKey]);

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
      saveStoredAvatar(activeUserData, base64Data);
      setAvatarSrc(base64Data);
      showToast("Profile picture updated successfully!", "success", 3000);
    };
    reader.readAsDataURL(file);
  };

  const [fetchedStats, setFetchedStats] = useState(null);
  const { toast, showToast } = useToast();

  useEffect(() => {
    if (onFetchStats) {
      let isMounted = true;
      async function runFetchStats() {
        try {
          const stats = await onFetchStats({ userEmpId, userName, userEmail });
          if (isMounted && stats) {
            setFetchedStats(stats);
          }
        } catch (e) {
          console.error("Error running profile fetchStats", e);
        }
      }
      runFetchStats();
      return () => {
        isMounted = false;
      };
    }
  }, [onFetchStats, userEmpId, userName, userEmail]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGeneralSubmit = (e) => {
    e.preventDefault();
    try {
      const existingUser = JSON.parse(
        localStorage.getItem(storageKey) || "{}"
      );
      const updatedUser = {
        ...existingUser,
        name: formData.name,
        company_email: formData.email,
        personal_email: formData.email,
        email: formData.email,
        role: formData.role,
      };
      localStorage.setItem(storageKey, JSON.stringify(updatedUser));
    } catch (err) {
      console.error("Error saving profile info", err);
    }
    showToast(saveSuccessMessage, "success", 3000);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!formData.currentPassword || !formData.newPassword) {
      showToast("Please fill in current and new password.", "error", 4000);
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      showToast("New passwords do not match!", "error", 4000);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/users/change-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          current_password: formData.currentPassword,
          new_password: formData.newPassword,
          confirm_password: formData.confirmPassword,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        showToast(passwordUpdateSuccessMessage, "success", 4000);
        setFormData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
      } else {
        showToast(data.detail || "Failed to update password.", "error", 4000);
      }
    } catch (err) {
      console.error("Error changing password", err);
      showToast("Server connection error.", "error", 4000);
    }
  };

  // Determine stat cards to display
  const defaultStatCards = [
    {
      id: 1,
      label: fetchedStats?.label1 || "Assigned",
      value: fetchedStats?.value1 ?? "0",
      icon: <Bug size={16} />,
      wrapperClass: "bg-blue-50/50 border-blue-100",
      iconClass: "text-blue-600",
    },
    {
      id: 2,
      label: fetchedStats?.label2 || "Resolved",
      value: fetchedStats?.value2 ?? "0",
      icon: <CheckSquare size={16} />,
      wrapperClass: "bg-emerald-50/50 border-emerald-100",
      iconClass: "text-emerald-600",
    },
    {
      id: 3,
      label: fetchedStats?.label3 || "Pending",
      value: fetchedStats?.value3 ?? "0",
      icon: <Clock size={16} />,
      wrapperClass: "bg-amber-50/50 border-amber-100",
      iconClass: "text-amber-600",
    },
  ];

  const activeStatCards = propStatCards || defaultStatCards;

  const initials = formData.name ? formData.name.substring(0, 2).toUpperCase() : "US";

  return (
    <div className="max-w-8xl mx-auto p-4 md:p-6 font-sans text-gray-800 antialiased">
      <ToastNotification {...toast} />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarChange}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
      />

      {/* Header Banner & Profile Card */}
      <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden mb-6">
        <div className="h-28 md:h-36 bg-slate-900" />
        <div className="p-6 pt-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 -mt-12 md:-mt-14">
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-end w-full sm:w-auto">
            <div className="relative">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={formData.name}
                  className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-md object-cover bg-white shrink-0"
                />
              ) : (
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-md bg-slate-100 flex items-center justify-center text-slate-800 font-extrabold text-2xl overflow-hidden uppercase shrink-0">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 p-2 rounded-full bg-slate-900 text-white border-2 border-white shadow-xs hover:bg-slate-800 hover:scale-105 transition-all cursor-pointer"
                title="Change Avatar"
              >
                <Camera size={13} />
              </button>
            </div>
            <div className="text-center sm:text-left pb-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-2">
                {formData.name}
                <Award size={18} className="text-slate-700 shrink-0" />
              </h1>
              <div className="flex items-center gap-2 mt-0.5 justify-center sm:justify-start">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  {formData.role}
                </span>
                {formData.employeeId && (
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200 font-mono">
                    {formData.employeeId}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 w-full md:w-auto mt-2 md:mt-0 max-w-sm ml-auto">
            {activeStatCards.map((stat) => (
              <div
                key={stat.id}
                className={`${stat.wrapperClass} border p-2.5 rounded-xl text-center`}
              >
                <div className={`flex items-center justify-center ${stat.iconClass} mb-1`}>
                  {stat.icon}
                </div>
                <div className="text-base font-extrabold text-gray-900">{stat.value}</div>
                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3 space-y-6">
          {/* Public Info Form */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">{title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            </div>

            <form onSubmit={handleGeneralSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs font-semibold text-gray-600 mb-1"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      readOnly
                      className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 bg-gray-100 text-gray-500 rounded-xl cursor-not-allowed outline-none font-medium"
                      title="Name can only be updated by the Administrator."
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="role"
                    className="block text-xs font-semibold text-gray-600 mb-1"
                  >
                    Job Title (Read-Only)
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      name="role"
                      id="role"
                      value={formData.role}
                      readOnly
                      className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 bg-gray-100 text-gray-500 rounded-xl cursor-not-allowed outline-none font-medium"
                      title="Role can only be updated by the Administrator."
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-gray-600 mb-1"
                >
                  Email Address (Read-Only)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    readOnly
                    className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 rounded-xl bg-gray-100/70 text-gray-500 font-mono font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm active:scale-95"
                >
                  <CheckCircle size={14} />
                  Save General Info
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          {/* <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Change Password</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Protect your account by setting a strong password credential.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <PasswordInput
                id="currentPassword"
                label="Current Password"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="••••••••"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PasswordInput
                  id="newPassword"
                  label="New Password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                />

                <PasswordInput
                  id="confirmPassword"
                  label="Confirm New Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat new password"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm active:scale-95"
                >
                  <Lock size={14} />
                  Update Security Password
                </button>
              </div>
            </form>
          </div> */}
        </div>
      </div>
    </div>
  );
}
