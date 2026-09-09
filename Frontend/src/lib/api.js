import { getLocalStorageItem } from "./storage";

export const getDynamicApiBase = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "");
  }
  return "";
};

export const API_BASE = getDynamicApiBase();

export const getAuthToken = () => {
  const rawToken = getLocalStorageItem("access_token") || "";
  if (!rawToken || rawToken === "undefined" || rawToken === "null") {
    return "";
  }
  return rawToken;
};

export const resolveApiUrl = (url) => {
  if (!url) return "/api";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return cleanPath;
};

export const authFetch = async (url, options = {}) => {
  const token = getAuthToken();
  const targetUrl = resolveApiUrl(url);
  const isStringToken = typeof token === "string" && token.trim().length > 0;

  const buildHeaders = (withAuth = true) => ({
    "Content-Type": "application/json",
    ...(withAuth && isStringToken ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  });

  const getCandidateUrls = (path) => {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return [path];
    }
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const candidates = [];

    if (API_BASE) {
      candidates.push(`${API_BASE}${cleanPath}`);
    }

    candidates.push(cleanPath);

    if (typeof window !== "undefined" && window.location) {
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        candidates.push(`http://127.0.0.1:8000${cleanPath}`);
        candidates.push(`http://127.0.0.1:8001${cleanPath}`);
      }
    }

    return Array.from(new Set(candidates));
  };

  const urlsToTry = getCandidateUrls(targetUrl);
  let lastError = null;

  for (const candidateUrl of urlsToTry) {
    try {
      const response = await fetch(candidateUrl, {
        ...options,
        headers: buildHeaders(true),
      });

      if (response.status === 401 && isStringToken && (options.method === "GET" || !options.method)) {
        const retryRes = await fetch(candidateUrl, {
          ...options,
          headers: buildHeaders(false),
        });
        if (retryRes.ok) {
          return retryRes;
        }
      }

      if (response.status === 502 || response.status === 503 || response.status === 504) {
        lastError = new Error(`Proxy error status ${response.status}`);
        continue;
      }

      return response;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new TypeError("Failed to fetch from all backend targets");
};

export const fetchJson = async (url, options = {}) => {
  const response = await authFetch(url, options);
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { response, ok: response.ok, status: response.status, data };
};
