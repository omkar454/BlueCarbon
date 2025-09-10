// src/components/NGOForm.jsx
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import { createMintRequest } from "../api/mintApi";

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const NGOForm = () => {
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [ecosystem, setEcosystem] = useState("Mangroves");
  const [file, setFile] = useState(null);
  const [location, setLocation] = useState(null);
  const [ngoWallet, setNgoWallet] = useState("");
  const [uploading, setUploading] = useState(false);
  const [ipfsCid, setIpfsCid] = useState("");
  const [projects, setProjects] = useState([]);

  // Map click handler
  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setLocation(e.latlng);
      },
    });
    return location ? <Marker position={location}></Marker> : null;
  };

  const handleFileChange = (e) => setFile(e.target.files[0]);

  // Fetch projects by NGO wallet
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
      console.error("Error fetching NGO projects:", err);
    }
  };

  useEffect(() => {
    if (ngoWallet) fetchProjects(ngoWallet);
  }, [ngoWallet]);

  // Handle project submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !projectName || !location || !ngoWallet) {
      alert("Please fill all required fields and select location on the map.");
      return;
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
        setIpfsCid(res.data.cid);
        alert("Project uploaded successfully!");
        fetchProjects(ngoWallet);
        // Reset form
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

  // Handle mint request
const handleMintRequest = async (project) => {
  try {
    const amount = prompt("Enter number of carbon credits to mint:");
    if (!amount) return;
      alert("Mint request clicked for project:", project);

    // Only call create-request, no separate save
    const res = await createMintRequest(
      project._id,
      project.ngoWalletAddress,
      amount
    );

    if (!res.data.success) {
      alert("Failed to create mint request on blockchain");
      return;
    }

    alert(`Mint request created! ID: ${res.data.requestId}`);
    fetchProjects(ngoWallet); // refresh list
  } catch (err) {
    console.error(err);
    alert("Error creating mint request");
  }
};


  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-200 via-blue-100 to-green-50 p-6">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold text-blue-800 mb-4">
          NGO Project Dashboard
        </h1>

        {/* Project Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold text-gray-700">
              NGO Wallet Address *
            </label>
            <input
              type="text"
              value={ngoWallet}
              onChange={(e) => setNgoWallet(e.target.value)}
              className="w-full border rounded p-2 mt-1"
              required
            />
          </div>

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
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-700">
                    Mint Requests:
                  </h3>
                  <ul className="list-disc ml-6">
                    {proj.mintRequests.map((req) => (
                      <li key={req._id} className="text-gray-700">
                        <span className="font-medium">Amount:</span>{" "}
                        {req.amount} CCT |{" "}
                        <span className="font-medium">Status:</span>{" "}
                        {req.status} |{" "}
                        <span className="font-medium">Approvals:</span>{" "}
                        {proj.verifiers
                          ?.map((v) =>
                            req.approvals?.[v] ? `${v} ✅` : `${v} ❌`
                          )
                          .join(" | ")}
                      </li>
                    ))}
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
