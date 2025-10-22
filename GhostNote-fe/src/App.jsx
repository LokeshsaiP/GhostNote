import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Home from "./components/Home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Secret from "./components/Secret";
import LinkPreview from "./components/LinkPreview";
import Unauthorized from "./components/Unauthorized";
import API from "./api";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await API.get("/me");
        if (res.data.username) setUser(res.data.username);
      } catch (error) {
        setUser(null);
      }
    };
    fetchUser();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home user={user} setUser={setUser} />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/signup" element={<Signup setUser={setUser} />} />
        <Route path="/secret/:id" element={<Secret />} />
        <Route path="/LinkPreview" element={<LinkPreview />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
