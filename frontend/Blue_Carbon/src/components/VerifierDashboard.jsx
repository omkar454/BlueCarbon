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

  // State for minted info message
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

      // If status is executed, show professional pop-up message
      if (updatedRequest.status === "Executed") {
        const totalAmount = Number(updatedRequest.amount);
        const developerAmount = Math.floor(totalAmount * 0.9); // 90% for project developer
        const bufferAmount = totalAmount - developerAmount; // 10% for buffer

        setMintMessage({
          ngoWallet: updatedRequest.ngoWallet,
          bufferWallet: updatedRequest.bufferWallet,
          developerAmount,
          bufferAmount,
        });

        // Optional alert
        alert(
          `✅ CCT Minted Successfully!\nProject Developer Wallet: ${updatedRequest.ngoWallet}\nBuffer Wallet: ${updatedRequest.bufferWallet}`
        );

        // Hide message automatically after 20 seconds
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
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-800 mb-6">
          Verifier Dashboard
        </h1>

        {/* Wallet Connection */}
        <div className="bg-white p-4 rounded shadow mb-6 flex justify-between items-center">
          <button
            onClick={handleConnectWallet}
            className={`px-4 py-2 rounded text-white ${
              verifierAddress ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {verifierAddress ? "Wallet Connected" : "Connect Wallet"}
          </button>
          {verifierAddress && (
            <p className="text-sm text-gray-700">
              Connected as: {verifierAddress}
            </p>
          )}
        </div>

        {/* Minted CCT message */}
        {mintMessage && (
          <div className="bg-green-100 border border-green-400 p-4 rounded mb-6 shadow-md">
            <h2 className="text-green-800 font-semibold text-lg mb-2">
              ✅ CCT Minted Successfully!
            </h2>
            <p>
              Project Developer Wallet:{" "}
              <span className="font-mono">{mintMessage.ngoWallet}</span>
            </p>
            <p>
              Amount Credited:{" "}
              <strong>{mintMessage.developerAmount} CCT</strong>
            </p>
            <p>
              Buffer Wallet:{" "}
              <span className="font-mono">{mintMessage.bufferWallet}</span>
            </p>
            <p>
              Amount Credited: <strong>{mintMessage.bufferAmount} CCT</strong>
            </p>
            <p className="text-sm text-gray-700 mt-1">
              This message will disappear automatically.
            </p>
          </div>
        )}

        {requests.length === 0 && (
          <p className="text-gray-600">No pending requests assigned to you.</p>
        )}

        <div className="space-y-4">
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
            if (req.status === "Executed") {
              statusColor = "text-green-600";
              bgColor = "bg-green-50 border-green-400 border";
            } else if (req.status === "PartiallyApproved") {
              statusColor = "text-yellow-600";
            }

            return (
              <div
                key={req._id}
                className={`border rounded p-4 ${bgColor} flex flex-col md:flex-row justify-between gap-4`}
              >
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-lg">
                    {req.projectId.projectName}
                  </h3>
                  <p className="text-sm text-gray-700">
                    {req.projectId.description}
                  </p>
                  <p>
                    <strong>Ecosystem:</strong> {req.projectId.ecosystemType}
                  </p>
                  <p>
                    <strong>Credits Requested:</strong> {req.amount}
                  </p>
                  {req.projectId.cid && (
                    <a
                      href={`https://ipfs.io/ipfs/${req.projectId.cid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View Evidence
                    </a>
                  )}
                  <p>
                    <strong>Status:</strong>{" "}
                    <span className={statusColor}>{req.status}</span>
                  </p>
                  <p>
                    <strong>Approvals:</strong> {approvedCount}/{totalVerifiers}{" "}
                    approved
                  </p>
                  <p className="text-sm text-gray-600">
                    {req.projectId.verifiers
                      .map((v) =>
                        normalizedApprovals[v.toLowerCase()]
                          ? `${v} ✅`
                          : `${v} ❌`
                      )
                      .join(" | ")}
                  </p>
                </div>

                {req.status !== "Executed" && isAssigned && (
                  <button
                    disabled={loading}
                    onClick={() => handleApprove(req.requestId)}
                    className="self-start md:self-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                  >
                    Approve
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VerifierDashboard;
