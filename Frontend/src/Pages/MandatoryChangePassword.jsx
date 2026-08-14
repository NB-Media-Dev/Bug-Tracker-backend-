import React, { useState } from "react";
import { Lock, ShieldAlert, KeyRound, LogOut, CheckCircle2 } from "lucide-react";
import { API_BASE } from "../lib/api";

function MandatoryChangePassword({ user, onPasswordChanged, onLogout }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      setIsLoading(false);
      return;
    }

    const email = user?.email || user?.company_email || user?.personal_email || "";

    try {
      const res = await fetch(`${API_BASE}/api/users/change-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onPasswordChanged();
        }, 1500);
      } else {
        setError(data.detail || "Failed to update password. Please try again.");
      }
    } catch (err) {
      console.error("error in changepassword",err);
      
      setError("Connection failure. Please verify the backend is online.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen text-slate-100 overflow-hidden font-sans bg-slate-950">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl pointer-events-none"></div>

      <div className="relative w-full max-w-md p-8 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl">
       
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 animate-pulse">
            <KeyRound size={24} />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mb-1.5 uppercase">
            Change Password
          </h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs">
            For security reasons, you must change your temporary password before accessing the dashboard.
          </p>
        </div>

  
        {error && (
          <div className="flex gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-650 rounded-xl text-xs leading-relaxed mb-6 font-medium">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-xl text-xs leading-relaxed mb-6 font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>Password updated successfully! Redirecting you now...</span>
          </div>
        )}

       
        <form onSubmit={handleSubmit} className="space-y-4 text-slate-900 text-xs">
          <div className="space-y-1.5">
            <label htmlFor="newpassword" className="font-bold text-slate-700 uppercase tracking-wider">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
              id="newpassword"
              name="nwepassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-slate-900 font-medium"
                disabled={success}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmpassword" className="font-bold text-slate-700 uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
              id="confirmpassword"
              name="confirmpassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-slate-900 font-medium"
                disabled={success}
              />
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-all shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isLoading ? "Saving changes..." : "Save and Continue"}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer border border-transparent"
            >
              <LogOut size={14} /> Cancel & Log Out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MandatoryChangePassword;
