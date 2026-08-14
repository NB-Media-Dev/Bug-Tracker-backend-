// import React, { useState, useEffect } from "react";
// import Sidebar from "./Pages/Sidebar";
// import Dasboard from "./Pages/Dasboard";
// import Monitor from "./Pages/Monitor";
// import UserMangerment from "./Pages/UserMangerment";
// import Login from "./Pages/Login";
// import ProfileCard from "./Pages/ProfileCard";
// import DeveloperDashboard from "./Pages/DeveloperDashboard";
// import TesterDashboard from "./Pages/TesterDashboard";
// import AdminProfile from "./Pages/AdminProfile";
// import ThemeSelector from "./components/ThemeSelector";
// import UserHeaderPanel from "./components/UserHeaderPanel";
// import MandatoryChangePassword from "./Pages/MandatoryChangePassword";

// import { clearDumpStorage } from "./lib/clearDumpStorage";
// import { getSavedTheme, applyTheme } from "./lib/theme";
// import { API_BASE, authFetch } from "./lib/api";
// import { getStoredAuth, clearAuthStorage, getRequirePasswordChange } from "./lib/auth";
// import { Calendar } from "lucide-react";

// function App() {
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [isCollapsed, setIsCollapsed] = useState(false);
//   const [currentPath, setCurrentPath] = useState(window.location.pathname);

//   const stored = getStoredAuth();

//   const [authRole, setAuthRole] = useState(stored.role);
//   const [authUser, setAuthUser] = useState(stored.user);

//   const [adminNotifications, setAdminNotifications] = useState([]);
//   const [showNotifDropdown, setShowNotifDropdown] = useState(false);
//   const [notifDateFilter, setNotifDateFilter] = useState("");

//   const todayStr = new Date().toLocaleDateString("en-US", {
//     weekday: "long",
//     month: "short",
//     day: "numeric",
//   });

//   const loadAdminNotifications = async () => {
//     try {
//       const [notifsRes] = await Promise.all([
//         authFetch(`${API_BASE}/api/bugs/submissions/`),
//         authFetch(`${API_BASE}/api/bugs/notifications/`)
//       ]);
    
//       const devNotifs = notifsRes.ok ? await notifsRes.json() : [];
//       const adminOnlyNotifs = Array.isArray(devNotifs)
//         ? devNotifs.filter((n) => {
//             const role = (n.recipient_role || n.recipientRole || n.role || "").toString().trim().toLowerCase();
//             const type = (n.notification_type || n.notificationType || "").toString().trim().toLowerCase();
//             return role === "admin" && type === "build_submitted";
//           })
//         : [];

//       const combined = adminOnlyNotifs.map(n => {
//           const rawTime = n.created_at || n.timestamp || new Date().toISOString();
//           return {
//             id: String(n.id),
//             message: n.message,
//             rawTimestamp: rawTime,
//             timestamp: rawTime
//               ? new Date(rawTime).toLocaleDateString("en-US", { day: "numeric", month: "short" }) + ", " + new Date(rawTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
//               : "Just now",
//             type: "tester_activity"
//           };
//         });

//       combined.sort((a, b) => new Date(b.rawTimestamp) - new Date(a.rawTimestamp));
      
//       const clearedIds = JSON.parse(localStorage.getItem("admin_read_notifications") || "[]");
//       const activeNotifs = combined.filter(n => !clearedIds.includes(String(n.id)));
//       setAdminNotifications(activeNotifs);
//     } catch (e) {
//        console.error("Critical error inside loadAdminNotifications:", e);
//     }
//   };

//   useEffect(() => {
//     clearDumpStorage();
//     loadAdminNotifications();

//     const syncUserProfile = async () => {
//       const storedAuth = getStoredAuth();
//       if (storedAuth.role && storedAuth.user) {
//         try {
//           const res = await authFetch(`${API_BASE}/api/users/`);
//           if (res.ok) {
//             const data = await res.json();
//             const results = data.results || [];
//             const freshUser = results.find(emp => emp.employee_id === storedAuth.user.employee_id || emp.company_email === storedAuth.user.company_email);
//             if (freshUser) {
//               if (storedAuth.role === "developer") {
//                 localStorage.setItem("developer_user", JSON.stringify(freshUser));
//               } else if (storedAuth.role === "tester") {
//                 localStorage.setItem("tester_user", JSON.stringify(freshUser));
//               }
//               setAuthUser(freshUser);
//             }
//           }
//         } catch (e) {
//           console.error("Error syncing user profile", e);
//         }
//       }
//     };

//     syncUserProfile();
//   }, []);

//   useEffect(() => {
//     if (authRole) {
//       const activeTheme = getSavedTheme(authUser, authRole);
//       applyTheme(activeTheme);
//     }
//   }, [authRole, authUser]);

//   useEffect(() => {
//     const handleLocationChange = () => {
//       setCurrentPath(window.location.pathname);
//     };
//     window.addEventListener("popstate", handleLocationChange);
//     return () => window.removeEventListener("popstate", handleLocationChange);
//   }, []);

//   useEffect(() => {
//     const handleUnauthorized = (event) => {
//       if (event.detail === 401) {
//         handleLogout();
//       }
//     };
//     window.addEventListener("app:unauthorized", handleUnauthorized);
//     return () => window.removeEventListener("app:unauthorized", handleUnauthorized);
//   }, []);

//   const navigate = (path) => {
//     window.history.pushState({}, "", path);
//     setCurrentPath(path);
//     setSidebarOpen(false);
//   };

//   const handleLoginSuccess = (user, type) => {
//     setAuthRole(type);
//     setAuthUser(user);
//     navigate("/");
//   };

//   const handleLogout = async () => {
//     if (authRole === "admin") {
//       const refreshToken = localStorage.getItem("refresh_token");
//       if (refreshToken) {
//         try {
//           const accessToken = localStorage.getItem("access_token");
//           await fetch(`${API_BASE}/api/auth/logout/`, {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//               ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
//             },
//             body: JSON.stringify({ refresh: refreshToken }),
//           });
//         } catch(e) {
//            console.error("error in handlelogout:", e);
//         }
//       }
//       clearAuthStorage();
//     } else if (authRole === "developer" || authRole === "tester") {
//       const companyEmail = authUser?.company_email;
//       if (companyEmail) {
//         try {
//           await fetch(`${API_BASE}/api/users/logout/`, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ email: companyEmail }),
//           });
//         } catch (e) {
//           console.error("Error calling backend logout", e);
//         }
//       }
//       clearAuthStorage();
//     }

//     setAuthRole(null);
//     setAuthUser(null);
//     navigate("/");
//   };

//   const renderPage = () => {
//     switch (currentPath) {
//       case "/":
//         return <Dasboard onNavigate={navigate} onLogout={handleLogout} />;
//       case "/monitor":
//         return <Monitor />;
//       case "/user-management":
//         return <UserMangerment />;
//       case "/profilecard":
//         return <ProfileCard />;
//       case "/admin-profile":
//         return <AdminProfile />;
//       default:
//         return <Dasboard onNavigate={navigate} />;
//     }
//   };

//   if (!authRole || !authUser) {
//     return (
//       <Login
//         onLoginSuccess={(user) => handleLoginSuccess(user, "admin")}
//         onDeveloperLoginSuccess={(employee, type) => {
//           let resolvedType = type;
//          if (!resolvedType) {
//     if (localStorage.getItem("developer_user")) {
//         resolvedType = "developer";
//     } else if (localStorage.getItem("tester_user")) {
//         resolvedType = "tester";
//     } else {
//         resolvedType = "developer";
//     }
// }
// handleLoginSuccess(employee, resolvedType);
//         }}
//       />
//     );
//   }

//   const requirePasswordChange = getRequirePasswordChange();

//   if (requirePasswordChange && authUser) {
//     return (
//       <MandatoryChangePassword
//         user={authUser}
//         onPasswordChanged={() => {
//           localStorage.removeItem("require_password_change");
//           window.location.reload();
//         }}
//         onLogout={handleLogout}
//       />
//     );
//   }

//   if (authRole === "developer") {
//     return (
//       <DeveloperDashboard
//         developer={authUser}
//         onLogout={handleLogout}
//       />
//     );
//   }

//   if (authRole === "tester") {
//     return (
//       <TesterDashboard
//         tester={authUser}
//         onLogout={handleLogout}
//       />
//     );
//   }

//   const matchesNotifDate = (n) => {
//     if (!notifDateFilter) return true;
//     const timestamp = n.rawTimestamp || n.timestamp;
//     if (!timestamp) return false;
//     const d = new Date(timestamp);
//     const yyyy = d.getFullYear();
//     const mm = String(d.getMonth() + 1).padStart(2, '0');
//     const dd = String(d.getDate()).padStart(2, '0');
//     const formattedDate = `${yyyy}-${mm}-${dd}`;
//     return formattedDate === notifDateFilter;
//   };

//   const filteredAdminNotifications = adminNotifications.filter(matchesNotifDate);
//   const adminEmail = authUser?.company_email || authUser?.personal_email || authUser?.email || "";

//   return (
//     <div className="flex min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] antialiased overflow-hidden">
//       <Sidebar
//         open={sidebarOpen}
//         onClose={() => setSidebarOpen(false)}
//         isCollapsed={isCollapsed}
//         setIsCollapsed={setIsCollapsed}
//         currentPath={currentPath}
//         onNavigate={navigate}
//         onLogout={handleLogout}
//       />

//       <div className="flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 overflow-hidden">
//         <header className="flex items-center justify-between px-3 sm:px-6 h-14 sm:h-16 border-b bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm">
//           {/* Left side: hamburger + portal label */}
//           <div className="flex items-center gap-2 sm:gap-3 min-w-0">
//             <button
//               className="flex-shrink-0 p-2 rounded-lg md:hidden text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
//               onClick={() => setSidebarOpen(true)}
//               aria-label="Open sidebar"
//             >
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 className="h-5 w-5"
//                 fill="none"
//                 viewBox="0 0 24 24"
//                 stroke="currentColor"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M4 6h16M4 12h16M4 18h16"
//                 />
//               </svg>
//             </button>
//             <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
//               ADMIN PORTAL
//             </span>
//           </div>

//           {/* Right side: theme, date, user panel */}
//           <div className="flex items-center gap-1.5 sm:gap-3 relative flex-shrink-0">
//             <ThemeSelector currentRole="admin" user={authUser} />

//             {/* Date pill — hidden on very small screens */}
//             <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200">
//               <Calendar size={14} className="text-slate-500 flex-shrink-0" />
//               <span className="font-medium text-xs whitespace-nowrap">{todayStr}</span>
//             </div>

//             <UserHeaderPanel
//               user={{
//                 name: authUser?.username || authUser?.name || "vasanthan",
//                 role: authUser?.role || "Admin",
//               }}
//               notificationCount={adminNotifications.length}
//               onBellClick={() => setShowNotifDropdown(!showNotifDropdown)}
//               subtitle={adminEmail}
//             />

//             {showNotifDropdown && (
//               <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 z-50 overflow-hidden text-left">
//                 <div className="p-3 bg-amber-50 dark:bg-slate-800 border-b border-amber-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
//                   <span className="font-bold text-xs text-amber-900 dark:text-amber-200 uppercase tracking-wider">System Logs</span>
//                   <div className="flex items-center gap-2">
//                     <input
//                       type="date"
//                       value={notifDateFilter}
//                       onChange={(e) => setNotifDateFilter(e.target.value)}
//                       className="px-2 py-1 text-[10px] font-medium border border-amber-200 rounded-lg bg-white text-gray-800 focus:outline-none outline-none focus:ring-1 focus:ring-amber-400 dark:bg-slate-800 dark:text-white dark:border-slate-700"
//                       title="Filter notifications by date"
//                     />
//                     <button
//                       onClick={() => {
//                         const allIds = adminNotifications.map(n => String(n.id));
//                         const existingCleared = JSON.parse(localStorage.getItem("admin_read_notifications") || "[]");
//                         const newCleared = Array.from(new Set([...existingCleared, ...allIds]));
//                         localStorage.setItem("admin_read_notifications", JSON.stringify(newCleared));
//                         setAdminNotifications([]);
//                         window.dispatchEvent(new Event("notifications_updated"));
//                       }}
//                       className="text-[10px] text-amber-700 dark:text-amber-300 hover:underline font-semibold cursor-pointer"
//                     >
//                       Clear
//                     </button>
//                   </div>
//                 </div>

//                 <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 text-xs">
//                   {filteredAdminNotifications.length > 0 ? (
//                     filteredAdminNotifications.map(n => (
//                       <div key={n.id} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors">
//                         <p className="font-bold text-gray-900 dark:text-gray-100">{n.message}</p>
//                         <span className="text-[10px] text-gray-400 font-mono mt-1 block">{n.timestamp}</span>
//                       </div>
//                     ))
//                   ) : (
//                     <p className="p-6 text-center text-gray-400 italic text-xs">No matching system logs.</p>
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>
//         </header>

//         <main className="p-3 sm:p-6 flex-1 overflow-x-hidden overflow-y-auto bg-[oklch(0.98_0.005_30)] dark:bg-[oklch(0.12_0.005_30)] min-w-0">
//           {renderPage()}
//         </main>
//       </div>
//     </div>
//   );
// }

// export default App;

// import React, { useState, useEffect } from "react";
// import Sidebar from "./Pages/Sidebar";
// import Dasboard from "./Pages/Dasboard";
// import Monitor from "./Pages/Monitor";
// import UserMangerment from "./Pages/UserMangerment";
// import Login from "./Pages/Login";
// import ProfileCard from "./Pages/ProfileCard";
// import DeveloperDashboard from "./Pages/DeveloperDashboard";
// import TesterDashboard from "./Pages/TesterDashboard";
// import AdminProfile from "./Pages/AdminProfile";
// import ThemeSelector from "./components/ThemeSelector";
// import UserHeaderPanel from "./components/UserHeaderPanel";
// import MandatoryChangePassword from "./Pages/MandatoryChangePassword";

// import { clearDumpStorage } from "./lib/clearDumpStorage";
// import { getSavedTheme, applyTheme } from "./lib/theme";
// import { API_BASE, authFetch } from "./lib/api";
// import { getStoredAuth, clearAuthStorage, getRequirePasswordChange } from "./lib/auth";
// import { Calendar } from "lucide-react";

// function App() {
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [isCollapsed, setIsCollapsed] = useState(false);
//   const [currentPath, setCurrentPath] = useState(window.location.pathname);

//   const stored = getStoredAuth();

//   const [authRole, setAuthRole] = useState(stored.role);
//   const [authUser, setAuthUser] = useState(stored.user);

//   const [adminNotifications, setAdminNotifications] = useState([]);
//   const [showNotifDropdown, setShowNotifDropdown] = useState(false);
//   const [notifDateFilter, setNotifDateFilter] = useState("");

//   const todayStr = new Date().toLocaleDateString("en-US", {
//     weekday: "long",
//     month: "short",
//     day: "numeric",
//   });

//   const loadAdminNotifications = async () => {
//     try {
//       const [notifsRes] = await Promise.all([
//         authFetch(`${API_BASE}/api/bugs/submissions/`),
//         authFetch(`${API_BASE}/api/bugs/notifications/`)
//       ]);
    
//       const devNotifs = notifsRes.ok ? await notifsRes.json() : [];
//       const adminOnlyNotifs = Array.isArray(devNotifs)
//         ? devNotifs.filter((n) => {
//             const role = (n.recipient_role || n.recipientRole || n.role || "").toString().trim().toLowerCase();
//             const type = (n.notification_type || n.notificationType || "").toString().trim().toLowerCase();
//             return role === "admin" && type === "build_submitted";
//           })
//         : [];

//       const combined = adminOnlyNotifs.map(n => {
//           const rawTime = n.created_at || n.timestamp || new Date().toISOString();
//           return {
//             id: String(n.id),
//             message: n.message,
//             rawTimestamp: rawTime,
//             timestamp: rawTime
//               ? new Date(rawTime).toLocaleDateString("en-US", { day: "numeric", month: "short" }) + ", " + new Date(rawTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
//               : "Just now",
//             type: "tester_activity"
//           };
//         });

//       combined.sort((a, b) => new Date(b.rawTimestamp) - new Date(a.rawTimestamp));
      
//       const clearedIds = JSON.parse(localStorage.getItem("admin_read_notifications") || "[]");
//       const activeNotifs = combined.filter(n => !clearedIds.includes(String(n.id)));
//       setAdminNotifications(activeNotifs);
//     } catch (e) {
//        console.error("Critical error inside loadAdminNotifications:", e);
//     }
//   };

//   useEffect(() => {
//     clearDumpStorage();
//     loadAdminNotifications();

//     const syncUserProfile = async () => {
//       const storedAuth = getStoredAuth();
//       if (storedAuth.role && storedAuth.user) {
//         try {
//           const res = await authFetch(`${API_BASE}/api/users/`);
//           if (res.ok) {
//             const data = await res.json();
//             const results = data.results || [];
//             const freshUser = results.find(emp => emp.employee_id === storedAuth.user.employee_id || emp.company_email === storedAuth.user.company_email);
//             if (freshUser) {
//               if (storedAuth.role === "developer") {
//                 localStorage.setItem("developer_user", JSON.stringify(freshUser));
//               } else if (storedAuth.role === "tester") {
//                 localStorage.setItem("tester_user", JSON.stringify(freshUser));
//               }
//               setAuthUser(freshUser);
//             }
//           }
//         } catch (e) {
//           console.error("Error syncing user profile", e);
//         }
//       }
//     };

//     syncUserProfile();
//   }, []);

//   useEffect(() => {
//     if (authRole) {
//       const activeTheme = getSavedTheme(authUser, authRole);
//       applyTheme(activeTheme);
//     }
//   }, [authRole, authUser]);

//   useEffect(() => {
//     const handleLocationChange = () => {
//       setCurrentPath(window.location.pathname);
//     };
//     window.addEventListener("popstate", handleLocationChange);
//     return () => window.removeEventListener("popstate", handleLocationChange);
//   }, []);

//   useEffect(() => {
//     const handleUnauthorized = (event) => {
//       if (event.detail === 401) {
//         handleLogout();
//       }
//     };
//     window.addEventListener("app:unauthorized", handleUnauthorized);
//     return () => window.removeEventListener("app:unauthorized", handleUnauthorized);
//   }, []);

//   const navigate = (path) => {
//     window.history.pushState({}, "", path);
//     setCurrentPath(path);
//     setSidebarOpen(false);
//   };

//   const handleLoginSuccess = (user, type) => {
//     setAuthRole(type);
//     setAuthUser(user);
//     navigate("/");
//   };

//   const handleLogout = async () => {
//     if (authRole === "admin") {
//       const refreshToken = localStorage.getItem("refresh_token");
//       if (refreshToken) {
//         try {
//           const accessToken = localStorage.getItem("access_token");
//           await fetch(`${API_BASE}/api/auth/logout/`, {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//               ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
//             },
//             body: JSON.stringify({ refresh: refreshToken }),
//           });
//         } catch(e) {
//            console.error("error in handlelogout:", e);
//         }
//       }
//       clearAuthStorage();
//     } else if (authRole === "developer" || authRole === "tester") {
//       const companyEmail = authUser?.company_email;
//       if (companyEmail) {
//         try {
//           await fetch(`${API_BASE}/api/users/logout/`, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ email: companyEmail }),
//           });
//         } catch (e) {
//           console.error("Error calling backend logout", e);
//         }
//       }
//       clearAuthStorage();
//     }

//     setAuthRole(null);
//     setAuthUser(null);
//     navigate("/");
//   };

//   const renderPage = () => {
//     switch (currentPath) {
//       case "/":
//         return <Dasboard onNavigate={navigate} onLogout={handleLogout} />;
//       case "/monitor":
//         return <Monitor />;
//       case "/user-management":
//         return <UserMangerment />;
//       case "/profilecard":
//         return <ProfileCard />;
//       case "/admin-profile":
//         return <AdminProfile />;
//       default:
//         return <Dasboard onNavigate={navigate} />;
//     }
//   };

//   if (!authRole || !authUser) {
//     return (
//       <Login
//         onLoginSuccess={(user) => handleLoginSuccess(user, "admin")}
//         onDeveloperLoginSuccess={(employee, type) => {
//           let resolvedType = type;
//           if (!resolvedType) {
//             if (localStorage.getItem("developer_user")) {
//               resolvedType = "developer";
//             } else if (localStorage.getItem("tester_user")) {
//               resolvedType = "tester";
//             } else {
//               resolvedType = "developer";
//             }
//           }
//           handleLoginSuccess(employee, resolvedType);
//         }}
//       />
//     );
//   }

//   const requirePasswordChange = getRequirePasswordChange();

//   if (requirePasswordChange && authUser) {
//     return (
//       <MandatoryChangePassword
//         user={authUser}
//         onPasswordChanged={() => {
//           localStorage.removeItem("require_password_change");
//           window.location.reload();
//         }}
//         onLogout={handleLogout}
//       />
//     );
//   }

//   if (authRole === "developer") {
//     return (
//       <DeveloperDashboard
//         developer={authUser}
//         onLogout={handleLogout}
//       />
//     );
//   }

//   if (authRole === "tester") {
//     return (
//       <TesterDashboard
//         tester={authUser}
//         onLogout={handleLogout}
//       />
//     );
//   }

//   const matchesNotifDate = (n) => {
//     if (!notifDateFilter) return true;
//     const timestamp = n.rawTimestamp || n.timestamp;
//     if (!timestamp) return false;
//     const d = new Date(timestamp);
//     const yyyy = d.getFullYear();
//     const mm = String(d.getMonth() + 1).padStart(2, '0');
//     const dd = String(d.getDate()).padStart(2, '0');
//     const formattedDate = `${yyyy}-${mm}-${dd}`;
//     return formattedDate === notifDateFilter;
//   };

//   const filteredAdminNotifications = adminNotifications.filter(matchesNotifDate);
//   const adminEmail = authUser?.company_email || authUser?.personal_email || authUser?.email || "";

//   return (
//     <div className="flex min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] antialiased overflow-hidden">
//       <Sidebar
//         open={sidebarOpen}
//         onClose={() => setSidebarOpen(false)}
//         isCollapsed={isCollapsed}
//         setIsCollapsed={setIsCollapsed}
//         currentPath={currentPath}
//         onNavigate={navigate}
//         onLogout={handleLogout}
//       />

//       <div className="flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 overflow-hidden">
//         <header className="flex items-center justify-between px-3 sm:px-6 h-14 sm:h-16 border-b bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm">
//           {/* Left side: hamburger + portal label */}
//           <div className="flex items-center gap-2 sm:gap-3 min-w-0">
//             <button
//               className="flex-shrink-0 p-2 rounded-lg md:hidden text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
//               onClick={() => setSidebarOpen(true)}
//               aria-label="Open sidebar"
//             >
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 className="h-5 w-5"
//                 fill="none"
//                 viewBox="0 0 24 24"
//                 stroke="currentColor"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M4 6h16M4 12h16M4 18h16"
//                 />
//               </svg>
//             </button>
//             <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
//               ADMIN PORTAL
//             </span>
//           </div>

//           {/* Right side: theme, date, user panel */}
//           <div className="flex items-center gap-1.5 sm:gap-3 relative flex-shrink-0">
//             <ThemeSelector currentRole="admin" user={authUser} />

//             {/* Date pill — hidden on very small screens */}
//             <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200">
//               <Calendar size={14} className="text-slate-500 flex-shrink-0" />
//               <span className="font-medium text-xs whitespace-nowrap">{todayStr}</span>
//             </div>

//             <UserHeaderPanel
//               user={{
//                 name: authUser?.username || authUser?.name || "vasanthan",
//                 role: authUser?.role || "Admin",
//               }}
//               notificationCount={adminNotifications.length}
//               onBellClick={() => setShowNotifDropdown(!showNotifDropdown)}
//               subtitle={adminEmail}
//             />

//             {showNotifDropdown && (
//               <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 z-50 overflow-hidden text-left">
//                 <div className="p-3 bg-amber-50 dark:bg-slate-800 border-b border-amber-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
//                   <span className="font-bold text-xs text-amber-900 dark:text-amber-200 uppercase tracking-wider">System Logs</span>
//                   <div className="flex items-center gap-2">
//                     <input
//                       type="date"
//                       value={notifDateFilter}
//                       onChange={(e) => setNotifDateFilter(e.target.value)}
//                       className="px-2 py-1 text-[10px] font-medium border border-amber-200 rounded-lg bg-white text-gray-800 focus:outline-none outline-none focus:ring-1 focus:ring-amber-400 dark:bg-slate-800 dark:text-white dark:border-slate-700"
//                       title="Filter notifications by date"
//                     />
//                     <button
//                       onClick={() => {
//                         const allIds = adminNotifications.map(n => String(n.id));
//                         const existingCleared = JSON.parse(localStorage.getItem("admin_read_notifications") || "[]");
//                         const newCleared = Array.from(new Set([...existingCleared, ...allIds]));
//                         localStorage.setItem("admin_read_notifications", JSON.stringify(newCleared));
//                         setAdminNotifications([]);
//                         window.dispatchEvent(new Event("notifications_updated"));
//                       }}
//                       className="text-[10px] text-amber-700 dark:text-amber-300 hover:underline font-semibold cursor-pointer"
//                     >
//                       Clear
//                     </button>
//                   </div>
//                 </div>

//                 <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 text-xs">
//                   {filteredAdminNotifications.length > 0 ? (
//                     filteredAdminNotifications.map(n => (
//                       <div key={n.id} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors">
//                         <p className="font-bold text-gray-900 dark:text-gray-100">{n.message}</p>
//                         <span className="text-[10px] text-gray-400 font-mono mt-1 block">{n.timestamp}</span>
//                       </div>
//                     ))
//                   ) : (
//                     <p className="p-6 text-center text-gray-400 italic text-xs">No matching system logs.</p>
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>
//         </header>

//         <main className="p-3 sm:p-6 flex-1 overflow-x-hidden overflow-y-auto bg-[oklch(0.98_0.005_30)] dark:bg-[oklch(0.12_0.005_30)] min-w-0">
//           {renderPage()}
//         </main>
//       </div>
//     </div>
//   );
// }

// export default App;

import React, { useState, useEffect } from "react";
import Sidebar from "./Pages/Sidebar";
import Dasboard from "./Pages/Dasboard";
import Monitor from "./Pages/Monitor";
import UserMangerment from "./Pages/UserMangerment";
import Login from "./Pages/Login";
import ProfileCard from "./Pages/ProfileCard";
import DeveloperDashboard from "./Pages/DeveloperDashboard";
import TesterDashboard from "./Pages/TesterDashboard";
import AdminProfile from "./Pages/AdminProfile";
import ThemeSelector from "./components/ThemeSelector";
import UserHeaderPanel from "./components/UserHeaderPanel";
import ProfileModal from "./components/ProfileModal";
import MandatoryChangePassword from "./Pages/MandatoryChangePassword";

import { clearDumpStorage } from "./lib/clearDumpStorage";
import { getSavedTheme, applyTheme } from "./lib/theme";
import { API_BASE, authFetch } from "./lib/api";
import { getStoredAuth, clearAuthStorage, getRequirePasswordChange } from "./lib/auth";
import { Calendar } from "lucide-react";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const stored = getStoredAuth();

  const [authRole, setAuthRole] = useState(stored.role);
  const [authUser, setAuthUser] = useState(stored.user);

  const [adminNotifications, setAdminNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifDateFilter, setNotifDateFilter] = useState("");

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const loadAdminNotifications = async () => {
    try {
      const [notifsRes] = await Promise.all([
        authFetch(`${API_BASE}/api/bugs/submissions/`),
        authFetch(`${API_BASE}/api/bugs/notifications/`)
      ]);
    
      const devNotifs = notifsRes.ok ? await notifsRes.json() : [];
      const adminOnlyNotifs = Array.isArray(devNotifs)
        ? devNotifs.filter((n) => {
            const role = (n.recipient_role || n.recipientRole || n.role || "").toString().trim().toLowerCase();
            const type = (n.notification_type || n.notificationType || "").toString().trim().toLowerCase();
            return role === "admin" && type === "build_submitted";
          })
        : [];

      const combined = adminOnlyNotifs.map(n => {
          const rawTime = n.created_at || n.timestamp || new Date().toISOString();
          return {
            id: String(n.id),
            message: n.message,
            rawTimestamp: rawTime,
            timestamp: rawTime
              ? new Date(rawTime).toLocaleDateString("en-US", { day: "numeric", month: "short" }) + ", " + new Date(rawTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Just now",
            type: "tester_activity"
          };
        });

      combined.sort((a, b) => new Date(b.rawTimestamp) - new Date(a.rawTimestamp));
      
      const clearedIds = JSON.parse(localStorage.getItem("admin_read_notifications") || "[]");
      const activeNotifs = combined.filter(n => !clearedIds.includes(String(n.id)));
      setAdminNotifications(activeNotifs);
    } catch (e) {
       console.error("Critical error inside loadAdminNotifications:", e);
    }
  };

  useEffect(() => {
    clearDumpStorage();
    loadAdminNotifications();

    const syncUserProfile = async () => {
      const storedAuth = getStoredAuth();
      if (storedAuth.role && storedAuth.user) {
        try {
          const res = await authFetch(`${API_BASE}/api/users/`);
          if (res.ok) {
            const data = await res.json();
            const results = data.results || [];
            const freshUser = results.find(emp => emp.employee_id === storedAuth.user.employee_id || emp.company_email === storedAuth.user.company_email);
            if (freshUser) {
              if (storedAuth.role === "developer" || storedAuth.role === "tester") {
                localStorage.setItem(`${storedAuth.role}_user`, JSON.stringify(freshUser));
              }
              setAuthUser(freshUser);
            }
          }
        } catch (e) {
          console.error("Error syncing user profile", e);
        }
      }
    };

    syncUserProfile();
  }, []);

  useEffect(() => {
    if (authRole) {
      const activeTheme = getSavedTheme(authUser, authRole);
      applyTheme(activeTheme);
    }
  }, [authRole, authUser]);

  useEffect(() => {
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  useEffect(() => {
    const handleUnauthorized = (event) => {
      if (event.detail === 401) handleLogout();
    };
    window.addEventListener("app:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("app:unauthorized", handleUnauthorized);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    setSidebarOpen(false);
  };

  const handleLoginSuccess = (user, type) => {
    setAuthRole(type);
    setAuthUser(user);
    navigate("/");
  };

  const handleLogout = async () => {
    try {
      if (authRole === "admin") {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          const accessToken = localStorage.getItem("access_token");
          await fetch(`${API_BASE}/api/auth/logout/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify({ refresh: refreshToken }),
          });
        }
      } else if (authUser?.company_email) {
        await fetch(`${API_BASE}/api/users/logout/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: authUser.company_email }),
        });
      }
    } catch (e) {
      console.error("Error calling backend logout", e);
    } finally {
      clearAuthStorage();
      setAuthRole(null);
      setAuthUser(null);
      navigate("/");
    }
  };

  const renderPage = () => {
    switch (currentPath) {
      case "/":
        return <Dasboard onNavigate={navigate} onLogout={handleLogout} />;
      case "/monitor":
        return <Monitor />;
      case "/user-management":
        return <UserMangerment />;
      case "/profilecard":
        return <ProfileCard />;
      case "/admin-profile":
        return <AdminProfile />;
      default:
        return <Dasboard onNavigate={navigate} />;
    }
  };

  if (!authRole || !authUser) {
    return (
      <Login
        onLoginSuccess={(user) => handleLoginSuccess(user, "admin")}
        onDeveloperLoginSuccess={(employee, type) => {
          const resolvedType = type || (localStorage.getItem("tester_user") ? "tester" : "developer");
          handleLoginSuccess(employee, resolvedType);
        }}
      />
    );
  }

  if (getRequirePasswordChange() && authUser) {
    return (
      <MandatoryChangePassword
        user={authUser}
        onPasswordChanged={() => {
          localStorage.removeItem("require_password_change");
          window.location.reload();
        }}
        onLogout={handleLogout}
      />
    );
  }

  if (authRole === "developer") {
    return <DeveloperDashboard developer={authUser} onLogout={handleLogout} />;
  }

  if (authRole === "tester") {
    return <TesterDashboard tester={authUser} onLogout={handleLogout} />;
  }

  const matchesNotifDate = (n) => {
    if (!notifDateFilter) return true;
    const timestamp = n.rawTimestamp || n.timestamp;
    if (!timestamp) return false;
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === notifDateFilter;
  };

  const filteredAdminNotifications = adminNotifications.filter(matchesNotifDate);
  const adminEmail = authUser?.company_email || authUser?.personal_email || authUser?.email || "";

  return (
    <div className="flex min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] antialiased overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        currentPath={currentPath}
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 overflow-hidden">
        <header className="flex items-center justify-between px-3 sm:px-6 h-14 sm:h-16 border-b bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              className="flex-shrink-0 p-2 rounded-lg md:hidden text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
              ADMIN PORTAL
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 relative flex-shrink-0">
            <ThemeSelector currentRole="admin" user={authUser} />

            <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200">
              <Calendar size={14} className="text-slate-500 flex-shrink-0" />
              <span className="font-medium text-xs whitespace-nowrap">{todayStr}</span>
            </div>

            <UserHeaderPanel
              user={{
                ...authUser,
                name: authUser?.username || authUser?.name || "vasanthan",
                role: authUser?.role || "Admin",
              }}
              notificationCount={adminNotifications.length}
              onBellClick={() => setShowNotifDropdown(!showNotifDropdown)}
              onLogout={handleLogout}
              onProfileClick={() => setShowProfileModal(true)}
              subtitle={adminEmail}
            />

            {showProfileModal && (
              <ProfileModal
                user={authUser}
                role="admin"
                onClose={() => setShowProfileModal(false)}
                onUpdateUser={(updated) => {
                  setAuthUser((prev) => ({ ...prev, ...updated }));
                  localStorage.setItem("admin_user", JSON.stringify({ ...authUser, ...updated }));
                }}
              />
            )}

            {showNotifDropdown && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 z-50 overflow-hidden text-left">
                <div className="p-3 bg-amber-50 dark:bg-slate-800 border-b border-amber-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-xs text-amber-900 dark:text-amber-200 uppercase tracking-wider">System Logs</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={notifDateFilter}
                      onChange={(e) => setNotifDateFilter(e.target.value)}
                      className="px-2 py-1 text-[10px] font-medium border border-amber-200 rounded-lg bg-white text-gray-800 focus:outline-none outline-none focus:ring-1 focus:ring-amber-400 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                      title="Filter notifications by date"
                    />
                    <button
                      onClick={() => {
                        const allIds = adminNotifications.map(n => String(n.id));
                        const existingCleared = JSON.parse(localStorage.getItem("admin_read_notifications") || "[]");
                        localStorage.setItem("admin_read_notifications", JSON.stringify(Array.from(new Set([...existingCleared, ...allIds]))));
                        setAdminNotifications([]);
                        window.dispatchEvent(new Event("notifications_updated"));
                      }}
                      className="text-[10px] text-amber-700 dark:text-amber-300 hover:underline font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                  {filteredAdminNotifications.length > 0 ? (
                    filteredAdminNotifications.map(n => (
                      <div key={n.id} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors">
                        <p className="font-bold text-gray-900 dark:text-gray-100">{n.message}</p>
                        <span className="text-[10px] text-gray-400 font-mono mt-1 block">{n.timestamp}</span>
                      </div>
                    ))
                  ) : (
                    <p className="p-6 text-center text-gray-400 italic text-xs">No matching system logs.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="p-3 sm:p-6 flex-1 overflow-x-hidden overflow-y-auto bg-[oklch(0.98_0.005_30)] dark:bg-[oklch(0.12_0.005_30)] min-w-0">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;