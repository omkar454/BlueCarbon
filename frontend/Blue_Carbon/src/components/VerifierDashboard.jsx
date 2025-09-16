// src/components/VerifierDashboard.jsx
import React, { useEffect, useState } from "react";
import { getPendingMintRequests, approveMintRequest } from "../api/mintApi";
import { ethers } from "ethers";
import tokenJson from "../../Contracts/CarbonCreditToken.json";

const VerifierDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [verifierAddress, setVerifierAddress] = useState("");
  const [signer, setSigner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mintMessage, setMintMessage] = useState(null);

  const fetchPendingRequests = async (address = verifierAddress) => {
    if (!address) return;
    try {
      const res = await getPendingMintRequests(address.toLowerCase());
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error("Failed to fetch pending requests:", err);
      alert("Failed to fetch pending requests");
    }
  };

  const handleConnectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask!");
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = (await signer.getAddress()).toLowerCase();
      setSigner(signer);
      setVerifierAddress(address);
      await fetchPendingRequests(address);
      alert(`✅ Connected as ${address}`);
    } catch (err) {
      console.error(err);
      alert("Wallet connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    if (!signer) return alert("Connect wallet first!");
    setLoading(true);
    try {
      const tokenAddress = "0x07b4E818447DF5Ef5724C5c0d20C568e0aF461E2";
      const tokenContract = new ethers.Contract(
        tokenAddress,
        tokenJson.abi,
        signer
      );
      const tx = await tokenContract.approveMint(BigInt(requestId));
      await tx.wait();

      const res = await approveMintRequest(requestId, verifierAddress, tx.hash);
      if (!res.data.success) return alert(`❌ ${res.data.error}`);

      const updatedRequest = res.data.mintRequest;
      updatedRequest.approvals = updatedRequest.approvals || {};

      setRequests((prev) =>
        prev.map((r) =>
          r.requestId === requestId ? { ...r, ...updatedRequest } : r
        )
      );

      const approvalsCount = Object.values(updatedRequest.approvals).filter(
        (v) => v === true
      ).length;

      if (updatedRequest.status === "Executed") {
        const totalAmount = Number(updatedRequest.amount);
        const developerAmount = Math.floor(totalAmount * 0.9);
        const bufferAmount = totalAmount - developerAmount;

        setMintMessage({
          ngoWallet: updatedRequest.ngoWallet,
          bufferWallet: updatedRequest.bufferWallet,
          developerAmount,
          bufferAmount,
        });

        alert(
          `✅ CCT Minted Successfully!\nProject Developer Wallet: ${updatedRequest.ngoWallet}\nBuffer Wallet: ${updatedRequest.bufferWallet}`
        );
        setTimeout(() => setMintMessage(null), 20000);
      } else {
        alert(`✅ Approval recorded! (${approvalsCount} approvals)`);
      }
    } catch (err) {
      console.error(err);
      alert("Error approving request: " + (err?.reason || err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = async (accounts) => {
      if (accounts.length > 0) {
        const newAddress = accounts[0].toLowerCase();
        const provider = new ethers.BrowserProvider(window.ethereum);
        const newSigner = await provider.getSigner();
        setSigner(newSigner);
        setVerifierAddress(newAddress);
        fetchPendingRequests(newAddress);
        alert(`Switched to verifier: ${newAddress}`);
      } else {
        setSigner(null);
        setVerifierAddress("");
        setRequests([]);
      }
    };
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () =>
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
  }, []);

  useEffect(() => {
    if (verifierAddress) {
      fetchPendingRequests(verifierAddress);
      const interval = setInterval(
        () => fetchPendingRequests(verifierAddress),
        10000
      );
      return () => clearInterval(interval);
    }
  }, [verifierAddress]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-6 text-center drop-shadow-sm">
          <span className="text-blue-600">Verifier</span> Dashboard
        </h1>
        <p className="text-center text-gray-600 mb-10">
          Review and approve project verification requests.
        </p>

        {/* Wallet Connection Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200 flex flex-col md:flex-row md:items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-2 md:mb-0">
              {verifierAddress ? (
                <span className="text-green-600 text-2xl">✅</span>
              ) : (
                <span className="text-gray-400 text-2xl">🔗</span>
              )}
              <p className="text-lg font-medium text-gray-800">
                {verifierAddress
                  ? "Wallet Connected"
                  : "Connect Your Wallet to Get Started"}
              </p>
            </div>
            {verifierAddress && (
              <p className="text-sm text-gray-700 mt-2">
                Connected as:{" "}
                <span className="font-mono">{verifierAddress}</span>
              </p>
            )}
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={handleConnectWallet}
              disabled={loading || !!verifierAddress}
              className={`px-6 py-3 rounded-full text-white font-semibold transition-all duration-300 ${
                verifierAddress
                  ? "bg-green-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading
                ? "Connecting..."
                : verifierAddress
                ? "Connected"
                : "Connect Wallet"}
            </button>
          </div>
        </div>

        {/* Minted CCT message */}
        {mintMessage && (
          <div className="bg-green-100 border border-green-400 p-6 rounded-lg mb-8 shadow-md transition-opacity duration-500 ease-in-out">
            <h2 className="text-green-800 font-bold text-xl mb-3">
              🎉 CCT Minted Successfully!
            </h2>
            <div className="grid md:grid-cols-2 gap-4 text-gray-700">
              <div>
                <p className="font-semibold">Project Developer Tokens (90%):</p>
                <p className="font-mono text-sm break-all">
                  {mintMessage.ngoWallet}
                </p>
                <p className="text-lg font-bold text-green-700 mt-1">
                  {mintMessage.developerAmount} CCT
                </p>
              </div>
              <div>
                <p className="font-semibold">Buffer Pool Tokens (10%):</p>
                <p className="font-mono text-sm break-all">
                  {mintMessage.bufferWallet}
                </p>
                <p className="text-lg font-bold text-green-700 mt-1">
                  {mintMessage.bufferAmount} CCT
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4 italic">
              This message will disappear in a moment.
            </p>
          </div>
        )}

        {/* Main Content Area: Requests */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Pending Mint Requests
          </h2>

          {requests.length === 0 && verifierAddress && !loading && (
            <div className="bg-white p-6 rounded-xl shadow border border-gray-200 text-center text-gray-500 text-lg">
              <p>
                No new mint requests are currently pending for your account. ✨
              </p>
            </div>
          )}

          {!verifierAddress && !loading && (
            <div className="bg-white p-6 rounded-xl shadow border border-gray-200 text-center text-gray-500 text-lg">
              <p>
                Please connect your wallet to view pending requests assigned to
                you.
              </p>
            </div>
          )}

          {requests.map((req) => {
            const approvals = req.approvals || {};
            const normalizedApprovals = {};
            Object.keys(approvals).forEach((key) => {
              normalizedApprovals[key.toLowerCase()] = approvals[key];
            });
            const totalVerifiers = req.projectId.verifiers.length;
            const approvedCount = Object.values(normalizedApprovals).filter(
              (v) => v
            ).length;
            const isAssigned = req.projectId.verifiers
              .map((v) => v.toLowerCase())
              .includes(verifierAddress);

            let statusColor = "text-gray-600";
            let bgColor = "bg-white";
            let borderColor = "border-gray-200";
            if (req.status === "Executed") {
              statusColor = "text-green-600";
              bgColor = "bg-green-50";
              borderColor = "border-green-400";
            } else if (req.status === "PartiallyApproved") {
              statusColor = "text-yellow-600";
            }

            return (
              <div
                key={req._id}
                className={`border rounded-lg p-6 shadow-md transition-shadow duration-300 hover:shadow-lg ${bgColor} ${borderColor}`}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-gray-100">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-800">
                      {req.projectId.projectName}
                    </h3>
                    <p className="text-sm text-gray-600 italic mt-1">
                      {req.projectId.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-start md:items-end">
                    <span className={`font-bold text-lg ${statusColor}`}>
                      {req.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {approvedCount}/{totalVerifiers} Verifiers Approved
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-sm text-gray-700 mb-4">
                  <p>
                    <strong>Ecosystem Type:</strong>{" "}
                    {req.projectId.ecosystemType}
                  </p>
                  <p>
                    <strong>Saplings Planted:</strong> {req.projectId.saplings}
                  </p>
                  <p>
                    <strong>Location:</strong> {req.projectId.location?.[0]},{" "}
                    {req.projectId.location?.[1]}
                  </p>
                  <p>
                    <strong>Survival Rate:</strong> {req.projectId.survivalRate}
                    %
                  </p>
                  <p>
                    <strong>Project Duration:</strong>{" "}
                    {req.projectId.projectYears} years
                  </p>
                  <p>
                    <strong>Area:</strong> {req.projectId.area} hectares
                  </p>
                  <p>
                    <strong>Credits Requested:</strong>{" "}
                    <span className="font-bold text-blue-700">
                      {req.amount} CCT
                    </span>
                  </p>
                  {req.projectId.cid && (
                    <a
                      href={`https://ipfs.io/ipfs/${req.projectId.cid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline font-medium mt-2 md:mt-0 inline-flex items-center"
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
                  )}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t border-gray-100">
                  <div className="flex items-center flex-wrap gap-2 text-sm text-gray-600 mb-4 md:mb-0">
                    <p className="font-semibold text-gray-800">Verifiers:</p>
                    {req.projectId.verifiers.map((v) => {
                      const isApproved = normalizedApprovals[v.toLowerCase()];
                      return (
                        <span
                          key={v}
                          className={`px-2 py-1 rounded-full text-xs font-mono transition-colors duration-200 ${
                            isApproved
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {isApproved ? "Approved ✅" : "Pending ❌"}
                        </span>
                      );
                    })}
                  </div>
                  {req.status !== "Executed" && isAssigned && (
                    <button
                      disabled={
                        loading ||
                        normalizedApprovals[verifierAddress.toLowerCase()]
                      }
                      onClick={() => handleApprove(req.requestId)}
                      className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
                        normalizedApprovals[verifierAddress.toLowerCase()]
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                    >
                      {normalizedApprovals[verifierAddress.toLowerCase()]
                        ? "Already Approved"
                        : loading
                        ? "Approving..."
                        : "Approve Request"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VerifierDashboard;
