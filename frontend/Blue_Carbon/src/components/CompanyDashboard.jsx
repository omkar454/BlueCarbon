// src/components/CompanyDashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { ethers } from "ethers";
import tokenJson from "../../Contracts/CarbonCreditToken.json";

const BASE_URL = "http://localhost:5000/api/company";
const CONTRACT_ADDRESS = "0x07b4E818447DF5Ef5724C5c0d20C568e0aF461E2"; // From deployed_contract_address.txt
const ABI = tokenJson.abi;

const CompanyDashboard = () => {
  const [company, setCompany] = useState({
    name: "",
    walletAddress: "",
    registrationNumber: "",
    sector: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch company status & projects
  const fetchCompanyStatus = async (wallet) => {
    if (!wallet) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${BASE_URL}/projects?wallet=${wallet}`);
      const companyData = res.data.company;
      const projectsData = res.data.projects || [];

      if (companyData) {
        setCompany(companyData);
        setIsVerified(companyData.isVerified);
        setSubmitted(true);
        localStorage.setItem("companyWallet", companyData.walletAddress);
      }

      setProjects(projectsData);

      if (companyData?._id) {
        const txRes = await axios.get(
          `${BASE_URL}/transactions/${companyData._id}`
        );
        if (txRes.data.success) setTransactions(txRes.data.transactions);
      }
    } catch (err) {
      console.error(
        "❌ Fetch company status error:",
        err.response?.data || err.message
      );
      setError(err.response?.data?.error || "Failed to fetch company data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedWallet = localStorage.getItem("companyWallet");
    if (storedWallet) fetchCompanyStatus(storedWallet);
  }, []);

  // Submit company details
  const handleSubmitCompany = async () => {
    const { name, walletAddress, registrationNumber, sector } = company;
    if (!name || !walletAddress || !registrationNumber || !sector) {
      return alert("Please fill all fields");
    }
    try {
      const res = await axios.post(`${BASE_URL}/register`, company);
      if (res.data.success) {
        alert(res.data.message || "Company details submitted!");

        // Fetch latest company status immediately
        fetchCompanyStatus(walletAddress);
      }
    } catch (err) {
      console.error(
        "❌ Submit company error:",
        err.response?.data || err.message
      );
      alert(err.response?.data?.error || "Failed to submit company details");
    }
  };

  // Create buy request for CCT
  const handleBuy = async (projectId, availableCCT, ngoWallet) => {
    if (!ngoWallet) return alert("NGO wallet missing for this project");

    const amount = prompt(
      `Enter CCT amount to buy (Available: ${availableCCT}):`
    );
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      return alert("Enter a valid amount");
    if (Number(amount) > availableCCT)
      return alert(`Only ${availableCCT} CCT available`);

    setLoading(true);
    try {
      // Create buy request
      const res = await axios.post(`${BASE_URL}/createBuyRequest`, {
        companyId: company._id,
        projectId,
        amount: Number(amount),
      });

      if (res.data.success) {
        alert(
          "✅ Buy request created! The NGO will be notified to approve your request."
        );
        // Refresh data
        await fetchCompanyStatus(company.walletAddress);
      } else {
        alert("❌ Failed to create buy request: " + res.data.error);
      }
    } catch (err) {
      console.error("❌ Create buy request error:", err);
      let errorMessage = "Error creating buy request";

      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }

      alert("❌ " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Retire CCT
  const handleRetire = async (projectId, ownedCCT) => {
    const amount = prompt(`Enter CCT amount to retire (Owned: ${ownedCCT}):`);
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      return alert("Enter a valid amount");
    if (Number(amount) > ownedCCT)
      return alert(`Only ${ownedCCT} CCT can be retired`);

    setLoading(true);
    try {
      if (!window.ethereum) return alert("MetaMask not detected");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const weiAmount = ethers.parseUnits(amount.toString(), 18);

      // Check company's balance
      const balance = await contract.balanceOf(company.walletAddress);
      if (balance < weiAmount) {
        alert("❌ Insufficient CCT balance for retirement");
        return;
      }

      const tx = await contract.retireCredits(weiAmount);
      await tx.wait();

      const res = await axios.post(`${BASE_URL}/retire`, {
        companyWallet: company.walletAddress,
        projectId,
        amount: Number(amount),
        txHash: tx.hash,
      });

      if (res.data.success) {
        alert(`🔥 CCT retired successfully! Certificate generated.`);
        if (res.data.pdfUrl) {
          // Construct full URL for the PDF
          const fullPdfUrl = `http://localhost:5000${res.data.pdfUrl}`;
          window.open(fullPdfUrl, "_blank");
        }
        // Refresh data
        await fetchCompanyStatus(company.walletAddress);
      } else {
        alert("❌ Failed to record retirement: " + res.data.error);
      }
    } catch (err) {
      console.error("❌ Retire CCT error:", err);
      let errorMessage = "Error retiring CCT";

      if (err.code === "INSUFFICIENT_FUNDS") {
        errorMessage = "Insufficient funds for gas";
      } else if (err.code === "USER_REJECTED") {
        errorMessage = "Transaction rejected by user";
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }

      alert("❌ " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                <span className="text-blue-600">Company</span> Dashboard
              </h1>
              <p className="text-gray-600">
                Manage your blue carbon projects and carbon credit transactions
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm2 2a1 1 0 000 2h6a1 1 0 100-2H5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <strong>Error:</strong> {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading Display */}
        {loading && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="animate-spin h-5 w-5 text-blue-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Loading...</strong> Please wait while we process your
                  request.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Registration Form */}
        {!submitted && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Company Registration
              </h2>
              <p className="text-gray-600">
                Register your company to participate in the blue carbon
                ecosystem
              </p>
            </div>
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

        {/* Pending Approval */}
        {submitted && !isVerified && (
          <div className="bg-yellow-100 p-6 rounded shadow mb-6">
            <p className="text-yellow-800 font-semibold">
              Your company details have been submitted. Awaiting NCCR
              approval...
            </p>
          </div>
        )}

        {/* Verified Dashboard */}
        {isVerified && (
          <div className="space-y-4">
            {projects.length === 0 && (
              <p className="text-gray-600">No projects available.</p>
            )}

            {projects.map((proj) => {
              const ownedCCT = (proj.boughtCCT || 0) - (proj.retiredCCT || 0);
              return (
                <div
                  key={proj._id}
                  className="bg-white p-4 rounded shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-2"
                >
                  <div>
                    <h2 className="font-semibold text-lg">
                      {proj.projectName}
                    </h2>
                    <p>Ecosystem: {proj.ecosystemType}</p>
                    <p>Status: {proj.status}</p>
                    <p>NGO Wallet: {proj.ngoWalletAddress || "❌ Missing"}</p>
                    {proj.cid && (
                      <p>
                        <a
                          href={`https://ipfs.io/ipfs/${proj.cid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          View Evidence
                        </a>
                      </p>
                    )}
                    <p>Total Minted CCT: {proj.totalMintedCCT || 0}</p>
                    <p>Available CCT: {proj.availableCCT || 0}</p>
                    <p>Owned CCT: {ownedCCT}</p>
                    <p>Retired CCT: {proj.retiredCCT || 0}</p>
                  </div>

                  <div className="space-x-2 mt-2 md:mt-0">
                    <button
                      onClick={() =>
                        handleBuy(
                          proj._id,
                          proj.availableCCT,
                          proj.ngoWalletAddress
                        )
                      }
                      disabled={
                        loading ||
                        !(proj.availableCCT > 0 && proj.ngoWalletAddress)
                      }
                      className={`px-4 py-2 rounded text-white ${
                        loading ||
                        !(proj.availableCCT > 0 && proj.ngoWalletAddress)
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {loading ? "Processing..." : "Request CCT"}
                    </button>
                    <button
                      onClick={() => handleRetire(proj._id, ownedCCT)}
                      disabled={loading || ownedCCT <= 0}
                      className={`px-4 py-2 rounded text-white ${
                        loading || ownedCCT <= 0
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {loading ? "Processing..." : "Retire CCT"}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Transaction History */}
            <div className="bg-white p-4 rounded shadow mt-6">
              <h2 className="text-xl font-semibold mb-4">
                Transaction History
              </h2>
              {transactions.length === 0 && <p>No transactions yet.</p>}
              {transactions.length > 0 && (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border p-2">Type</th>
                      <th className="border p-2">Project</th>
                      <th className="border p-2">Amount</th>
                      <th className="border p-2">TX Hash</th>
                      <th className="border p-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx._id}>
                        <td className="border p-2">{tx.type}</td>
                        <td className="border p-2">{tx.projectName}</td>
                        <td className="border p-2">{tx.amount}</td>
                        <td className="border p-2">
                          <a
                            href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                            {tx.txHash.slice(0, 10)}...
                          </a>
                        </td>
                        <td className="border p-2">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyDashboard;
