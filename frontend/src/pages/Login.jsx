import { useState } from "react";
import api from "../api";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await api.post("users/login/", {
        username: username.trim(),
        password,
      });

      const accessToken = response.data?.access;
      const refreshToken = response.data?.refresh;

      if (!accessToken || !refreshToken) {
        throw new Error("Login response is missing JWT tokens.");
      }

      // Store JWT tokens
      localStorage.setItem("access", accessToken);
      localStorage.setItem("refresh", refreshToken);
      localStorage.setItem("username", username.trim());

      // Update Axios authorization
      api.defaults.headers.common["Authorization"] =
        `Bearer ${accessToken}`;

      // Open dashboard
      onLogin(username.trim());

    } catch (err) {
      console.error("Login error:", err);

      if (err.response?.status === 401) {
        setError("Invalid username or password.");
      } else if (err.response?.status === 404) {
        setError("Login API not found. Please check the backend URL.");
      } else if (err.code === "ECONNABORTED") {
        setError("Server is taking too long. Please try again.");
      } else if (!err.response) {
        setError(
          "Cannot connect to the server. Check Django and Codespaces ports."
        );
      } else {
        setError("Login failed. Please try again.");
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">

      <div className="w-full max-w-6xl min-h-[650px] bg-white rounded-3xl shadow-xl overflow-hidden flex">

        {/* LEFT SIDE */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-12 flex-col justify-between">

          <div>
            <div className="flex items-center gap-3 mb-16">

              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
                ♥
              </div>

              <div>
                <h1 className="text-xl font-bold">
                  Family Medicine
                </h1>

                <p className="text-blue-100 text-sm">
                  Tracker
                </p>
              </div>

            </div>

            <h2 className="text-5xl font-bold leading-tight">
              Better health
              <br />
              management
              <br />
              for your family.
            </h2>

            <p className="mt-6 text-blue-100 text-lg leading-relaxed max-w-md">
              Manage medicines, health records and family
              medical information in one simple platform.
            </p>
          </div>

          <div className="space-y-5">
            <p>✓ Medicine Management</p>
            <p>♥ Family Health Records</p>
            <p>✦ AI-Assisted Insights</p>
          </div>

        </div>

        {/* RIGHT SIDE */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-12">

          <div className="w-full max-w-md">

            <p className="text-blue-600 font-semibold text-sm mb-2">
              WELCOME BACK
            </p>

            <h2 className="text-4xl font-bold text-slate-900">
              Sign in
            </h2>

            <p className="text-slate-500 mt-3 mb-8">
              Access your family's health dashboard.
            </p>

            <form
              onSubmit={handleLogin}
              className="space-y-5"
            >

              {/* USERNAME */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Username
                </label>

                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Password
                </label>

                <div className="relative">

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="w-full px-4 py-3.5 pr-16 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-blue-600"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>

                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600"
                >
                  {error}
                </div>
              )}

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-200 hover:-translate-y-0.5 transition disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in →"}
              </button>

            </form>

            <p className="text-center text-xs text-slate-400 mt-10">
              Family Medicine Tracker © 2026
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;