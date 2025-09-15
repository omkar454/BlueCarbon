// src/components/NGOForm.jsx
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import { ethers } from "ethers";
import tokenJson from "../../Contracts/CarbonCreditToken.json";
import { createMintRequest } from "../api/mintApi";

// Fix Leaflet markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Your deployed token address
const TOKEN_ADDRESS = "0x07b4E818447DF5Ef5724C5c0d20C568e0aF461E2";

const NGOForm = () => {
  const [ngoWallet, setNgoWallet] = useState("");
  const [signer, setSigner] = useState(null);
  const [projects, setProjects] = useState([]);
  const [buyRequests, setBuyRequests] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [ecosystem, setEcosystem] = useState("Mangroves");
  const [file, setFile] = useState(null);
  const [location, setLocation] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processingBuy, setProcessingBuy] = useState(false);

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setLocation(e.latlng);
      },
    });
    return location ? <Marker position={location}></Marker> : null;
  };

  const handleFileChange = (e) => setFile(e.target.files[0]);

  // ====== MetaMask connection (matches VerifierDashboard pattern) ======
  const handleConnectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask!");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = (await signer.getAddress()).toLowerCase();
      setSigner(signer);
      setNgoWallet(address);
      await fetchProjects(address);
      await fetchBuyRequests(address);
      alert(`✅ Connected Project Developer wallet: ${address}`);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      alert("Wallet connection failed");
    }
  };

  const fetchProjects = async (wallet) => {
    if (!wallet) return;
    try {
      const res = await axios.get(
        `http://localhost:5000/api/projects/byNgo/${wallet}`
      );
      if (res.data.success) {
        console.log("Fetched projects:", res.data.projects);
        setProjects(res.data.projects);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  const fetchBuyRequests = async (wallet) => {
    if (!wallet) return;
    try {
      console.log("Fetching buy requests for wallet:", wallet);
      const res = await axios.get(
        `http://localhost:5000/api/company/pendingBuyRequests/${wallet}`
      );
      console.log("Buy requests response:", res.data);
      if (res.data.success) {
        setBuyRequests(res.data.requests);
        console.log("Set buy requests:", res.data.requests);
      }
    } catch (err) {
      console.error("Error fetching buy requests:", err);
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = async (accounts) => {
      if (accounts.length > 0) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = accounts[0].toLowerCase();
        setSigner(signer);
        setNgoWallet(address);
        fetchProjects(address);
        fetchBuyRequests(address);
        alert(`Switched to Project Developer wallet: ${address}`);
      } else {
        setSigner(null);
        setNgoWallet("");
        setProjects([]);
        setBuyRequests([]);
      }
    };
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () =>
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
  }, []);

  // ===== Submit Project =====
  const handleSubmitProject = async (e) => {
    e.preventDefault();
    if (!file || !projectName || !location || !ngoWallet) {
      return alert("Fill all required fields and select location on map");
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectName", projectName);
      formData.append("description", description);
      formData.append("ecosystemType", ecosystem);
      formData.append("location", JSON.stringify([location.lat, location.lng]));
      formData.append("ngoWalletAddress", ngoWallet);

      const res = await axios.post(
        "http://localhost:5000/api/pinata/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (res.data.success) {
        alert("Project uploaded!");
        fetchProjects(ngoWallet);
        setProjectName("");
        setDescription("");
        setEcosystem("Mangroves");
        setFile(null);
        setLocation(null);
        document.getElementById("fileInput").value = null;
      } else {
        alert("Upload failed: " + res.data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading project");
    } finally {
      setUploading(false);
    }
  };

  // ===== Mint Request =====
  const handleMintRequest = async (project) => {
    try {
      if (!signer) return alert("Connect wallet first");
      const amount = prompt("Enter number of carbon credits to mint:");
      if (!amount) return;
      const res = await createMintRequest(project._id, ngoWallet, amount);
      if (!res.data.success) return alert("Failed to create mint request");
      alert(`Mint request created! ID: ${res.data.requestId}`);
      fetchProjects(ngoWallet);
    } catch (err) {
      console.error(err);
      alert("Error creating mint request");
    }
  };

  // ===== Approve Buy Requests =====
  const handleApproveBuy = async (req) => {
    if (!signer) return alert("Connect wallet first!");
    try {
      setProcessingBuy(true);
      const tokenContract = new ethers.Contract(
        TOKEN_ADDRESS,
        tokenJson.abi,
        signer
      );
      const tx = await tokenContract.transfer(
        req.companyWallet,
        ethers.parseUnits(req.amount.toString(), 18)
      );
      await tx.wait();
      await axios.post(`http://localhost:5000/api/company/approveBuy`, {
        requestId: req._id,
        txHash: tx.hash,
      });
      alert(`✅ CCT transferred to company: ${req.companyName}`);
      fetchBuyRequests(ngoWallet);
    } catch (err) {
      console.error(err);
      alert("Error approving buy: " + (err?.reason || err?.message || err));
    } finally {
      setProcessingBuy(false);
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
                <span className="text-blue-600">Project Developer</span>{" "}
                Dashboard
              </h1>
              <p className="text-gray-600">
                Manage blue carbon projects and approve carbon credit requests
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Connect Wallet */}
        <div className="mb-6">
          <button
            onClick={handleConnectWallet}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {ngoWallet
              ? "Wallet Connected"
              : "Connect Project Developer Wallet"}
          </button>
          {ngoWallet && (
            <div className="mt-2 text-sm text-gray-700">
              <p>Connected wallet: {ngoWallet}</p>
              <p>Buy requests count: {buyRequests.length}</p>
              <p>Projects count: {projects.length}</p>
              <div className="mt-2 space-x-2">
                <button
                  onClick={async () => {
                    try {
                      const res = await axios.get(
                        `http://localhost:5000/api/company/debug/buyRequests`
                      );
                      console.log("Debug buy requests:", res.data);
                      alert(`Total buy requests: ${res.data.totalRequests}`);
                    } catch (err) {
                      console.error("Debug error:", err);
                    }
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
                >
                  Debug Buy Requests
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await axios.get(
                        `http://localhost:5000/api/company/debug/projects`
                      );
                      console.log("Debug projects:", res.data);
                      alert(`Total projects: ${res.data.totalProjects}`);
                    } catch (err) {
                      console.error("Debug error:", err);
                    }
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
                >
                  Debug Projects
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pending Buy Requests */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Pending Buy Requests</h2>
          {buyRequests.length === 0 ? (
            <p className="text-gray-600">No pending buy requests.</p>
          ) : (
            buyRequests.map((req) => (
              <div
                key={req._id}
                className="p-3 border rounded mb-2 flex justify-between items-center"
              >
                <div>
                  <p>
                    <strong>Company:</strong> {req.companyName}
                  </p>
                  <p>
                    <strong>Project:</strong> {req.projectName}
                  </p>
                  <p>
                    <strong>Amount:</strong> {req.amount} CCT
                  </p>
                </div>
                <button
                  onClick={() => handleApproveBuy(req)}
                  disabled={processingBuy}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  {processingBuy ? "Processing..." : "Approve & Transfer"}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Project Submission Form */}
        <form onSubmit={handleSubmitProject} className="space-y-4">
          <div>
            <label className="block font-semibold text-gray-700">
              Project Name *
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full border rounded p-2 mt-1"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded p-2 mt-1"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700">
              Ecosystem Type
            </label>
            <select
              value={ecosystem}
              onChange={(e) => setEcosystem(e.target.value)}
              className="w-full border rounded p-2 mt-1"
            >
              <option>Mangroves</option>
              <option>Seagrass</option>
              <option>Coastal Forest</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700">
              Project Location *
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Click on the map to set the project location.
            </p>
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              style={{ height: "300px", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationMarker />
            </MapContainer>
          </div>

          <div>
            <label className="block font-semibold text-gray-700">
              Upload Evidence (photo/video) *
            </label>
            <input
              type="file"
              id="fileInput"
              onChange={handleFileChange}
              className="w-full mt-1"
              required
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded mt-2"
          >
            {uploading ? "Uploading..." : "Submit Project"}
          </button>
        </form>

        {/* Show Projects */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3">Your Projects</h2>
          {projects.length === 0 && (
            <p className="text-gray-600">No projects submitted yet.</p>
          )}
          {projects.map((proj) => (
            <div
              key={proj._id}
              className="mt-4 p-4 bg-gray-50 rounded border border-gray-200"
            >
              <p>
                <strong>Name:</strong> {proj.projectName}
              </p>
              <p>
                <strong>Description:</strong> {proj.description}
              </p>
              <p>
                <strong>Ecosystem:</strong> {proj.ecosystemType}
              </p>
              <p>
                <strong>Location:</strong> [
                {proj.location?.join(", ") || "Not set"}]
              </p>
              <p>
                <strong>IPFS Hash:</strong> {proj.cid || "Not uploaded"}
              </p>
              <p>
                <strong>IPFS Link:</strong>{" "}
                {proj.cid ? (
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${proj.cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    View File
                  </a>
                ) : (
                  "Not available"
                )}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={
                    proj.status === "Approved"
                      ? "text-green-600"
                      : "text-yellow-600"
                  }
                >
                  {proj.status}
                </span>
              </p>

              {proj.status === "Approved" && (
                <div className="mt-2">
                  <button
                    onClick={() => handleMintRequest(proj)}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded"
                  >
                    Request Carbon Credits Mint
                  </button>
                </div>
              )}

              {proj.status === "Pending" && (
                <p className="text-gray-600 mt-2">
                  Awaiting approval from NCCR.
                </p>
              )}

              {proj.mintRequests?.length > 0 && (
                <div className="mt-3">
                  <h3 className="font-semibold text-gray-700">
                    Mint Requests:
                  </h3>
                  <ul className="list-disc ml-6">
                    {proj.mintRequests.map((req) => {
                      const totalAmount = Number(req.amount);
                      const developerAmount = Math.floor(totalAmount * 0.9);
                      const bufferAmount = totalAmount - developerAmount;

                      return (
                        <li key={req._id} className="text-gray-700 mb-2">
                          <span className="font-medium">Amount Requested:</span>{" "}
                          {req.amount} CCT |{" "}
                          <span className="font-medium">Status:</span>{" "}
                          {req.status}
                          <div className="mt-1">
                            {req.status === "Executed" ? (
                              <div className="bg-green-50 border border-green-400 text-green-800 px-4 py-3 rounded shadow">
                                <p className="font-semibold">
                                  ✅ Verifiers approved the CCT request
                                </p>
                                <p>
                                  Project Developer Wallet:{" "}
                                  <span className="font-mono">
                                    {req.ngoWallet}
                                  </span>{" "}
                                  | Amount Credited:{" "}
                                  <strong>{developerAmount} CCT</strong>
                                </p>
                                <p>
                                  Buffer Wallet:{" "}
                                  <span className="font-mono">
                                    {req.bufferWallet}
                                  </span>{" "}
                                  | Amount Credited:{" "}
                                  <strong>{bufferAmount} CCT</strong>
                                </p>
                              </div>
                            ) : (
                              <div>
                                <div>Verifier Approvals:</div>
                                <div>
                                  {proj.verifiers
                                    ?.map((v) =>
                                      req.approvals?.[v] ? `${v} ✅` : `${v} ❌`
                                    )
                                    .join(" | ")}
                                </div>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NGOForm;
