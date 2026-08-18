
export const THEMES = [
  { id: 'indigo', name: 'Royal Indigo', primaryColor: '#4f46e5', accentColor: '#818cf8', roleDefault: 'admin' },
  { id: 'emerald', name: 'Tech Emerald', primaryColor: '#059669', accentColor: '#34d399', roleDefault: 'developer' },
  { id: 'rose', name: 'Sunset Rose', primaryColor: '#e11d48', accentColor: '#fb7185', roleDefault: 'tester' },
  { id: 'cyan', name: 'Ocean Cyan', primaryColor: '#0891b2', accentColor: '#22d3ee' },
  { id: 'amber', name: 'Deep Amber', primaryColor: '#d97706', accentColor: '#fbbf24' },
  { id: 'purple', name: 'Mystic Violet', primaryColor: '#9333ea', accentColor: '#c084fc' },
];

export const getDefaultThemeForRole = (role) => {
  if (role === 'admin') return 'indigo';
  if (role === 'developer') return 'emerald';
  if (role === 'tester') return 'rose';
  return 'indigo';
};

export const getUserThemeKey = (user, role) => {
  const userId = user?.employee_id || user?.id || user?.email || user?.username || role || 'default';
  return `app_theme_${role}_${userId}`;
};

export const getSavedTheme = (user, role) => {
  try {
    const key = getUserThemeKey(user, role);
    const saved = localStorage.getItem(key);
    if (saved && THEMES.some(t => t.id === saved)) {
      return saved;
    }
  } catch (e) {
    console.error("error in theme", e);
  }
  return getDefaultThemeForRole(role);
};

export const applyTheme = (themeId) => {
  const targetTheme = THEMES.some(t => t.id === themeId) ? themeId : 'indigo';
  document.documentElement.dataset.theme = targetTheme;
  window.dispatchEvent(new CustomEvent('theme_changed', { detail: targetTheme }));
};

export const saveAndApplyUserTheme = (user, role, themeId) => {
  try {
    const key = getUserThemeKey(user, role);
    localStorage.setItem(key, themeId);
  } catch (e) {
    console.error("error in applytheme", e);
  }
  applyTheme(themeId);
};

/**
 * Synchronously reads the logged-in user's role and saved theme from localStorage
 * and applies it to <html data-theme="..."> BEFORE React renders.
 * Call this once in main.jsx before createRoot() to eliminate theme flash on refresh.
 */
export const applyThemeOnLoad = () => {
  try {
    // Determine the current role from localStorage (same logic as getStoredAuth)
    const accessToken = localStorage.getItem('access_token');
    const adminUser = JSON.parse(localStorage.getItem('admin_user') || 'null');
    const developerUser = JSON.parse(localStorage.getItem('developer_user') || 'null');
    const testerUser = JSON.parse(localStorage.getItem('tester_user') || 'null');

    let role = null;
    let user = null;

    if (adminUser && accessToken) {
      role = 'admin';
      user = adminUser;
    } else if (developerUser) {
      role = 'developer';
      user = developerUser;
    } else if (testerUser) {
      role = 'tester';
      user = testerUser;
    }

    if (role) {
      const theme = getSavedTheme(user, role);
      applyTheme(theme);
    }
  } catch (e) {
    // Silently fail — theme will be applied by ThemeSelector on mount
    console.error('applyThemeOnLoad error:', e);
  }
};

export const getProjectPrefix = (projectName) => {
  if (!projectName?.trim()) return "PRJ";
  const clean = projectName.trim().replace(/[^a-zA-Z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words.map(w => w[0].toUpperCase()).join("");
  }
  const word = words[0];
  if (word.length <= 4) return word.toUpperCase();
  return word.slice(0, 3).toUpperCase();
};