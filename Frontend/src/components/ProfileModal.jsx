import React, { useState, useRef, useEffect } from 'react';
import { User, Lock, Camera, X, Check, AlertCircle, Upload, Eye, EyeOff, Mail, Shield, CheckCircle } from 'lucide-react';
import { API_BASE, authFetch } from '../lib/api';
import { saveStoredAvatar, getStoredAvatar } from '../lib/avatar';

export function validatePasswordComplexity(password) {
  if (!password) return 'Please enter a password.';
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter (A-Z).';
  if (!/[a-z]/.test(password)) return 'Password must contain at least 1 lowercase letter (a-z).';
  if (!/\d/.test(password)) return 'Password must contain at least 1 number (0-9).';
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return 'Password must contain at least 1 special symbol (!@#$%^&*).';
  return null;
}

function validatePasswordChange(currentPassword, newPassword, confirmPassword) {
  if (!currentPassword.trim()) {
    return 'Please enter your current password.';
  }
  if (!newPassword.trim()) {
    return 'Please enter a new password.';
  }
  const complexityErr = validatePasswordComplexity(newPassword);
  if (complexityErr) {
    return complexityErr;
  }
  if (newPassword !== confirmPassword) {
    return 'New password and confirmation do not match.';
  }
  return null;
}

function ProfileAlert({ feedback }) {
  if (!feedback) return null;
  const isSuccess = feedback.type === 'success';
  return (
    <div
      className={`flex items-start gap-2.5 p-3 rounded-xl mb-4 text-xs font-medium border transition-all ${
        isSuccess
          ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80'
          : 'bg-rose-50/80 text-rose-800 border-rose-200/80'
      }`}
    >
      {isSuccess ? (
        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
      )}
      <span className="leading-relaxed flex-1">{feedback.text}</span>
    </div>
  );
}

function PublicInfoTab({ currentUser, currentRole, userEmail, onUpdateUser }) {
  const [fullName, setFullName] = useState(
    currentUser.name || currentUser.username || currentUser.first_name || 'User'
  );
  const [jobTitle, setJobTitle] = useState(
    currentUser.jobTitle || currentRole || 'Member'
  );
  const [infoFeedback, setInfoFeedback] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setInfoFeedback(null);
    try {
      const empId = currentUser.id || currentUser.pk;
      if (empId) {
        await authFetch(`${API_BASE}/api/users/${empId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: fullName, role: jobTitle }),
        }).catch(() => {});
      }

      const updatedFields = { name: fullName, username: fullName, role: jobTitle, jobTitle };

      if (localStorage.getItem('admin_user')) {
        const existing = JSON.parse(localStorage.getItem('admin_user') || '{}');
        localStorage.setItem('admin_user', JSON.stringify({ ...existing, ...updatedFields }));
      }
      if (localStorage.getItem('developer_user')) {
        const existing = JSON.parse(localStorage.getItem('developer_user') || '{}');
        localStorage.setItem('developer_user', JSON.stringify({ ...existing, ...updatedFields }));
      }
      if (localStorage.getItem('tester_user')) {
        const existing = JSON.parse(localStorage.getItem('tester_user') || '{}');
        localStorage.setItem('tester_user', JSON.stringify({ ...existing, ...updatedFields }));
      }
      if (localStorage.getItem('user')) {
        const existing = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...existing, ...updatedFields }));
      }

      if (onUpdateUser) {
        onUpdateUser(updatedFields);
      }
      window.dispatchEvent(new Event('user_profile_updated'));
      setInfoFeedback({ type: 'success', text: 'Public Info updated successfully!' });
    } catch (err) {
      setInfoFeedback({ type: 'error', text: 'Failed to update Public Info.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <ProfileAlert feedback={infoFeedback} />

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Public Info</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage your public display name and job title.</p>
        </div>

        <form onSubmit={handleSaveInfo} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="modal-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  id="modal-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="modal-role" className="block text-xs font-semibold text-slate-700 mb-1">
                Job Title / Role
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  id="modal-role"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Enter job title"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 font-medium focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="modal-email" className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address (Read-Only)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                id="modal-email"
                value={userEmail}
                readOnly
                disabled
                className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-100/70 text-slate-500 font-mono font-medium cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-98"
            >
              {isSaving ? 'Saving...' : 'Save Public Info'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, placeholder, showPassword, setShowPassword, required = true }) {
  return (
    <div className="space-y-1.5 mb-3.5">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full pl-3.5 pr-10 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all text-slate-900 font-medium placeholder:text-slate-400"
        />
        <button
          type="button"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

function ProfilePictureTab({
  avatarFeedback,
  fileInputRef,
  selectedFile,
  currentAvatar,
  handleRemoveAvatar,
  isRemovingAvatar,
  handleUploadAvatar,
  isUploadingAvatar,
}) {
  return (
    <div className="space-y-4">
      <ProfileAlert feedback={avatarFeedback} />

      <div
        className="w-full flex flex-col items-center justify-center p-6 border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-100/60 rounded-2xl transition-all cursor-pointer group"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-700 mb-2.5 group-hover:scale-105 transition-transform">
          <Upload size={18} />
        </div>
        <span className="font-bold text-xs text-slate-900">Choose a new profile picture</span>
        <span className="text-[11px] text-slate-500 mt-1 font-medium">PNG, JPG, JPEG or WEBP (Max 5MB)</span>
        {selectedFile && (
          <span className="mt-3 px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-800 font-semibold text-[11px] shadow-2xs">
            Selected: <strong className="text-indigo-600">{selectedFile.name}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        {(currentAvatar || selectedFile) && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            disabled={isRemovingAvatar}
            className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {isRemovingAvatar ? 'Removing...' : 'Remove Photo'}
          </button>
        )}

        {selectedFile && (
          <button
            type="button"
            onClick={handleUploadAvatar}
            disabled={isUploadingAvatar}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ml-auto disabled:opacity-50 active:scale-98"
          >
            {isUploadingAvatar ? 'Saving...' : 'Save Profile Picture'}
          </button>
        )}
      </div>
    </div>
  );
}

function ChangePasswordTab({
  handleChangePassword,
  passwordFeedback,
  currentPassword,
  setCurrentPassword,
  showCurrentPassword,
  setShowCurrentPassword,
  newPassword,
  setNewPassword,
  showNewPassword,
  setShowNewPassword,
  confirmPassword,
  setConfirmPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  onClose,
  isChangingPassword,
}) {
  return (
    <form onSubmit={handleChangePassword} className="space-y-3">
      <ProfileAlert feedback={passwordFeedback} />

      <PasswordField
        id="currentPassword"
        label="Current Password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="Enter current password"
        showPassword={showCurrentPassword}
        setShowPassword={setShowCurrentPassword}
      />

      <PasswordField
        id="newPassword"
        label="New Password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="Min 8 chars (1 upper, 1 lower, 1 digit, 1 symbol)"
        showPassword={showNewPassword}
        setShowPassword={setShowNewPassword}
      />

      <div>
        <PasswordField
          id="confirmPassword"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          showPassword={showConfirmPassword}
          setShowPassword={setShowConfirmPassword}
        />
        {newPassword && confirmPassword && newPassword !== confirmPassword && (
          <span className="text-[11px] text-rose-600 font-semibold mt-1 block">Passwords do not match</span>
        )}
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isChangingPassword}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-98"
        >
          {isChangingPassword ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </form>
  );
}

export function ProfileModal({ user = {}, role = '', onClose, onUpdateUser }) {
  const currentUser = user || {};
  const username = currentUser.name || currentUser.username || currentUser.email || 'User';
  const currentRole = currentUser.jobTitle || currentUser.role || (role && role.toLowerCase() !== 'admin' ? role : '') || 'Admin';
  const userEmail = currentUser.company_email || currentUser.email || currentUser.personal_email || currentUser.username || '';
  const currentAvatar = currentUser.avatarUrl || currentUser.avatar || null;

  const [activeTab, setActiveTab] = useState('info');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [avatarFeedback, setAvatarFeedback] = useState(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);

  const displayName = username.charAt(0).toUpperCase() + username.slice(1);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (.jpg, .png, .webp, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result;
      saveStoredAvatar(currentUser, base64Data);
      if (onUpdateUser) {
        onUpdateUser({ avatarUrl: base64Data });
      }
      setPreviewUrl(base64Data);
      window.dispatchEvent(new Event('user_profile_updated'));
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile) return;
    setIsUploadingAvatar(true);
    setAvatarFeedback(null);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result;
        saveStoredAvatar(currentUser, base64Data);
        if (onUpdateUser) {
          onUpdateUser({ avatarUrl: base64Data });
        }
        setAvatarFeedback({ type: 'success', text: 'Profile picture updated successfully!' });
        setSelectedFile(null);
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      setAvatarFeedback({ type: 'error', text: err.message || 'Failed to upload profile picture.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!currentAvatar && !previewUrl) return;

    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;

    setIsRemovingAvatar(true);
    setAvatarFeedback(null);

    try {
      saveStoredAvatar(currentUser, null);
      if (onUpdateUser) {
        onUpdateUser({ avatarUrl: null });
      }
      setSelectedFile(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setAvatarFeedback({ type: 'success', text: 'Profile picture removed.' });
    } catch (err) {
      setAvatarFeedback({ type: 'error', text: err.message || 'Failed to remove profile picture.' });
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordFeedback(null);

    const validationError = validatePasswordChange(currentPassword, newPassword, confirmPassword);
    if (validationError) {
      setPasswordFeedback({ type: 'error', text: validationError });
      return;
    }

    setIsChangingPassword(true);

    try {
      const endpoint = role.toLowerCase() === 'admin'
        ? `${API_BASE}/api/auth/change-password/`
        : `${API_BASE}/api/users/change-password/`;

      const resolvedEmail = userEmail || currentUser.company_email || currentUser.email || currentUser.personal_email || currentUser.username || '';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resolvedEmail,
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setPasswordFeedback({ type: 'success', text: data.message || 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordFeedback({ type: 'error', text: data.detail || 'Failed to change password. Check your current password.' });
      }
    } catch (err) {
      setPasswordFeedback({ type: 'error', text: err.message || 'Server error updating password.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const activeAvatarSrc = previewUrl || (currentAvatar ? currentAvatar : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-label="Close profile modal backdrop"
      />

      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-200/80 animate-in zoom-in-95 duration-200 custom-scrollbar">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
          className="hidden"
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              <User size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Account Profile</h2>
              <p className="text-[11px] text-slate-500 font-medium">Manage profile info, picture & security settings</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* User Card Info */}
        <div className="p-4 px-5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-3.5">
          <div className="relative shrink-0">
            {activeAvatarSrc ? (
              <img src={activeAvatarSrc} alt={displayName} className="w-13 h-13 rounded-full object-cover border border-slate-300 shadow-2xs" />
            ) : (
              <div className="w-13 h-13 rounded-full bg-slate-900 text-white font-extrabold text-lg flex items-center justify-center border border-slate-700 shadow-2xs uppercase">
                {displayName.charAt(0)}
              </div>
            )}
            <button
              type="button"
              className="absolute -bottom-0.5 -right-0.5 p-1 rounded-full bg-white text-slate-700 border border-slate-300 shadow-2xs hover:bg-slate-100 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              title="Change profile picture"
            >
              <Camera size={11} />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 truncate">{displayName}</h3>
              <span className="text-[9px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {currentRole}
              </span>
            </div>
            {userEmail && (
              <p className="text-xs text-slate-500 font-mono truncate mt-0.5">{userEmail}</p>
            )}
          </div>
        </div>

        {/* Segmented Control Tabs */}
        <div className="p-3 px-5 bg-white border-b border-slate-100">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100/80 rounded-xl">
            <button
              type="button"
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'info'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => setActiveTab('info')}
            >
              <User size={14} />
              Public Info
            </button>

            <button
              type="button"
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'password'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => setActiveTab('password')}
            >
              <Lock size={14} />
              Password
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5">
          {activeTab === 'info' && (
            <PublicInfoTab
              currentUser={currentUser}
              currentRole={currentRole}
              userEmail={userEmail}
              onUpdateUser={onUpdateUser}
            />
          )}

          {activeTab === 'password' && (
            <ChangePasswordTab
              handleChangePassword={handleChangePassword}
              passwordFeedback={passwordFeedback}
              currentPassword={currentPassword}
              setCurrentPassword={setCurrentPassword}
              showCurrentPassword={showCurrentPassword}
              setShowCurrentPassword={setShowCurrentPassword}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              showNewPassword={showNewPassword}
              setShowNewPassword={setShowNewPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              onClose={onClose}
              isChangingPassword={isChangingPassword}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;
