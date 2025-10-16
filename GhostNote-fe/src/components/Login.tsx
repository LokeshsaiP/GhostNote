import React, { useState, type FormEvent } from "react";
import API from "../api";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

interface LoginProps {
  setUser: (username: string | null) => void; // receive setter from App
  initialError?: string | null;
}

interface LoginResponse {
  success?: boolean;
  username?: string;
  error?: string;
}

const Login: React.FC<LoginProps> = ({ setUser, initialError }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false); // toggle password visibility
  const [error, setError] = useState(initialError || "");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await API.post<LoginResponse>(
        "/login",
        { username, password },
        { withCredentials: true }
      );

      if (response.data.error) {
        setError(response.data.error);
      } else if (response.data.success && response.data.username) {
        setUser(response.data.username);
        navigate("/"); // SPA redirect
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message =
          (err.response?.data as { error?: string })?.error ||
          err.message ||
          "An error occurred during login.";
        setError(message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#323232] min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#ddd0c8] rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#323232]">
          Log In
        </h2>

        {/* Dummy credentials info */}
        <div className="bg-[#f2f2f2] text-[#323232] p-4 rounded-md mb-6 text-sm border border-gray-300">
          <p className="font-semibold mb-1">Use this credential to log in:</p>
          <p>
            <strong>Username:</strong> Dummy@123
          </p>
          <p>
            <strong>Password:</strong> dummy#123
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="block mb-1 text-sm font-medium"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              placeholder="Enter your username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-black rounded-md ring-1 focus:outline-none"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block mb-1 text-sm font-medium"
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                id="password"
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-black rounded-md ring-1 pr-10 focus:outline-none"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600"
                onClick={() => setShowPass((prev) => !prev)}
              >
                <FontAwesomeIcon icon={showPass ? faEye : faEyeSlash} />
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 mt-1 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md font-semibold transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#323232] text-white hover:bg-[#1f1f1f]"
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-[#323232] mt-4 text-center">
          Don't have an account?{" "}
          <span
            className="cursor-pointer hover:underline"
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
