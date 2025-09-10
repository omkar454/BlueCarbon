import React, { useEffect, useState } from "react";
import axios from "axios";

const CompanyDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [wallet, setWallet] = useState("");

  const fetchProjects = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/company/projects");
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch projects");
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleBuy = async (projectId) => {
    if (!wallet) return alert("Enter your wallet private key");

    const amount = prompt("Enter CCT amount to buy:");
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      return alert("Enter a valid amount");

    try {
      const res = await axios.post("http://localhost:5000/api/company/buy", {
        companyWallet: wallet,
        projectId,
        amount,
      });
      if (res.data.success) {
        alert(`CCT purchase simulated! TX Hash: ${res.data.txHash}`);
        fetchProjects(); // Refresh project list or balances
      }
    } catch (err) {
      console.error(err);
      alert("Error buying CCT");
    }
  };

  const handleRetire = async (projectId) => {
    if (!wallet) return alert("Enter your wallet private key");

    const amount = prompt("Enter CCT amount to retire:");
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      return alert("Enter a valid amount");

    try {
      const res = await axios.post("http://localhost:5000/api/company/retire", {
        companyWallet: wallet,
        amount,
        projectId,
      });
      if (res.data.success) {
        alert(`CCT retired! Certificate saved at: ${res.data.pdfPath}`);
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
      alert("Error retiring CCT");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-blue-800">
          Company Dashboard
        </h1>

        {/* Wallet Input */}
        <div className="mb-4 p-4 bg-white rounded shadow">
          <input
            type="text"
            placeholder="Enter your wallet private key"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            className="border p-2 w-full rounded"
          />
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          {projects.length === 0 && (
            <p className="text-gray-600">No projects available.</p>
          )}
          {projects.map((proj) => (
            <div
              key={proj._id}
              className="bg-white p-4 rounded shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-2"
            >
              <div>
                <h2 className="font-semibold text-lg">{proj.projectName}</h2>
                <p>Ecosystem: {proj.ecosystemType}</p>
                <p>Status: {proj.status}</p>
                {proj.ipfsCid && (
                  <p>
                    <a
                      href={`https://ipfs.io/ipfs/${proj.ipfsCid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View Evidence
                    </a>
                  </p>
                )}
                <p>Minted CCT: {proj.mintedCCT || 0}</p>
                <p>Retired CCT: {proj.retiredCCT || 0}</p>
              </div>

              <div className="space-x-2 mt-2 md:mt-0">
                <button
                  onClick={() => handleBuy(proj._id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  Buy CCT
                </button>
                <button
                  onClick={() => handleRetire(proj._id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                >
                  Retire CCT
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;
