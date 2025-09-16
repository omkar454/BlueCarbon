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
    if (!ngoWallet)
      return alert("Project Developer wallet missing for this project");

    const amount = prompt(
      `Enter CCT amount to buy (Available: ${availableCCT}):`
    );
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      return alert("Enter a valid amount");
    if (Number(amount) > availableCCT)
      return alert(`Only ${availableCCT} CCT available`);

    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/createBuyRequest`, {
        companyId: company._id,
        projectId,
        amount: Number(amount),
      });

      if (res.data.success) {
        alert("✅ Buy request created! The Project Developer will review it.");
        fetchCompanyStatus(company.walletAddress);
      } else {
        alert("❌ Failed to create buy request: " + res.data.error);
      }
    } catch (err) {
      console.error("❌ Create buy request error:", err);
      alert(
        "❌ " + (err.response?.data?.error || "Error creating buy request")
      );
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
        alert("🔥 CCT retired successfully! Certificate generated.");
        if (res.data.pdfUrl) {
          window.open(`http://localhost:5000${res.data.pdfUrl}`, "_blank");
        }
        fetchCompanyStatus(company.walletAddress);
      } else {
        alert("❌ Failed to record retirement: " + res.data.error);
      }
    } catch (err) {
      console.error("❌ Retire CCT error:", err);
      let errorMessage = "Error retiring CCT";
      if (err.code === "INSUFFICIENT_FUNDS")
        errorMessage = "Insufficient funds for gas";
      else if (err.code === "USER_REJECTED")
        errorMessage = "Transaction rejected by user";
      else if (err.response?.data?.error)
        errorMessage = err.response.data.error;
      alert("❌ " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6 text-center">
          <span className="text-blue-600">Company</span> Dashboard
        </h1>
        <p className="text-center text-gray-600 mb-10">
          Manage your company details, carbon credit projects, and transactions.
        </p>

        {/* Status Messages */}
        {error && (
          <div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg shadow-sm"
            role="alert"
          >
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded-lg shadow-sm">
            <p className="font-bold">Loading...</p>
            <p>Please wait while we fetch your data.</p>
          </div>
        )}

        {/* Registration Section */}
        {!submitted && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Register Your Company
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Company Name"
                value={company.name}
                onChange={(e) =>
                  setCompany({ ...company, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Wallet Address"
                value={company.walletAddress}
                onChange={(e) =>
                  setCompany({ ...company, walletAddress: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Registration Number"
                value={company.registrationNumber}
                onChange={(e) =>
                  setCompany({ ...company, registrationNumber: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Sector"
                value={company.sector}
                onChange={(e) =>
                  setCompany({ ...company, sector: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSubmitCompany}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-300"
              >
                Submit for Verification
              </button>
            </div>
          </div>
        )}

        {/* Pending Approval Message */}
        {submitted && !isVerified && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-6 rounded-lg mb-8 shadow-md">
            <div className="flex items-center">
              <svg
                className="h-6 w-6 text-yellow-500 mr-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.487 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <h2 className="text-xl font-bold">Awaiting NCCR Approval</h2>
            </div>
            <p className="mt-2 text-sm">
              Thank you for submitting your company details. Your request is now
              being reviewed by the National Carbon Credit Registry. You will be
              able to access the full dashboard once your company is verified.
            </p>
          </div>
        )}

        {/* Verified Dashboard Content */}
        {isVerified && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Available Projects
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.length === 0 && (
                  <p className="text-gray-500 text-center col-span-full">
                    No projects are currently available for purchase.
                  </p>
                )}
                {projects.map((proj) => {
                  const ownedCCT =
                    (proj.boughtCCT || 0) - (proj.retiredCCT || 0);
                  const availableCCT =
                    (proj.totalMintedCCT || 0) -
                    (proj.bufferCCT || 0) -
                    (proj.retiredCCT || 0) -
                    (proj.soldCCT || 0);

                  return (
                    <div
                      key={proj._id}
                      className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between h-full"
                    >
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {proj.projectName}
                        </h3>
                        <p className="text-sm text-gray-600 italic mb-4">
                          {proj.description}
                        </p>

                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-700">
                          <p>
                            <strong>Ecosystem:</strong> {proj.ecosystemType}
                          </p>
                          <p>
                            <strong>Saplings:</strong> {proj.saplings}
                          </p>
                          <p>
                            <strong>Area:</strong> {proj.area} ha
                          </p>
                          <p>
                            <strong>Survival Rate:</strong> {proj.survivalRate}%
                          </p>
                          <p>
                            <strong>Project Years:</strong> {proj.projectYears}
                          </p>
                          <p>
                            <strong>Status:</strong>{" "}
                            <span
                              className={`font-bold ${
                                proj.status === "Minted"
                                  ? "text-green-600"
                                  : "text-yellow-600"
                              }`}
                            >
                              {proj.status}
                            </span>
                          </p>
                          <p>
                            <strong>Total Minted CCT:</strong>{" "}
                            <span className="font-bold">
                              {proj.totalMintedCCT || 0}
                            </span>
                          </p>
                          <p>
                            <strong>Available CCT:</strong>{" "}
                            <span className="font-bold text-blue-600">
                              {availableCCT}
                            </span>
                          </p>
                          <p>
                            <strong>Owned CCT:</strong>{" "}
                            <span className="font-bold text-green-600">
                              {ownedCCT}
                            </span>
                          </p>
                          <p>
                            <strong>Retired CCT:</strong>{" "}
                            <span className="font-bold">
                              {proj.retiredCCT || 0}
                            </span>
                          </p>
                          {proj.cid && (
                            <p className="col-span-2">
                              <a
                                href={`https://ipfs.io/ipfs/${proj.cid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline inline-flex items-center"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 mr-1"
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
                                View Evidence
                              </a>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 mt-4">
                        <button
                          onClick={() =>
                            handleBuy(
                              proj._id,
                              availableCCT,
                              proj.ngoWalletAddress
                            )
                          }
                          disabled={
                            loading ||
                            !(availableCCT > 0 && proj.ngoWalletAddress)
                          }
                          className={`w-full px-4 py-2 rounded-md font-semibold text-white transition duration-300 ${
                            loading ||
                            !(availableCCT > 0 && proj.ngoWalletAddress)
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {loading ? "Processing..." : "Request CCT"}
                        </button>
                        <button
                          onClick={() => handleRetire(proj._id, ownedCCT)}
                          disabled={loading || ownedCCT <= 0}
                          className={`w-full px-4 py-2 rounded-md font-semibold text-white transition duration-300 ${
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
              </div>
            </div>

            {/* Transaction History Section */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Transaction History
              </h2>
              {transactions.length === 0 ? (
                <p className="text-gray-500">No transactions recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Type
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Project
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Amount
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Transaction Hash
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((tx) => (
                        <tr key={tx._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tx.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tx.projectName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                            {tx.amount} CCT
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600 underline hover:text-blue-800">
                            <a
                              href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyDashboard;
