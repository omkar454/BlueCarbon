// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Carbon Credit Token (CCT) with Multi-Verifier Minting
contract CarbonCreditToken is ERC20, Ownable {
    address public bufferPool;
    uint256 public approvalThreshold;

    struct MintRequest {
        address ngo;
        uint256 amount;
        uint256 approvals;
        bool executed;
        mapping(address => bool) approvedBy;
    }

    mapping(uint256 => MintRequest) public mintRequests;
    uint256 public requestCount;

    mapping(address => bool) public verifiers;

    event VerifierAdded(address verifier);
    event VerifierRemoved(address verifier);
    event MintRequested(uint256 requestId, address ngo, uint256 amount);
    event MintApproved(uint256 requestId, address verifier);
    event MintExecuted(uint256 requestId, address ngo, uint256 amount);

    constructor(address _bufferPool, uint256 _approvalThreshold)
        ERC20("CarbonCreditToken", "CCT")
        Ownable(msg.sender)
    {
        require(_bufferPool != address(0), "Buffer pool cannot be zero");
        require(_approvalThreshold > 0, "Threshold must be > 0");
        bufferPool = _bufferPool;
        approvalThreshold = _approvalThreshold;
    }

    // ----------- Verifier Management ----------- //
    function addVerifier(address verifier) external onlyOwner {
        require(!verifiers[verifier], "Already verifier");
        verifiers[verifier] = true;
        emit VerifierAdded(verifier);
    }

    function removeVerifier(address verifier) external onlyOwner {
        require(verifiers[verifier], "Not verifier");
        verifiers[verifier] = false;
        emit VerifierRemoved(verifier);
    }

    // ----------- Minting Workflow ----------- //
    function createMintRequest(address ngo, uint256 amount) external onlyOwner {
        require(ngo != address(0), "Invalid NGO address");
        require(amount > 0, "Amount must be > 0");

        requestCount++;
        MintRequest storage request = mintRequests[requestCount];
        request.ngo = ngo;
        request.amount = amount;

        emit MintRequested(requestCount, ngo, amount);
    }

    function approveMint(uint256 requestId) external {
        require(verifiers[msg.sender], "Not a verifier");
        MintRequest storage request = mintRequests[requestId];
        require(!request.executed, "Already executed");
        require(!request.approvedBy[msg.sender], "Already approved");

        request.approvedBy[msg.sender] = true;
        request.approvals++;

        emit MintApproved(requestId, msg.sender);

        if (request.approvals >= approvalThreshold) {
            _executeMint(requestId);
        }
    }

    function _executeMint(uint256 requestId) internal {
        MintRequest storage request = mintRequests[requestId];
        require(!request.executed, "Already executed");

        request.executed = true;

        uint256 ngoShare = (request.amount * 90) / 100;
        uint256 bufferShare = request.amount - ngoShare;

        _mint(request.ngo, ngoShare);
        _mint(bufferPool, bufferShare);

        emit MintExecuted(requestId, request.ngo, request.amount);
    }

    // ----------- Retirement ----------- //
    function retireCredits(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        _burn(msg.sender, amount);
    }
}
