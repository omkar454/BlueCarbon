// frontend/src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import AdminDashboard from "./components/AdminDashboard";
import NGOForm from "./components/NGOForm";
import VerifierDashboard from "./components/VerifierDashboard";
import CompanyDashboard from "./components/CompanyDashboard";

const App = () => {
  return (
    <Router>
      <div>
        <nav className="bg-blue-800 p-4 text-white flex gap-4">
          <Link to="/">NGO Form</Link>
          <Link to="/admin">Admin Dashboard</Link>
          <Link to="/verifier">Verifier Dashboard</Link>
          <Link to="/company">Company Dashboard</Link>
        </nav>

        <Routes>
          <Route path="/" element={<NGOForm />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/verifier" element={<VerifierDashboard />} />
          <Route path="/company" element={<CompanyDashboard />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
