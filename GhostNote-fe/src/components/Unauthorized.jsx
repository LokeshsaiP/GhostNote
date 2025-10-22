import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGhost } from "@fortawesome/free-solid-svg-icons";

const Unauthorized = () => {
  return (
    <div className="bg-[#323232] text-[#ddd0c8] font-sans min-h-screen flex flex-col">
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
            <li>
              <Link to="/login" className="hover:text-[#1f1f1f]">
                Login
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      <main className="flex-grow flex items-center justify-center px-6">
        <div className="bg-[#3d3d3d] max-w-lg w-full rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-4xl font-bold text-[#ff6b6b] mb-4">
            401 - Unauthorized
          </h1>
          <p className="text-lg mb-6">
            You are not authorized to access this page. Please log in first.
          </p>
          <Link
            to="/login"
            className="inline-block bg-[#ddd0c8] text-[#323232] px-6 py-2 rounded-md font-semibold hover:bg-[#c9bdb3] transition-all duration-200"
          >
            Go to Login
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Unauthorized;
