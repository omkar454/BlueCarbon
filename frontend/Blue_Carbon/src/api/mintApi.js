// src/api/mintApi.js
import axios from "axios";

const BASE_URL = "http://localhost:5000/api/mintRequests";

export const createMintRequest = (projectId, ngoAddress, amount) =>
  axios.post(`${BASE_URL}/create-request`, { projectId, ngoAddress, amount });

export const approveMintRequest = (requestId, verifierAddress, txHash) =>
  axios.post(`${BASE_URL}/approveByVerifier`, {
    requestId,
    verifierAddress,
    txHash,
  });

export const getMintRequestStatus = (requestId) =>
  axios.get(`${BASE_URL}/status/${requestId}`);

export const getProjectMintRequests = (projectId) =>
  axios.get(`${BASE_URL}/project/${projectId}`);

export const getPendingMintRequests = (verifierAddress) =>
  axios.get(`${BASE_URL}/pending/${verifierAddress}`);
