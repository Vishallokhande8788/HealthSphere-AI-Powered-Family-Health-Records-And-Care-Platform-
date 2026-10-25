import axios from "axios";

// ==================================================
// DJANGO BACKEND URL
// ==================================================

const API_BASE_URL =
  "https://redesigned-guacamole-69rpqqqjwpvjf4rqg-8000.app.github.dev/api/";

// ==================================================
// MAIN API CLIENT
// ==================================================

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ==================================================
// JWT REFRESH CLIENT
// ==================================================

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Prevent multiple refresh requests
let refreshPromise = null;

// ==================================================
// CLEAR AUTHENTICATION
// ==================================================

const clearAuthentication = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("username");

  delete api.defaults.headers.common["Authorization"];

  // Notify App.jsx that the session has expired
  window.dispatchEvent(new Event("auth:expired"));
};

// ==================================================
// REQUEST INTERCEPTOR
// ==================================================

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("access");

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },

  (error) => Promise.reject(error),
);

// ==================================================
// RESPONSE INTERCEPTOR
// ==================================================

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 authentication errors
    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    // Do not refresh tokens during login or registration
    const requestURL = originalRequest.url || "";

    if (
      requestURL.includes("users/login/") ||
      requestURL.includes("users/register/") ||
      requestURL.includes("users/refresh/")
    ) {
      return Promise.reject(error);
    }

    // Get stored refresh token
    const refreshToken = localStorage.getItem("refresh");

    if (!refreshToken) {
      clearAuthentication();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // ==================================================
      // REFRESH ACCESS TOKEN
      // ==================================================

      if (!refreshPromise) {
        refreshPromise = refreshClient
          .post("users/refresh/", {
            refresh: refreshToken,
          })
          .then((response) => {
            const newAccessToken = response.data?.access;

            if (!newAccessToken) {
              throw new Error("Refresh response missing access token.");
            }

            // Save new access token
            localStorage.setItem("access", newAccessToken);

            // Save rotated refresh token if provided
            if (response.data?.refresh) {
              localStorage.setItem("refresh", response.data.refresh);
            }

            return newAccessToken;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccessToken = await refreshPromise;

      // Retry original request using new access token
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      console.error("JWT refresh failed:", refreshError);

      // Clear login only when refresh token is invalid
      if ([400, 401, 403].includes(refreshError.response?.status)) {
        clearAuthentication();
      }

      return Promise.reject(refreshError);
    }
  },
);

// ==================================================
// EXPORT API CLIENT
// ==================================================

export default api;
