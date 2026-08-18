export const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const getLocalStorageItem = (key, fallback = null) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
};

export const getLocalStorageJson = (key, fallback = null) => {
  try {
    const value = localStorage.getItem(key);
    return value ? safeJsonParse(value, fallback) : fallback;
  } catch {
    return fallback;
  }
};

export const setLocalStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    console.error("error in setlocalstroage")
  }
};

export const setLocalStorageJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error("error in setlocalstroage")
  }
};

export const removeLocalStorageItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    console.error("error in removelocalstroage")
  }
};
