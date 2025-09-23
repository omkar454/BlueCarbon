// src/api/mintApi.js
import axios from "axios";

const BASE_URL = "http://localhost:5000/api/mintRequests";

/**
 * Create a mint request for a project.
 * Backend calculates eligible CCT automatically.
 * Returns: { success, requestId, eligibleCCT }
 */
export const createMintRequest = (projectId, ngoAddress) =>
  axios.post(`${BASE_URL}/create-request`, { projectId, ngoAddress });

/**
 * Approve a mint request as verifier
 */
export const approveMintRequest = (requestId, verifierAddress, txHash) =>
  axios.post(`${BASE_URL}/approveByVerifier`, {
    requestId,
    verifierAddress,
    txHash,
  });

/**
 * Get status of a mint request
 */
export const getMintRequestStatus = (requestId) =>
  axios.get(`${BASE_URL}/status/${requestId}`);

/**
 * Get all mint requests for a project
 */
export const getProjectMintRequests = (projectId) =>
  axios.get(`${BASE_URL}/project/${projectId}`);

/**
 * Get pending mint requests for a verifier
 */
export const getPendingMintRequests = (verifierAddress) =>
  axios.get(`${BASE_URL}/pending/${verifierAddress}`);
