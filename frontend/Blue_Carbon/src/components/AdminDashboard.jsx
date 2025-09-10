// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { ethers } from "ethers";

const AdminDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [verifierInputs, setVerifierInputs] = useState({}); // {projectId: ["", "", ""]}
  const [loading, setLoading] = useState(false);

  // Fetch all projects
  const fetchProjects = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/projects/all");
      const projectsData = res.data.projects || [];
      setProjects(projectsData);

      // Pre-populate verifier inputs for approved projects
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
      alert("Failed to fetch projects");
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Update verifier input for project
  const handleVerifierChange = (projectId, index, value) => {
    setVerifierInputs((prev) => {
      const arr = prev[projectId] ? [...prev[projectId]] : ["", "", ""];
      arr[index] = value;
      return { ...prev, [projectId]: arr };
    });
  };

  // Add a single verifier on-chain
  const handleAddVerifierOnChain = async (projectId, verifierAddress) => {
    if (!verifierAddress || !ethers.isAddress(verifierAddress)) {
      return alert("Invalid Ethereum address");
    }

    try {
      setLoading(true);
      const res = await axios.post(
        "http://localhost:5000/api/verifier/add",
        { projectId, verifiers: [verifierAddress] }
      );
      if (res.data.success) {
        alert(`Verifier ${verifierAddress} added on-chain successfully!`);
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to add verifier ${verifierAddress}`);
    } finally {
      setLoading(false);
    }
  };

  // Approve project and assign 3 verifiers in DB
  const handleApprove = async (projectId) => {
    const assignedVerifiers = verifierInputs[projectId];
    if (!assignedVerifiers || assignedVerifiers.length !== 3) {
      return alert("Please assign exactly 3 verifiers for this project.");
    }

    // Validate Ethereum addresses
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
        alert("Project approved and verifiers assigned in DB!");
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to approve project");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (projectId) => {
    try {
      setLoading(true);
      const res = await axios.post("http://localhost:5000/api/projects/reject", {
        projectId,
      });
      if (res.data.success) {
        alert("Project rejected!");
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to reject project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-800 mb-6">
          NCCR Admin Dashboard
        </h1>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Submitted Projects</h2>
          {projects.length === 0 && <p>No projects found.</p>}
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project._id}
                className="border rounded p-4 flex flex-col gap-2"
              >
                <div>
                  <h3 className="font-semibold text-lg">{project.projectName}</h3>
                  <p>{project.description}</p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      className={
                        project.status === "Approved"
                          ? "text-green-600"
                          : project.status === "Rejected"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }
                    >
                      {project.status}
                    </span>
                  </p>
                </div>

                {project.status === "Pending" && (
                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <div className="flex flex-col md:flex-row gap-2">
                      {Array(3)
                        .fill(0)
                        .map((_, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <input
                              type="text"
                              placeholder={`Verifier ${i + 1} address`}
                              value={
                                verifierInputs[project._id]
                                  ? verifierInputs[project._id][i]
                                  : ""
                              }
                              onChange={(e) =>
                                handleVerifierChange(project._id, i, e.target.value)
                              }
                              className="border rounded p-2"
                            />
                            <button
                              disabled={loading}
                              onClick={() =>
                                handleAddVerifierOnChain(
                                  project._id,
                                  verifierInputs[project._id][i]
                                )
                              }
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                            >
                              Add Verifier {i + 1}
                            </button>
                          </div>
                        ))}
                    </div>

                    <button
                      disabled={loading}
                      onClick={() => handleApprove(project._id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                    >
                      Approve
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handleReject(project._id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {project.status === "Approved" && (
                  <p>
                    <strong>Assigned Verifiers:</strong>{" "}
                    {project.verifiers.join(" | ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
