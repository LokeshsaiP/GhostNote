import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const LinkPreview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;
  const [link, setLink] = useState(null);
  const [copyStatus, setCopyStatus] = useState("Copy Link");

  useEffect(() => {
    if (!state?.link) {
      navigate("/");
    } else {
      setLink(state.link);
    }
  }, [state, navigate]);

  const copyToClipboard = () => {
    if (!link) return;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(link)
        .then(() => {
          setCopyStatus("Copied!");
          setTimeout(() => setCopyStatus("Copy Link"), 2000);
        })
        .catch(() => setCopyStatus("Failed"));
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        const successful = document.execCommand("copy");
        setCopyStatus(successful ? "Copied!" : "Failed");
      } catch {
        setCopyStatus("Failed");
      } finally {
        document.body.removeChild(textarea);
        setTimeout(() => setCopyStatus("Copy Link"), 2000);
      }
    }
  };

  return (
    <div className="bg-[#323232] text-[#ddd0c8] min-h-screen flex items-center justify-center px-4">
      <div className="bg-[#3d3d3d] p-8 rounded-xl shadow-lg max-w-lg w-full text-center">
        {link ? (
          <>
            <h2 className="text-2xl font-bold mb-4">Here's your link!</h2>
            <div className="bg-[#2b2b2b] p-4 rounded-md mb-4 break-all border border-[#555]">
              <span className="text-[#ddd0c8]">{link}</span>
            </div>
            <button
              onClick={copyToClipboard}
              className={`font-semibold px-4 py-2 rounded-md transition-all duration-200 ${
                copyStatus === "Copied!"
                  ? "bg-green-500 text-white"
                  : "bg-[#ddd0c8] text-[#323232] hover:bg-[#c9bdb3]"
              }`}
            >
              {copyStatus}
            </button>
            <p className="mt-6 text-sm text-[#ccc]">
              Copy this link and send it to the person you want to share the
              secret with.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4">Sorry!</h2>
            <p>We couldn't generate a link for you.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default LinkPreview;
