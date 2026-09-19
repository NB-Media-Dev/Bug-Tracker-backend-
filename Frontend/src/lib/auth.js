import {
  getLocalStorageItem,
  getLocalStorageJson,
  removeLocalStorageItem,
  setLocalStorageItem,
  setLocalStorageJson,
} from "./storage";

export const ADMIN_USER_KEY = "admin_user";
export const DEVELOPER_USER_KEY = "developer_user";
export const TESTER_USER_KEY = "tester_user";
export const ACCESS_TOKEN_KEY = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";
export const REQUIRE_PWD_CHANGE_KEY = import.meta.env.VITE_REQUIRE_PWD_CHANGE_KEY || "require_pwd_change";


export const ACTIVE_ROLE_KEY = "active_role";


export const getStoredAuth = () => {
  const token = getLocalStorageItem(ACCESS_TOKEN_KEY, "");
  const adminUser = getLocalStorageJson(ADMIN_USER_KEY, null);
  const developerUser = getLocalStorageJson(DEVELOPER_USER_KEY, null);
  const testerUser = getLocalStorageJson(TESTER_USER_KEY, null);
  const activeRole = (getLocalStorageItem(ACTIVE_ROLE_KEY, "") || getLocalStorageItem("user_role", "")).toLowerCase().trim();

  if (adminUser && token) {
    const isCto = (adminUser?.role || "").toString().toLowerCase() === "cto" ||
      getLocalStorageItem("admin_portal_role", "") === "cto" ||
      activeRole === "cto";
    return { role: isCto ? "cto" : "admin", user: adminUser };
  }

  if (developerUser) {
    const roleStr = (developerUser.role || developerUser.jobTitle || "").toString().toLowerCase().trim();
    const empIdStr = (developerUser.employee_id || developerUser.id || "").toString().toUpperCase().trim();
    const isDesigner =
      activeRole === "designer" ||
      roleStr === "designer" ||
      roleStr.includes("design") ||
      roleStr === "des" ||
      empIdStr.startsWith("DES");

    return { role: isDesigner ? "designer" : "developer", user: developerUser };
  }

  if (testerUser) {
    return { role: "tester", user: testerUser };
  }

  return { role: null, user: null };
};

export const clearAuthStorage = () => {
  removeLocalStorageItem(ACCESS_TOKEN_KEY);
  removeLocalStorageItem(REFRESH_TOKEN_KEY);
  removeLocalStorageItem(ADMIN_USER_KEY);
  removeLocalStorageItem(DEVELOPER_USER_KEY);
  removeLocalStorageItem(TESTER_USER_KEY);
  removeLocalStorageItem(REQUIRE_PWD_CHANGE_KEY);
  removeLocalStorageItem("admin_portal_role");
  removeLocalStorageItem(ACTIVE_ROLE_KEY);
  removeLocalStorageItem("user_role");
};


import { getStoredAvatar, saveStoredAvatar } from "./avatar";

export const setAdminAuth = (token, refreshToken, user) => {
  setLocalStorageItem(ACCESS_TOKEN_KEY, token);
  setLocalStorageItem(REFRESH_TOKEN_KEY, refreshToken);
  const adminUser = { ...user };
  if (adminUser.avatar && !adminUser.avatarUrl) {
    adminUser.avatarUrl = adminUser.avatar;
  }
  const fallbackAvatar = adminUser.avatarUrl || getStoredAvatar(adminUser, "admin");
  if (fallbackAvatar) {
    adminUser.avatarUrl = fallbackAvatar;
    saveStoredAvatar(adminUser, fallbackAvatar, "admin");
  }
  setLocalStorageJson(ADMIN_USER_KEY, adminUser);
  removeLocalStorageItem(DEVELOPER_USER_KEY);
  removeLocalStorageItem(TESTER_USER_KEY);
};

export const setDeveloperAuth = (user, token = "", refreshToken = "") => {
  if (token) setLocalStorageItem(ACCESS_TOKEN_KEY, token);
  if (refreshToken) setLocalStorageItem(REFRESH_TOKEN_KEY, refreshToken);
  const devUser = { ...user };
  const role = (devUser.role || "").toLowerCase().includes("des") ? "designer" : "developer";
  const fallbackAvatar = devUser.avatarUrl || devUser.avatar || getStoredAvatar(devUser, role);
  if (fallbackAvatar) {
    devUser.avatarUrl = fallbackAvatar;
    saveStoredAvatar(devUser, fallbackAvatar, role);
  }
  setLocalStorageJson(DEVELOPER_USER_KEY, devUser);
  removeLocalStorageItem(ADMIN_USER_KEY);
  removeLocalStorageItem(TESTER_USER_KEY);
};

export const setTesterAuth = (user, token = "", refreshToken = "") => {
  if (token) setLocalStorageItem(ACCESS_TOKEN_KEY, token);
  if (refreshToken) setLocalStorageItem(REFRESH_TOKEN_KEY, refreshToken);
  const testerUser = { ...user };
  const fallbackAvatar = testerUser.avatarUrl || testerUser.avatar || getStoredAvatar(testerUser, "tester");
  if (fallbackAvatar) {
    testerUser.avatarUrl = fallbackAvatar;
    saveStoredAvatar(testerUser, fallbackAvatar, "tester");
  }
  setLocalStorageJson(TESTER_USER_KEY, testerUser);
  removeLocalStorageItem(ADMIN_USER_KEY);
  removeLocalStorageItem(DEVELOPER_USER_KEY);
};

export const getAuthToken = () => getLocalStorageItem(ACCESS_TOKEN_KEY, "");

export const getRequirePasswordChange = () => getLocalStorageItem(REQUIRE_PWD_CHANGE_KEY) === "true";
export const setRequirePasswordChange = (value) => setLocalStorageItem(REQUIRE_PWD_CHANGE_KEY, value ? "true" : "false");
