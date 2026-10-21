import axios from "axios";

const api = axios.create({
  baseURL:
    "https://stunning-waffle-97qxrrrpwr9wf7wxg-8000.app.github.dev/api/",
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Authentication expired. Please log in again.");
    }

    return Promise.reject(error);
  }
);

export default api;