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


export const getStoredAuth = () => {
  const token = getLocalStorageItem(ACCESS_TOKEN_KEY, "");
  const adminUser = getLocalStorageJson(ADMIN_USER_KEY, null);
  const developerUser = getLocalStorageJson(DEVELOPER_USER_KEY, null);
  const testerUser = getLocalStorageJson(TESTER_USER_KEY, null);

  if (adminUser && token) {
    return { role: "admin", user: adminUser };
  }

  if (developerUser) {
    return { role: "developer", user: developerUser };
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
};


export const setAdminAuth = (token, refreshToken, user) => {
  setLocalStorageItem(ACCESS_TOKEN_KEY, token);
  setLocalStorageItem(REFRESH_TOKEN_KEY, refreshToken);
  setLocalStorageJson(ADMIN_USER_KEY, user);
  removeLocalStorageItem(DEVELOPER_USER_KEY);
  removeLocalStorageItem(TESTER_USER_KEY);
};

export const setDeveloperAuth = (user, token = "", refreshToken = "") => {
  if (token) setLocalStorageItem(ACCESS_TOKEN_KEY, token);
  if (refreshToken) setLocalStorageItem(REFRESH_TOKEN_KEY, refreshToken);
  setLocalStorageJson(DEVELOPER_USER_KEY, user);
  removeLocalStorageItem(ADMIN_USER_KEY);
  removeLocalStorageItem(TESTER_USER_KEY);
};

export const setTesterAuth = (user, token = "", refreshToken = "") => {
  if (token) setLocalStorageItem(ACCESS_TOKEN_KEY, token);
  if (refreshToken) setLocalStorageItem(REFRESH_TOKEN_KEY, refreshToken);
  setLocalStorageJson(TESTER_USER_KEY, user);
  removeLocalStorageItem(ADMIN_USER_KEY);
  removeLocalStorageItem(DEVELOPER_USER_KEY);
};

export const getAuthToken = () => getLocalStorageItem(ACCESS_TOKEN_KEY, "");

export const getRequirePasswordChange = () => getLocalStorageItem(REQUIRE_PWD_CHANGE_KEY) === "true";
export const setRequirePasswordChange = (value) => setLocalStorageItem(REQUIRE_PWD_CHANGE_KEY, value ? "true" : "false");
