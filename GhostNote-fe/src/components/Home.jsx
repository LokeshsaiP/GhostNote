import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import { faGhost } from "@fortawesome/free-solid-svg-icons";
import {
  faEye,
  faEyeSlash,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import API from "../api";

const Home = ({ user, setUser }) => {
  const [secret, setSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [expiration, setExpiration] = useState("15m");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setSecret(""); // Clear secret if file is selected
      // Set filePreview to a truthy value to ensure filename is always shown
      setFilePreview(true);
    } else {
      setFile(null);
      setFilePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let fileUrl = null;
      let fileName = null;
      let fileType = null;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await API.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        fileUrl = uploadRes.data.fileUrl;
        fileName = uploadRes.data.fileName;
        fileType = uploadRes.data.fileType;
      }

      const res = await API.post("/encrypt", {
        secret,
        passphrase,
        expiration,
        fileUrl,
        fileName,
        fileType,
      });
      const backendLink = res.data.link;
      const secretId = backendLink.split("/").pop();

      if (secretId) {
        const frontendLink = `${window.location.origin}/secret/${secretId}`;
        navigate("/LinkPreview", {
          state: { link: frontendLink, fileName: fileName },
        });
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          navigate("/unauthorized");
          return;
        }
        console.error("Error:", err.response?.data?.error || err.message);
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await API.post("/logout", {}, { withCredentials: true });
      setUser?.(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };
  return (
    <div className="bg-[#323232] text-[#ddd0c8] font-sans min-h-screen">
      <header className="bg-[#ddd0c8] text-[#323232] shadow-md">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold tracking-wide">
            <FontAwesomeIcon icon={faGhost} className="mr-2 text-[#323232]" />
            GhostNote
          </Link>
          <ul className="flex space-x-6 font-medium">
            <li>
              <Link to="/" className="hover:text-[#1f1f1f]">
                Home
              </Link>
            </li>
            <li>
              <Link to="#" className="hover:text-[#1f1f1f]">
                About
              </Link>
            </li>
            <li>
              <Link to="#" className="hover:text-[#1f1f1f]">
                Services
              </Link>
            </li>
            {user ? (
              <li>
                <button onClick={handleLogout} className="hover:text-[#1f1f1f]">
                  Logout
                </button>
              </li>
            ) : (
              <li>
                <Link to="/login" className="hover:text-[#1f1f1f]">
                  Login
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </header>

      <main className="container mx-auto px-6 py-12">
        <section className="text-center mb-10">
          {user ? (
            <h1 className="text-4xl font-bold mb-2">Welcome, {user}</h1>
          ) : (
            <h1 className="text-4xl font-bold mb-2">Welcome to GhostNote</h1>
          )}
          <p className="text-lg text-[#ccc]">
            Paste any secret message that you want to send.
          </p>
          <p className="italic font-semibold mt-1">
            Keep your sensitive data secure
          </p>
        </section>

        <section className="max-w-2xl mx-auto bg-[#3d3d3d] rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
            <label htmlFor="secret" className="text-lg font-medium">
              Your Secret
            </label>
            <textarea
              id="secret"
              rows={6}
              placeholder="Enter your secret..."
              value={secret}
              onChange={(e) => {
                setSecret(e.target.value);
                setFile(null);
                setFilePreview(null);
              }}
              className="resize-none rounded-md p-4 bg-[#2b2b2b] border border-[#555] focus:outline-none focus:ring-2 focus:ring-[#ddd0c8] text-[#ddd0c8] placeholder-[#aaa]"
              disabled={!!file}
            />

            <div className="flex items-center justify-center w-full py-4">
              <span className="text-lg font-medium">OR</span>
            </div>

            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#555] rounded-lg cursor-pointer bg-[#2b2b2b] hover:bg-[#3d3d3d] transition-all duration-200"
            >
              {filePreview ? (
                <p className="text-lg text-[#ddd0c8]">
                  File Selected: {file?.name}
                </p>
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg
                    className="w-8 h-8 mb-4 text-[#ddd0c8]"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 16"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L7 9m3-3 3 3"
                    />
                  </svg>
                  <p className="mb-2 text-sm text-[#ddd0c8]">
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
                  </p>
                  <p className="text-xs text-[#aaa]">
                    PNG, JPG, GIF or any file type
                  </p>
                </div>
              )}

              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            <div>
              <label htmlFor="passphrase" className="block mb-6 text-lg">
                Passphrase
              </label>
              <div className="relative w-full">
                <input
                  type={showPass ? "text" : "password"}
                  id="passphrase"
                  placeholder="Enter Passphrase"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="border border-[#555] rounded-md bg-[#2b2b2b] p-4 pr-12 w-full focus:outline-none focus:ring-2 focus:ring-[#ddd0c8] text-[#ddd0c8]"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((prev) => !prev)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  <FontAwesomeIcon icon={showPass ? faEye : faEyeSlash} />
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="expiration"
                className="block mb-6 text-lg font-medium"
              >
                Expires In
              </label>
              <div className="relative">
                <select
                  id="expiration"
                  value={expiration}
                  onChange={(e) => setExpiration(e.target.value)}
                  className="appearance-none w-full bg-[#2b2b2b] border border-[#555] text-[#ddd0c8] text-base rounded-md py-3 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-[#ddd0c8] transition-all duration-200"
                >
                  <option value="1m">Expires in 1 minute</option>
                  <option value="5m">Expires in 5 minutes</option>
                  <option value="15m">Expires in 15 minutes</option>
                  <option value="30m">Expires in 30 minutes</option>
                  <option value="1h">Expires in 1 hour</option>
                  <option value="3h">Expires in 3 hours</option>
                  <option value="10h">Expires in 10 hours</option>
                  <option value="1d">Expires in 1 day</option>
                  <option value="7d">Expires in 7 days</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#aaa]">
                  <FontAwesomeIcon icon={faChevronDown} />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={(!secret.trim() && !file) || loading}
              className="self-center bg-[#ddd0c8] text-[#323232] font-semibold px-6 py-2 rounded-md hover:bg-[#c9bdb3] transition-all duration-200 disabled:cursor-not-allowed"
            >
              {loading ? "Generating..." : "Generate Link"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default Home;
