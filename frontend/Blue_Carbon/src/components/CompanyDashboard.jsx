import React, { useEffect, useState } from "react";
import axios from "axios";

const CompanyDashboard = () => {
  const [company, setCompany] = useState({
    name: "",
    walletAddress: "",
    registrationNumber: "",
    sector: "",
  });
  const [isVerified, setIsVerified] = useState(false);
  const [projects, setProjects] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  /* ---------------------- CHECK COMPANY STATUS ---------------------- */
  const fetchCompanyStatus = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/company/projects");
      if (res.data.company) {
        setCompany(res.data.company);
        setIsVerified(res.data.company.isVerified);
        setSubmitted(true);
      }
      if (res.data.projects) setProjects(res.data.projects);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCompanyStatus();
  }, []);

  /* ---------------------- SUBMIT COMPANY DETAILS ---------------------- */
  const handleSubmitCompany = async () => {
    const { name, walletAddress, registrationNumber, sector } = company;
    if (!name || !walletAddress || !registrationNumber || !sector) {
      return alert("Please fill all fields");
    }
    try {
      const res = await axios.post(
        "http://localhost:5000/api/company/register",
        company
      );
      if (res.data.success) {
        alert("Company details submitted! Await NCCR approval.");
        setSubmitted(true);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit company details");
    }
  };

  /* ---------------------- BUY / RETIRE ---------------------- */
  const handleBuy = async (projectId) => {
    const amount = prompt("Enter CCT amount to buy:");
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      return alert("Enter a valid amount");

    try {
      const res = await axios.post("http://localhost:5000/api/company/buy", {
        companyWallet: company.walletAddress,
        projectId,
        amount,
        txHash: "SIMULATED_TX_HASH", // Temporary placeholder
      });
      if (res.data.success) {
        alert(`CCT purchase simulated! TX Hash: ${res.data.txHash}`);
        fetchCompanyStatus();
      }
    } catch (err) {
      console.error(err);
      alert("Error buying CCT");
    }
  };

  const handleRetire = async (projectId) => {
    const amount = prompt("Enter CCT amount to retire:");
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      return alert("Enter a valid amount");

    try {
      const res = await axios.post("http://localhost:5000/api/company/retire", {
        companyWallet: company.walletAddress,
        projectId,
        amount,
        txHash: "SIMULATED_TX_HASH", // Temporary placeholder
      });
      if (res.data.success) {
        alert(`CCT retired! Certificate saved at: ${res.data.pdfUrl}`);
        fetchCompanyStatus();
      }
    } catch (err) {
      console.error(err);
      alert("Error retiring CCT");
    }
  };

  /* ---------------------- RENDER ---------------------- */
  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-800">
          Company Dashboard
        </h1>

        {/* ------------------- SUBMIT DETAILS ------------------- */}
        {!submitted && (
          <div className="bg-white p-6 rounded shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">
              Enter Company Details
            </h2>
            {["name", "walletAddress", "registrationNumber", "sector"].map(
              (field) => (
                <input
                  key={field}
                  type="text"
                  placeholder={field.replace(/([A-Z])/g, " $1")}
                  value={company[field]}
                  onChange={(e) =>
                    setCompany({ ...company, [field]: e.target.value })
                  }
                  className="border p-2 w-full rounded mb-2"
                />
              )
            )}
            <button
              onClick={handleSubmitCompany}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Submit
            </button>
          </div>
        )}

        {/* ------------------- AWAITING APPROVAL ------------------- */}
        {submitted && !isVerified && (
          <div className="bg-yellow-100 p-6 rounded shadow mb-6">
            <p className="text-yellow-800 font-semibold">
              Your company details have been submitted. Awaiting NCCR
              approval...
            </p>
          </div>
        )}

        {/* ------------------- APPROVED PROJECTS ------------------- */}
        {isVerified && (
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
        )}
      </div>
    </div>
  );
};

export default CompanyDashboard;
