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

export function getStoredAvatar(user) {
  if (user?.avatarUrl) return user.avatarUrl;
  if (user?.avatar) return user.avatar;

  const keys = getUserAvatarKeys(user);
  for (const key of keys) {
    const saved = localStorage.getItem(key);
    if (saved) return saved;
  }

  const fallbackGlobal = localStorage.getItem("current_user_avatar");
  if (fallbackGlobal) return fallbackGlobal;

  for (const roleKey of ["tester_user", "developer_user", "admin_user"]) {
    try {
      const stored = localStorage.getItem(roleKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.avatarUrl) return parsed.avatarUrl;
        if (parsed?.avatar) return parsed.avatar;
      }
    } catch {}
  }

  return null;
}

export function saveStoredAvatar(user, avatarUrl) {
  const keys = getUserAvatarKeys(user);
  keys.forEach((key) => {
    if (avatarUrl) {
      localStorage.setItem(key, avatarUrl);
    } else {
      localStorage.removeItem(key);
    }
  });

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
