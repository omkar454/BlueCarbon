// src/components/NGOForm.jsx
import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import { ethers } from "ethers";
import tokenJson from "../../Contracts/CarbonCreditToken.json";
import { createMintRequest } from "../api/mintApi";

// Fix Leaflet markers (keeps original behavior)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

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
  const [saplings, setSaplings] = useState("");
  const [survivalRate, setSurvivalRate] = useState("");
  const [years, setYears] = useState("");
  const [areaHa, setAreaHa] = useState("");

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setLocation(e.latlng);
      },
    });
    return location ? <Marker position={location} /> : null;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

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
        setProjects(res.data.projects);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  const fetchBuyRequests = async (wallet) => {
    if (!wallet) return;
    try {
      const res = await axios.get(
        `http://localhost:5000/api/company/pendingBuyRequests/${wallet}`
      );
      if (res.data.success) {
        setBuyRequests(res.data.requests);
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

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    if (!file || !projectName || !location || !ngoWallet) {
      return alert(
        "Fill all required fields, upload evidence, and provide a location marker."
      );
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectName", projectName);
      formData.append("description", description);
      formData.append("ecosystemType", ecosystem);
      formData.append("saplings", saplings);
      formData.append("survivalRate", survivalRate);
      formData.append("projectYears", years);
      formData.append("area", areaHa);

      if (location) {
        formData.append(
          "location",
          JSON.stringify([location.lat, location.lng])
        );
      }

      formData.append("ngoWalletAddress", ngoWallet);

      const res = await axios.post(
        "http://localhost:5000/api/pinata/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (res.data.success) {
        alert("✅ Project uploaded successfully!");
        fetchProjects(ngoWallet);
        // reset form
        setProjectName("");
        setDescription("");
        setEcosystem("Mangroves");
        setFile(null);
        setLocation(null);
        setAreaHa("");
        setSaplings("");
        setSurvivalRate("");
        setYears("");
        const el = document.getElementById("fileInput");
        if (el) el.value = null;
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
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6 text-center">
          <span className="text-blue-600">Project Developer</span> Dashboard
        </h1>
        <p className="text-center text-gray-600 mb-10">
          Submit new projects, manage your portfolio, and approve carbon credit
          requests.
        </p>

        {/* Connect Wallet Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-200">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <button
              onClick={handleConnectWallet}
              className={`px-6 py-3 rounded-lg font-bold text-white transition duration-300 ${
                ngoWallet
                  ? "bg-green-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              disabled={!!ngoWallet}
            >
              {ngoWallet
                ? "Wallet Connected"
                : "Connect Project Developer Wallet"}
            </button>
            {ngoWallet && (
              <div className="mt-4 md:mt-0 text-right text-sm text-gray-700">
                <p className="truncate">
                  <span className="font-semibold">Connected wallet:</span>{" "}
                  {ngoWallet}
                </p>
                <p>
                  <span className="font-semibold">Pending buy requests:</span>{" "}
                  {buyRequests.length}
                </p>
                <p>
                  <span className="font-semibold">Submitted projects:</span>{" "}
                  {projects.length}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Buy Requests Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Pending Buy Requests
          </h2>
          {buyRequests.length === 0 ? (
            <p className="text-gray-500">No pending buy requests.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {buyRequests.map((req) => (
                <div
                  key={req._id}
                  className="p-4 border border-gray-200 rounded-lg flex flex-col justify-between bg-gray-50"
                >
                  <div className="text-sm text-gray-700 mb-4">
                    <p className="mb-1">
                      <strong>Company:</strong> {req.companyName}
                    </p>
                    <p className="mb-1">
                      <strong>Project:</strong> {req.projectName}
                    </p>
                    <p>
                      <strong>Amount:</strong>{" "}
                      <span className="font-bold text-blue-600">
                        {req.amount} CCT
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleApproveBuy(req)}
                    disabled={processingBuy || !ngoWallet}
                    className={`w-full px-6 py-2 rounded-md font-semibold text-white transition duration-300 ${
                      processingBuy || !ngoWallet
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {processingBuy ? "Processing..." : "Approve & Transfer"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Project Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Submit a New Project
          </h2>
          <form onSubmit={handleSubmitProject} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ecosystem Type
                </label>
                <select
                  value={ecosystem}
                  onChange={(e) => setEcosystem(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Mangroves</option>
                  <option>Seagrass</option>
                  <option>Coastal Forest</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Saplings
                </label>
                <input
                  type="number"
                  value={saplings}
                  onChange={(e) => setSaplings(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Survival Rate (%)
                </label>
                <input
                  type="number"
                  value={survivalRate}
                  onChange={(e) => setSurvivalRate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Years
                </label>
                <input
                  type="number"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area (Ha) *
                </label>
                <input
                  type="number"
                  value={areaHa}
                  onChange={(e) => setAreaHa(e.target.value)}
                  placeholder="e.g., 50.75"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Map Location
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Click on the map to place a single marker for the project's main
                location.
              </p>
              <MapContainer
                center={[20.5937, 78.9629]}
                zoom={5}
                className="rounded-lg shadow-inner border border-gray-300"
                style={{ height: "300px", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                <LocationMarker />
              </MapContainer>
              {location && (
                <p className="mt-4 text-blue-700 font-semibold text-center">
                  📍 Location: Latitude {location.lat.toFixed(4)}, Longitude{" "}
                  {location.lng.toFixed(4)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Evidence (photo/video) *
              </label>
              <input
                type="file"
                id="fileInput"
                onChange={handleFileChange}
                className="w-full block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
            </div>
            <button
              type="submit"
              disabled={uploading || !ngoWallet}
              className={`w-full px-4 py-3 rounded-lg font-bold text-white transition duration-300 ${
                uploading || !ngoWallet
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {uploading ? "Uploading..." : "Submit Project for Verification"}
            </button>
          </form>
        </div>

        {/* Your Projects Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Your Projects
          </h2>
          {projects.length === 0 ? (
            <p className="text-gray-500">
              You haven't submitted any projects yet.
            </p>
          ) : (
            <div className="space-y-6">
              {projects.map((proj) => (
                <div
                  key={proj._id}
                  className="p-6 bg-gray-50 rounded-xl border border-gray-200"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {proj.projectName}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-sm text-gray-700">
                    <p>
                      <strong>Ecosystem:</strong> {proj.ecosystemType}
                    </p>
                    <p>
                      <strong>Area:</strong> {proj.area} ha
                    </p>
                    <p>
                      <strong>Saplings:</strong> {proj.saplings || "N/A"}
                    </p>
                    <p>
                      <strong>Survival Rate:</strong>{" "}
                      {proj.survivalRate ? `${proj.survivalRate}%` : "N/A"}
                    </p>
                    <p>
                      <strong>Project Years:</strong>{" "}
                      {proj.projectYears || "N/A"}
                    </p>
                    <p>
                      <strong>Location:</strong>{" "}
                      {proj.location
                        ? `${proj.location[0].toFixed(
                            4
                          )}, ${proj.location[1].toFixed(4)}`
                        : "N/A"}
                    </p>
                    {proj.cid && (
                      <p className="col-span-1 md:col-span-2">
                        <strong>Evidence:</strong>{" "}
                        <a
                          href={`https://gateway.pinata.cloud/ipfs/${proj.cid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          View on IPFS
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between">
                    <p className="text-sm font-bold">
                      Status:{" "}
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
                    {proj.status === "Approved" ? (
                      <button
                        onClick={() => handleMintRequest(proj)}
                        className="mt-2 md:mt-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition duration-300"
                      >
                        Request Carbon Credits Mint
                      </button>
                    ) : (
                      <p className="mt-2 md:mt-0 text-gray-500 text-sm italic">
                        Awaiting approval from the NCCR.
                      </p>
                    )}
                  </div>

                  {proj.mintRequests?.length > 0 && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        Mint Requests
                      </h3>
                      <div className="space-y-3">
                        {proj.mintRequests.map((req) => {
                          const totalAmount = Number(req.amount);
                          const developerAmount = Math.floor(totalAmount * 0.9);
                          const bufferAmount = totalAmount - developerAmount;
                          return (
                            <div
                              key={req._id}
                              className={`p-3 rounded-lg ${
                                req.status === "Executed"
                                  ? "bg-green-100 border border-green-400"
                                  : "bg-yellow-100 border border-yellow-400"
                              }`}
                            >
                              <p className="font-medium text-gray-800">
                                Amount Requested:{" "}
                                <span className="font-bold">
                                  {req.amount} CCT
                                </span>
                              </p>
                              <p className="text-sm text-gray-700">
                                Status:{" "}
                                <span
                                  className={`font-bold ${
                                    req.status === "Executed"
                                      ? "text-green-600"
                                      : "text-yellow-600"
                                  }`}
                                >
                                  {req.status}
                                </span>
                              </p>
                              {req.status === "Executed" ? (
                                <div className="mt-2 text-xs text-green-800">
                                  <p className="font-semibold">
                                    ✅ Credits minted and distributed to
                                    wallets.
                                  </p>
                                  <p>
                                    <span className="font-semibold">
                                      Project Developer Wallet:
                                    </span>{" "}
                                    <span className="font-mono">
                                      {req.ngoWallet}
                                    </span>{" "}
                                    | Amount Credited:{" "}
                                    <strong>{developerAmount} CCT</strong>
                                  </p>
                                  <p>
                                    <span className="font-semibold">
                                      Buffer Wallet:
                                    </span>{" "}
                                    <span className="font-mono">
                                      {req.bufferWallet}
                                    </span>{" "}
                                    | Amount Credited:{" "}
                                    <strong>{bufferAmount} CCT</strong>
                                  </p>
                                </div>
                              ) : (
                                <div className="mt-2 text-xs text-yellow-800">
                                  <p>⏳ Awaiting verifier approvals...</p>
                                  <div className="mt-1">
                                    <div className="text-sm font-semibold">
                                      Verifier Approvals:
                                    </div>
                                    <div className="flex flex-wrap text-sm">
                                      {proj.verifiers?.map((v) => (
                                        <div key={v} className="mr-3">
                                          {req.approvals?.[v] ? (
                                            <span className="text-green-600">
                                              ✅
                                            </span>
                                          ) : (
                                            <span className="text-red-600">
                                              ❌
                                            </span>
                                          )}{" "}
                                          <span className="font-mono text-gray-700">
                                            {v.substring(0, 6)}...
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NGOForm;
