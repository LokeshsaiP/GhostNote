import React, { useState, type FormEvent } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

interface SignupProps {
  setUser: (username: string | null) => void; // receive setter from App
  initialUsername?: string;
  initialPassword?: string;
  initialError?: string;
}

const Signup: React.FC<SignupProps> = ({
  setUser,
  initialUsername = "",
  initialPassword = "",
  initialError = "",
}) => {
  const [username, setUsername] = useState<string>(initialUsername);
  const [password, setPassword] = useState<string>(initialPassword);
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string>(initialError);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await API.post("/signup", { username, password });

      if (response.data.success && response.data.username) {
        setUser(response.data.username); // update global user state
        navigate("/"); // redirect to home SPA-style
      } else {
        setError(response.data.error || "Signup failed");
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#323232] min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#ddd0c8] rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#323232]">
          Sign Up
        </h2>

        <form className="space-y-4" onSubmit={handleSubmit}>
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
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2 border border-black rounded-md ring-1 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block mb-1 text-sm font-medium"
            >
              Create Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-black rounded-md ring-1 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block mb-1 text-sm font-medium"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-black rounded-md ring-1 focus:outline-none"
            />
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#323232] text-white py-2 px-4 rounded-md hover:bg-[#1f1f1f] transition disabled:opacity-50"
          >
            {loading ? "Signing Up..." : "Sign Up"}
          </button>
        </form>

        <p className="text-sm text-[#323232] mt-4 text-center">
          Already have an account?{" "}
          <span
            className="cursor-pointer hover:underline"
            onClick={() => navigate("/login")}
          >
            Log In
          </span>
        </p>
      </div>
    </div>
  );
};

export default Signup;
