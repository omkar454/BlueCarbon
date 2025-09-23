// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { ethers } from "ethers";

const AdminDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [verifierInputs, setVerifierInputs] = useState({});
  const [loading, setLoading] = useState(false);
  const [pendingCompanies, setPendingCompanies] = useState([]);

  /* ---------------------- FETCH PROJECTS ---------------------- */
  const fetchProjects = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/projects/all");
      const projectsData = res.data.projects || [];
      setProjects(projectsData);

      const inputs = {};
      projectsData.forEach((project) => {
        inputs[project._id] = [
          project.verifiers?.[0] || "",
          project.verifiers?.[1] || "",
          project.verifiers?.[2] || "",
        ];
      });
      setVerifierInputs(inputs);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to fetch projects");
    }
  };

  /* ---------------------- FETCH COMPANIES ---------------------- */
  const fetchPendingCompanies = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/company/pending");
      setPendingCompanies(res.data.companies || []);
    } catch (err) {
      console.error(err);
      alert(
        err?.response?.data?.message || "Failed to fetch pending companies"
      );
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchPendingCompanies();
  }, []);

  /* ---------------------- PROJECT FUNCTIONS ---------------------- */
  const handleVerifierChange = (projectId, index, value) => {
    setVerifierInputs((prev) => {
      const arr = prev[projectId] ? [...prev[projectId]] : ["", "", ""];
      arr[index] = value;
      return { ...prev, [projectId]: arr };
    });
  };

  const handleAddVerifierOnChain = async (projectId, verifierAddress) => {
    if (!verifierAddress || !ethers.isAddress(verifierAddress)) {
      return alert("Invalid Ethereum address");
    }
    try {
      setLoading(true);
      const res = await axios.post("http://localhost:5000/api/verifier/add", {
        projectId,
        verifiers: [verifierAddress],
      });
      if (res.data.success) {
        alert(`Verifier ${verifierAddress} added on-chain successfully!`);
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || `Failed to add verifier`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProject = async (projectId) => {
    const assignedVerifiers = verifierInputs[projectId];
    if (!assignedVerifiers || assignedVerifiers.length !== 3) {
      return alert("Please assign exactly 3 verifiers.");
    }
    for (let i = 0; i < assignedVerifiers.length; i++) {
      if (!ethers.isAddress(assignedVerifiers[i])) {
        return alert(`Verifier ${i + 1} address is invalid.`);
      }
    }
    try {
      setLoading(true);
      const res = await axios.post(
        "http://localhost:5000/api/projects/assignVerifiers",
        { projectId, verifiers: assignedVerifiers }
      );
      if (res.data.success) {
        alert("Project approved and verifiers assigned!");
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to approve project");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectProject = async (projectId) => {
    try {
      setLoading(true);
      const res = await axios.post(
        "http://localhost:5000/api/projects/reject",
        { projectId }
      );
      if (res.data.success) {
        alert("Project rejected!");
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to reject project");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------- COMPANY FUNCTIONS ---------------------- */
  const handleApproveCompany = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/company/approve/${id}`);
      alert("Company approved!");
      fetchPendingCompanies();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to approve company");
    }
  };

  const handleRejectCompany = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/company/reject/${id}`);
      alert("Company rejected!");
      fetchPendingCompanies();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to reject company");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-10 text-center drop-shadow-sm">
          <span className="text-blue-600">NCCR</span> Admin Dashboard
        </h1>

        {/* ------------------ PROJECTS SECTION ------------------ */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-10 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
            Submitted Projects
          </h2>
          {projects.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No projects found. Awaiting new submissions!
            </p>
          ) : (
            <div className="space-y-8">
              {projects.map((project) => (
                <div
                  key={project._id}
                  className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out"
                >
                  {/* Header + Status */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        {project.projectName}
                      </h3>
                      <p className="text-sm text-gray-600 italic">
                        {project.description}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        project.status === "Approved"
                          ? "bg-green-100 text-green-800"
                          : project.status === "Rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      Status: {project.status}
                    </span>
                  </div>

                  {/* Project Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6 text-gray-700 text-sm mb-6 pb-6 border-b border-gray-100">
                    <div className="flex flex-col space-y-1">
                      <p>
                        <strong>Ecosystem Type:</strong> {project.ecosystemType}
                      </p>
                      <p>
                        <strong>Location:</strong> {project.location?.[0]},{" "}
                        {project.location?.[1]}
                      </p>
                      <p>
                        <strong>Developer Wallet:</strong>{" "}
                        <span className="font-mono text-xs">
                          {project.ngoWalletAddress}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <p>
                        <strong>Saplings Planted:</strong> {project.saplings}
                      </p>
                      <p>
                        <strong>Survival Rate:</strong> {project.survivalRate}%
                      </p>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <p>
                        <strong>Duration:</strong> {project.projectYears} years
                      </p>
                      <p>
                        <strong>Area:</strong> {project.area} hectares
                      </p>
                    </div>
                  </div>

                  {/* Evidence */}
                  {project.cid && (
                    <div className="mb-6">
                      <a
                        href={`https://ipfs.io/ipfs/${project.cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                      >
                        View Project Evidence (IPFS)
                      </a>
                    </div>
                  )}

                  {/* Pending Actions */}
                  {project.status === "Pending" && (
                    <div className="pt-4 border-t border-gray-100">
                      <h4 className="text-md font-semibold text-gray-800 mb-3">
                        Assign Verifiers & Actions
                      </h4>

                      {/* Verifier Inputs */}
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
                        {Array(3)
                          .fill(0)
                          .map((_, i) => (
                            <div
                              key={i}
                              className="flex gap-2 items-center flex-grow"
                            >
                              <input
                                type="text"
                                placeholder={`Verifier ${i + 1} address`}
                                value={verifierInputs[project._id]?.[i] || ""}
                                onChange={(e) =>
                                  handleVerifierChange(
                                    project._id,
                                    i,
                                    e.target.value
                                  )
                                }
                                className="border border-gray-300 rounded-md p-2 flex-grow focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                              <button
                                disabled={loading}
                                onClick={() =>
                                  handleAddVerifierOnChain(
                                    project._id,
                                    verifierInputs[project._id]?.[i]
                                  )
                                }
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md transition-colors duration-200 text-sm font-semibold"
                              >
                                Add Verifier {i + 1}
                              </button>
                            </div>
                          ))}
                      </div>

                      {/* Approve / Reject */}
                      <div className="flex gap-2 w-full lg:w-auto mt-4">
                        <button
                          disabled={loading}
                          onClick={() => handleApproveProject(project._id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition-colors duration-200 flex-grow text-sm font-semibold"
                        >
                          {loading ? "Processing..." : "Approve Project"}
                        </button>
                        <button
                          disabled={loading}
                          onClick={() => handleRejectProject(project._id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md transition-colors duration-200 flex-grow text-sm font-semibold"
                        >
                          {loading ? "Processing..." : "Reject Project"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Assigned Verifiers */}
                  {project.status === "Approved" &&
                    project.verifiers?.length > 0 && (
                      <div className="pt-4 border-t border-gray-100 mt-6">
                        <p className="text-md font-semibold text-gray-800">
                          Assigned Verifiers:
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {project.verifiers.map((verifier, index) => (
                            <span
                              key={index}
                              className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-mono"
                            >
                              {verifier}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ------------------ COMPANIES SECTION ------------------ */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
            Pending Company Verifications
          </h2>
          {pendingCompanies.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No pending company requests.
            </p>
          ) : (
            <div className="space-y-4">
              {pendingCompanies.map((company) => (
                <div
                  key={company._id}
                  className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="text-gray-700 text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 flex-grow">
                    <p>
                      <strong>Company Name:</strong> {company.name}
                    </p>
                    <p>
                      <strong>Wallet Address:</strong>{" "}
                      <span className="font-mono text-xs">
                        {company.walletAddress}
                      </span>
                    </p>
                    <p>
                      <strong>Registration No:</strong>{" "}
                      {company.registrationNumber}
                    </p>
                    <p>
                      <strong>Sector:</strong> {company.sector}
                    </p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                    <button
                      onClick={() => handleApproveCompany(company._id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md transition-colors duration-200 text-sm font-semibold flex-grow"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectCompany(company._id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-md transition-colors duration-200 text-sm font-semibold flex-grow"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
