export function getUserAvatarKeys(user) {
  if (!user) return [];
  const keys = new Set();
  [
    user.company_email,
    user.email,
    user.personal_email,
    user.employee_id,
    user.username,
    user.name,
    user.id,
  ].forEach((val) => {
    if (val) {
      keys.add(`user_avatar_${String(val).toLowerCase().trim()}`);
    }
  });
  return Array.from(keys);
}

export function getUserAvatarKey(user) {
  const keys = getUserAvatarKeys(user);
  return keys.length > 0 ? keys[0] : null;
}

export function getRoleAvatarKey(roleOrUser) {
  if (!roleOrUser) return null;
  const role = typeof roleOrUser === "string"
    ? roleOrUser
    : (roleOrUser.role || roleOrUser.jobTitle || (roleOrUser.is_staff ? "admin" : ""));
  const clean = String(role).toLowerCase().trim();
  if (clean.includes("admin")) return "role_avatar_admin";
  if (clean.includes("cto")) return "role_avatar_cto";
  if (clean.includes("designer") || clean === "des") return "role_avatar_designer";
  if (clean.includes("developer") || clean === "dev") return "role_avatar_developer";
  if (clean.includes("tester")) return "role_avatar_tester";
  return null;
}

export function getStoredAvatar(user, explicitRole) {
  if (user?.avatarUrl) return user.avatarUrl;
  if (user?.avatar) return user.avatar;

  // 1. Specific user keys (email, username, name, id)
  const keys = getUserAvatarKeys(user);
  for (const key of keys) {
    const saved = localStorage.getItem(key);
    if (saved) return saved;
  }

  // 2. Role-based avatar key (e.g. role_avatar_admin)
  const roleKey = getRoleAvatarKey(explicitRole || user);
  if (roleKey) {
    const roleSaved = localStorage.getItem(roleKey);
    if (roleSaved) return roleSaved;
  }

  // Check admin specific aliases if user is admin or currently in admin portal
  const isUserAdmin = (explicitRole || user?.role || "").toString().toLowerCase().includes("admin") ||
    user?.is_staff ||
    localStorage.getItem("active_role") === "admin" ||
    (typeof window !== "undefined" && window.location.pathname.startsWith("/user-management"));
  if (isUserAdmin) {
    const adminSaved = localStorage.getItem("role_avatar_admin") ||
      localStorage.getItem("admin_role_avatar") ||
      localStorage.getItem("admin_avatar");
    if (adminSaved) return adminSaved;
  }

  // 3. Stored role user fallback
  const checkOrder = isUserAdmin
    ? ["admin_user", "developer_user", "tester_user"]
    : ["tester_user", "developer_user", "admin_user"];

  for (const roleStorageKey of checkOrder) {
    try {
      const stored = localStorage.getItem(roleStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.avatarUrl) return parsed.avatarUrl;
        if (parsed?.avatar) return parsed.avatar;
      }
    } catch {}
  }

  // 4. Fallback global
  const fallbackGlobal = localStorage.getItem("current_user_avatar");
  if (fallbackGlobal) return fallbackGlobal;

  return null;
}

export function saveStoredAvatar(user, avatarUrl, explicitRole) {
  const keys = getUserAvatarKeys(user);
  keys.forEach((key) => {
    if (avatarUrl) {
      localStorage.setItem(key, avatarUrl);
    } else {
      localStorage.removeItem(key);
    }
  });

  const roleKey = getRoleAvatarKey(explicitRole || user);
  if (roleKey) {
    if (avatarUrl) {
      localStorage.setItem(roleKey, avatarUrl);
    } else {
      localStorage.removeItem(roleKey);
    }
  }

  const isUserAdmin = (explicitRole || user?.role || "").toString().toLowerCase().includes("admin") ||
    user?.is_staff ||
    localStorage.getItem("active_role") === "admin";
  if (isUserAdmin) {
    if (avatarUrl) {
      localStorage.setItem("admin_role_avatar", avatarUrl);
      localStorage.setItem("admin_avatar", avatarUrl);
      localStorage.setItem("role_avatar_admin", avatarUrl);
    } else {
      localStorage.removeItem("admin_role_avatar");
      localStorage.removeItem("admin_avatar");
      localStorage.removeItem("role_avatar_admin");
    }
  }

  if (avatarUrl) {
    localStorage.setItem("current_user_avatar", avatarUrl);
  } else {
    localStorage.removeItem("current_user_avatar");
  }

  ["admin_user", "developer_user", "tester_user"].forEach((storageKey) => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (avatarUrl) {
          parsed.avatarUrl = avatarUrl;
        } else {
          delete parsed.avatarUrl;
          delete parsed.avatar;
        }
        localStorage.setItem(storageKey, JSON.stringify(parsed));
      }
    } catch (e) {
      console.error("Error updating avatar in localStorage", e);
    }
  });

  window.dispatchEvent(new Event("user_profile_updated"));
}
