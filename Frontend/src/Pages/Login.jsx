
import React, { useState } from "react";
import { Lock, Mail, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { API_BASE, authFetch } from "../lib/api";
import { setAdminAuth, setDeveloperAuth, setTesterAuth, clearAuthStorage, setRequirePasswordChange } from "../lib/auth";

function Login({ onLoginSuccess, onDeveloperLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [notice, setNotice] = useState("");

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPhase, setResetPhase] = useState("request");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetTempPassword, setResetTempPassword] = useState("");

  const tryEmployeeLogin = async (cleanEmail, overridePassword) => {
    const loginPassword = overridePassword !== undefined ? overridePassword : password;
    const empResponse = await authFetch('/api/users/login/', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, password: loginPassword }),
    });
    const empData = await empResponse.json();

    if (!empResponse.ok) {
      return empData?.detail || empData?.email?.[0] || "Invalid email or password.";
    }

    const empRole = (empData.employee?.role || "").toLowerCase();
    const requiresChange = !!empData.require_password_change;
    setRequirePasswordChange(requiresChange);
    if (requiresChange) {
      setResetEmail(cleanEmail);
      setResetPhase("confirm");
      setShowForgotPassword(true);
      setResetSuccess("Temporary password accepted. Please choose a new password.");
      return "require_password_change";
    }

    clearAuthStorage();
    if (empRole.includes("cto")) {
      setAdminAuth(empData.access, empData.refresh, empData.employee);
      onLoginSuccess(empData.employee);
    } else if (empRole.includes("developer") || empRole.includes("dev")) {
      setDeveloperAuth(empData.employee, empData.access, empData.refresh);
      onDeveloperLoginSuccess(empData.employee, "developer");
    } else {
      setTesterAuth(empData.employee, empData.access, empData.refresh);
      onDeveloperLoginSuccess(empData.employee, "tester");
    }
    return null;
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    const cleanEmail = resetEmail.trim().toLowerCase();

    try {
      const response = await authFetch('/api/users/forgot-password/', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResetError(data.detail || "Account with this email does not exist or is inactive.");
        return;
      }

      setShowForgotPassword(false);
      setResetPhase("request");
      setResetEmail("");
      setResetNewPassword("");
      setResetConfirmPassword("");
      setResetTempPassword("");
      setResetError("");
      setResetSuccess("");
      setNotice("Temporary password sent to your registered email address(es). Please sign in using your Company Email and the temporary password.");
      setTimeout(() => setNotice(""), 12000);
    } catch (err) {
      console.error("error in loginpage", err);
      setResetError("Network error. Please make sure the backend server is online.");
    }
  };

  const handleVerifyTempPassword = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    const cleanEmail = resetEmail.trim().toLowerCase();

    if (!resetTempPassword) {
      setResetError("Please enter the temporary password sent to your email.");
      return;
    }

    try {
      let response = await authFetch('/api/auth/login/', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: resetTempPassword }),
      });

      if (!response.ok) {
        response = await authFetch('/api/users/login/', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password: resetTempPassword }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        setResetError(data.detail || "Invalid or expired temporary password.");
        return;
      }

      if (data.require_password_change) {
        setResetPhase("confirm");
        setResetSuccess("Temporary password verified. Please enter your new password.");
      } else {
        setResetError("Temporary password was accepted but a password change is not required. Please try logging in normally.");
      }
    } catch (err) {
      console.error("error verifying temporary password", err);
      setResetError("Network error. Please make sure the backend server is online.");
    }
  };

  const handleForgotPasswordReset = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    const cleanEmail = resetEmail.trim().toLowerCase();

    if (!resetNewPassword || !resetConfirmPassword) {
      setResetError("Please enter both new password fields.");
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("New password and confirmation do not match.");
      return;
    }

    if (resetNewPassword.length < 6) {
      setResetError("Password must be at least 6 characters long.");
      return;
    }

    try {
      const response = await authFetch('/api/users/change-password/', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          new_password: resetNewPassword,
          confirm_password: resetConfirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResetError(data.detail || "Failed to reset password. Please try again.");
        return;
      }

      setResetSuccess("Password updated successfully. Logging you in now...");
      setResetPhase("done");
      setTimeout(async () => {
        let adminRes = await tryAdminLogin(cleanEmail, resetNewPassword);
        if (adminRes === "require_password_change") return;
        if (!adminRes) {
          const empRes = await tryEmployeeLogin(cleanEmail, resetNewPassword);
          if (empRes && empRes !== "require_password_change") {
            setResetError(empRes);
            return;
          }
        }
        setShowForgotPassword(false);
        setResetEmail("");
        setResetNewPassword("");
        setResetConfirmPassword("");
        setResetPhase("request");
        setResetSuccess("");
      }, 1200);
    } catch (err) {
      console.error("error resetting password", err);
      setResetError("Network error. Please make sure the backend server is online.");
    }
  };

  const tryAdminLogin = async (cleanEmail, overridePassword) => {
    const loginPassword = overridePassword !== undefined ? overridePassword : password;
    try {
      const adminResponse = await authFetch('/api/auth/login/', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: loginPassword }),
      });
      const adminData = await adminResponse.json();
      if (adminResponse.ok) {
        const requiresChange = !!adminData.require_password_change;
        setRequirePasswordChange(requiresChange);
        if (requiresChange) {
          setResetEmail(cleanEmail);
          setResetPhase("confirm");
          setShowForgotPassword(true);
          setResetSuccess("Temporary password accepted. Please choose a new password.");
          return "require_password_change";
        }
        clearAuthStorage();
        setAdminAuth(adminData.access, adminData.refresh, adminData.user);
        onLoginSuccess(adminData.user);
        return true;
      }
    } catch (err) {
      console.error("Admin auth request failed, trying Employee auth", err);
    }
    return false;
  };

  const triggerShake = () => {
    setShouldShake(true);
    setTimeout(() => setShouldShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setShouldShake(false);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const isAdminLikely = cleanEmail.startsWith("admin") || cleanEmail.includes("admin@");

      if (isAdminLikely) {
        if (await tryAdminLogin(cleanEmail)) {
          setIsLoading(false);
          return;
        }
        const errMsg = await tryEmployeeLogin(cleanEmail);
        if (errMsg === "require_password_change") {
          setIsLoading(false);
          return;
        }
        if (errMsg) {
          setError(errMsg);
          triggerShake();
        }
      } else {
        const errMsg = await tryEmployeeLogin(cleanEmail);
        if (errMsg === "require_password_change") {
          setIsLoading(false);
          return;
        }
        if (!errMsg) {
          setIsLoading(false);
          return;
        }
        // Fallback to admin login if employee auth failed
        if (await tryAdminLogin(cleanEmail)) {
          setIsLoading(false);
          return;
        }
        setError(errMsg);
        triggerShake();
      }
    } catch (networkError) {
      console.error("error in loginpage", networkError);
      setError("Cannot connect to the server. Make sure the backend is running.");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const getResetFormSubmitHandler = () => {
    if (resetPhase === "request") return handleForgotPasswordSubmit;
    if (resetPhase === "verify") return handleVerifyTempPassword;
    return handleForgotPasswordReset;
  };

  const getSubmitButtonText = () => {
    if (resetPhase === "request") return "Submit Request";
    if (resetPhase === "verify") return "Verify Temporary Password";
    return "Save New Password";
  };

  return (
     <div className="relative flex items-center justify-center min-h-screen text-slate-100 overflow-hidden font-sans bg-slate-950">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-violet-600/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none"></div>

      <div
        className={`relative w-full max-w-md p-8 bg-white backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl transition-all duration-300 ${
          shouldShake ? "animate-bounce" : ""
        }`}
        style={shouldShake ? { animation: "shake 0.5s ease-in-out" } : {}}
      >
     
        <div className="flex flex-col items-center mb-6 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">
            Bugtracker Portal
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Sign in to access your account workspace
          </p>
        </div>

       
        {notice && (
          <div className="flex gap-2.5 p-3.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs leading-relaxed mb-4">
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <div className="flex gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs leading-relaxed mb-6">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="emailaddress" className="text-xs font-semibold text-slate-700 tracking-wider uppercase">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
              id="emailaddress"
              name="emailaddress"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter your email address"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="text-xs font-semibold text-slate-700 tracking-wider uppercase">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetError("");
                  setResetSuccess("");
                  setResetEmail("");
                  setResetNewPassword("");
                  setResetConfirmPassword("");
                  setResetPhase("request");
                  setShowForgotPassword(true);
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
              id="password"
              name="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter your password"
                className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-all shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-250 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-gray-150 pb-3">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Reset Password</h3>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmail("");
                  setResetError("");
                  setResetSuccess("");
                  setResetPhase("request");
                  setResetNewPassword("");
                  setResetConfirmPassword("");
                }}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {resetPhase === "done" ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-emerald-950 text-sm uppercase">Password Updated</div>
                  <div>{resetSuccess || "Your password has been changed successfully."}</div>
                </div>
              </div>
            ) : (
              <form
                onSubmit={getResetFormSubmitHandler()}
                className="space-y-4 text-xs text-gray-800"
              >
                {resetError && (
                  <div className="p-3 bg-red-50 border border-red-250 text-red-650 rounded-xl font-medium">
                    {resetError}
                  </div>
                )}
                {resetSuccess && resetPhase !== "done" && (
                  <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl font-medium text-xs">
                    {resetSuccess}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="resetemail" className="block font-semibold text-gray-705 uppercase tracking-wider">Registered Email Address</label>
                  <input
                    type="email"
                    id="resetemail"
                    name="resetemail"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your registered company or personal email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900"
                    disabled={resetPhase !== "request"}
                  />
                </div>

                {resetPhase === "verify" && (
                  <div className="space-y-1.5">
                    <label htmlFor="resettemppassword" className="block font-semibold text-gray-705 uppercase tracking-wider">Temporary Password</label>
                    <input
                      type="password"
                      id="resettemppassword"
                      name="resettemppassword"
                      required
                      value={resetTempPassword}
                      onChange={(e) => setResetTempPassword(e.target.value)}
                      placeholder="Enter the temporary password you received"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900"
                    />
                  </div>
                )}

                {resetPhase === "confirm" && (
                  <>
                    <div className="space-y-1.5">
                      <label htmlFor="resetnewpassword" className="block font-semibold text-gray-705 uppercase tracking-wider">New Password</label>
                      <input
                        type="password"
                        id="resetnewpassword"
                        name="resetnewpassword"
                        required
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="Enter your new password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="resetconfirmpassword" className="block font-semibold text-gray-705 uppercase tracking-wider">Confirm Password</label>
                      <input
                        type="password"
                        id="resetconfirmpassword"
                        name="resetconfirmpassword"
                        required
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900"
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail("");
                      setResetError("");
                      setResetSuccess("");
                      setResetPhase("request");
                      setResetNewPassword("");
                      setResetConfirmPassword("");
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold cursor-pointer transition-colors shadow-xs"
                  >
                    {getSubmitButtonText()}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;