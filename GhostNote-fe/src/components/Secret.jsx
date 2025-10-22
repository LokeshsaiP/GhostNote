import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import axios from "axios";

const Secret = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [passphrase, setPassphrase] = useState("");
  const [revealedSecret, setRevealedSecret] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id) return setLocalError("Invalid secret ID");

    setLoading(true);
    try {
      const { data } = await API.post(`/secret/${id}/reveal`, { passphrase });
      setRevealedSecret(data.secret);
      setLocalError(null);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          navigate("/unauthorized");
          return;
        }
        setLocalError(err.response?.data?.error || err.message);
      } else if (err instanceof Error) {
        setLocalError(err.message);
      } else {
        setLocalError("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#323232] text-[#ddd0c8] min-h-screen flex flex-col">
      <header className="bg-[#ddd0c8] text-[#323232]">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <a href="/" className="text-xl font-bold">
            GhostNote
          </a>
          <a href="/" className="font-medium hover:text-[#1f1f1f]">
            Home
          </a>
        </nav>
      </header>

      <main className="flex-grow container mx-auto px-6 py-12 flex items-center justify-center">
        <div className="bg-[#3d3d3d] p-8 rounded-xl shadow-lg max-w-lg w-full text-center">
          {revealedSecret ? (
            <>
              <h1 className="text-2xl font-bold mb-4">Your Secret</h1>
              <div className="bg-[#2b2b2b] p-6 rounded-md mb-6 break-words text-left">
                {revealedSecret}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
              {localError && <p className="text-red-400">{localError}</p>}
              <input
                type="password"
                placeholder="Enter Passphrase (if required)"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="p-4 rounded-md bg-[#2b2b2b] border border-[#555] text-[#ddd0c8] focus:outline-none focus:ring-2 focus:ring-[#ddd0c8]"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-[#ddd0c8] text-[#323232] px-6 py-2 rounded-md hover:bg-[#c9bdb3]"
              >
                {loading ? "Revealing..." : "Reveal Secret"}
              </button>
            </form>
          )}
          <button
            onClick={() => navigate("/")}
            className="mt-6 bg-[#ddd0c8] text-[#323232] px-6 py-2 rounded-md hover:bg-[#c9bdb3]"
          >
            ← Back Home
          </button>
        </div>
      </main>
    </div>
  );
};

export default Secret;
