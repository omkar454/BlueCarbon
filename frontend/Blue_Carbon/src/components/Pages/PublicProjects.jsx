// src/components/PublicProjects.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

// Assuming your backend has a public-facing API endpoint
// E.g., a route in your Express app that serves all minted projects
const BASE_URL = "http://localhost:5000/api/public";

const PublicProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetches only projects that have been officially minted.
  const fetchProjects = async () => {
    setLoading(true);
    setError("");
    try {
      // API call to the public endpoint
      const res = await axios.get(`${BASE_URL}/projects`);
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error(
        "❌ Fetch projects error:",
        err.response?.data || err.message
      );
      setError(err.response?.data?.error || "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6 text-center">
          <span className="text-green-600">Verified</span> Carbon Projects
        </h1>
        <p className="text-center text-gray-600 mb-10">
          Explore a list of all publicly verified carbon projects.
        </p>

        {/* Status Messages */}
        {loading && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded-lg shadow-sm">
            <p className="font-bold">Loading...</p>
            <p>Please wait while we fetch the project data.</p>
          </div>
        )}

        {error && (
          <div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg shadow-sm"
            role="alert"
          >
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Project List */}
        <div className="space-y-6">
          {projects.length === 0 && !loading && !error && (
            <p className="text-gray-500 text-center">
              No projects are currently available for public viewing.
            </p>
          )}

          {projects.map((proj) => (
            <div
              key={proj._id}
              className="bg-white rounded-xl shadow-lg p-8 border border-gray-200"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {proj.projectName}
              </h2>
              <p className="text-md text-gray-600 italic mb-4">
                {proj.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm text-gray-700">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-bold text-gray-900">Ecosystem</p>
                  <p>{proj.ecosystemType}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-bold text-gray-900">Project Area</p>
                  <p>{proj.area} hectares</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-bold text-gray-900">Saplings Planted</p>
                  <p>{proj.saplings}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-bold text-gray-900">Survival Rate</p>
                  <p>{proj.survivalRate}%</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-bold text-gray-900">Total Minted CCT</p>
                  <p>{proj.totalMintedCCT || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-bold text-gray-900">Status</p>
                  <span
                    className={`font-bold ${
                      proj.status === "Minted"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {proj.status}
                  </span>
                </div>
              </div>

              {/* View Public Evidence Link */}
              {proj.cid && (
                <div className="mt-6 text-center">
                  <a
                    href={`https://ipfs.io/ipfs/${proj.cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition duration-300"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    View Public Evidence
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PublicProjects;
