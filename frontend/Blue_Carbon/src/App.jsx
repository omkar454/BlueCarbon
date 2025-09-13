// frontend/src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "./components/Layout/MainLayout";
import HomePage from "./components/Pages/HomePage";
import AboutPage from "./components/Pages/AboutPage";
import BlueCarbonPage from "./components/Pages/BlueCarbonPage";
import DashboardSelector from "./components/Pages/DashboardSelector";
import AdminDashboard from "./components/AdminDashboard";
import NGOForm from "./components/NGOForm";
import VerifierDashboard from "./components/VerifierDashboard";
import CompanyDashboard from "./components/CompanyDashboard";

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Pages with Layout */}
        <Route
          path="/"
          element={
            <MainLayout>
              <HomePage />
            </MainLayout>
          }
        />
        <Route
          path="/about"
          element={
            <MainLayout>
              <AboutPage />
            </MainLayout>
          }
        />
        <Route
          path="/blue-carbon"
          element={
            <MainLayout>
              <BlueCarbonPage />
            </MainLayout>
          }
        />
        <Route
          path="/projects"
          element={
            <MainLayout>
              <div className="py-16 text-center">
                <h1 className="text-3xl font-bold">Projects Coming Soon</h1>
              </div>
            </MainLayout>
          }
        />
        <Route
          path="/contact"
          element={
            <MainLayout>
              <div className="py-16 text-center">
                <h1 className="text-3xl font-bold">Contact Us Coming Soon</h1>
              </div>
            </MainLayout>
          }
        />
        <Route
          path="/platform"
          element={
            <MainLayout>
              <DashboardSelector />
            </MainLayout>
          }
        />

        {/* Dashboard Pages without Layout */}
        <Route path="/dashboard" element={<NGOForm />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/verifier" element={<VerifierDashboard />} />
        <Route path="/company" element={<CompanyDashboard />} />
      </Routes>
    </Router>
  );
};

export default App;
