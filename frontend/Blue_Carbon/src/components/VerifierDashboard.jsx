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
      const tokenContract = new ethers.Contract(tokenAddress, tokenJson.abi, signer);
      const tx = await tokenContract.approveMint(BigInt(requestId));
      const receipt = await tx.wait();
      console.log("On-chain approval:", receipt);

      const res = await approveMintRequest(requestId, verifierAddress, tx.hash);
      if (!res.data.success) return alert(`❌ ${res.data.error}`);

      const updatedRequest = res.data.mintRequest;
      updatedRequest.approvals = updatedRequest.approvals || {};
      setRequests((prev) =>
        prev.map((r) => (r.requestId === requestId ? { ...r, ...updatedRequest } : r))
      );

      const approvedCount = Object.values(updatedRequest.approvals).filter((v) => v === true).length;

      if (updatedRequest.status === "Executed") {
        alert(
          `✅ CCT minted!\nNGO Wallet: ${updatedRequest.ngoWallet}\nBuffer Wallet: ${updatedRequest.bufferWallet}`
        );
        window.open(`https://sepolia.etherscan.io/address/${updatedRequest.ngoWallet}`, "_blank");
      } else {
        alert(`✅ Approval recorded! (${approvedCount} approvals)`);
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
    return () => window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
  }, []);

  useEffect(() => {
    if (verifierAddress) {
      fetchPendingRequests(verifierAddress);
      const interval = setInterval(() => fetchPendingRequests(verifierAddress), 10000);
      return () => clearInterval(interval);
    }
  }, [verifierAddress]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-800 mb-6">Verifier Dashboard</h1>
        <div className="bg-white p-4 rounded shadow mb-6">
          <button
            onClick={handleConnectWallet}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {verifierAddress ? "Wallet Connected" : "Connect Wallet"}
          </button>
          {verifierAddress && <p className="mt-2 text-sm text-gray-700">Connected as: {verifierAddress}</p>}
        </div>

        {requests.length === 0 && <p>No pending requests assigned to you.</p>}

        <div className="space-y-4">
          {requests.map((req) => {
            const approvals = req.approvals || {};
            const normalizedApprovals = {};
            Object.keys(approvals).forEach((key) => {
              normalizedApprovals[key.toLowerCase()] = approvals[key];
            });
            const totalVerifiers = req.projectId.verifiers.length;
            const approvedCount = Object.values(normalizedApprovals).filter((v) => v === true).length;
            const isAssigned = req.projectId.verifiers.map((v) => v.toLowerCase()).includes(verifierAddress);

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
                className={`border rounded p-4 ${bgColor} flex flex-col md:flex-row justify-between items-start md:items-center gap-2`}
              >
                <div>
                  <h3 className="font-semibold text-lg">{req.projectId.projectName}</h3>
                  <p className="text-sm text-gray-700">{req.projectId.description}</p>
                  <p><strong>Ecosystem:</strong> {req.projectId.ecosystemType}</p>
                  <p><strong>Credits Requested:</strong> {req.amount}</p>
                  <p><strong>Status:</strong> <span className={statusColor}>{req.status}</span></p>
                  <p><strong>Approvals:</strong> {approvedCount}/{totalVerifiers} approved</p>
                  <p className="text-sm text-gray-600">
                    {req.projectId.verifiers
                      .map((v) =>
                        normalizedApprovals[v.toLowerCase()] ? `${v} ✅` : `${v} ❌`
                      )
                      .join(" | ")}
                  </p>

                  {req.status === "Executed" && req.mintedToNGO && (
                    <>
                      <p className="mt-2 text-green-700 font-semibold">
                        ✅ Credits minted to NGO wallet:{" "}
                        <a
                          href={`https://sepolia.etherscan.io/address/${req.ngoWallet}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-blue-600 font-mono"
                        >
                          {req.ngoWallet}
                        </a>
                      </p>
                      <p className="mt-1 text-yellow-700 font-semibold">
                        10% in buffer wallet:{" "}
                        <a
                          href={`https://sepolia.etherscan.io/address/${req.bufferWallet}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-blue-600 font-mono"
                        >
                          {req.bufferWallet}
                        </a>
                      </p>
                    </>
                  )}
                </div>

                {req.status !== "Executed" && isAssigned && (
                  <button
                    disabled={loading}
                    onClick={() => handleApprove(req.requestId)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
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
