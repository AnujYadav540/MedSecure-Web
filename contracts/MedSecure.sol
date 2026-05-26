// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MedSecure {
    // Structs
    struct Record {
        string ipfsHash;      // IPFS hash of the encrypted file
        string encryptedKey;  // Encrypted symmetric key
        uint256 timestamp;    // Upload timestamp
        bool exists;          // Record existence flag
    }

    struct AccessLog {
        address doctor;       // Doctor's address
        uint256 timestamp;    // Access timestamp
        string action;        // Action performed (e.g., "view", "diagnose")
    }

    // State variables
    mapping(address => bool) public doctors;                    // Registered doctors
    mapping(address => bool) public admins;                     // Platform admins
    mapping(bytes32 => Record) public records;                  // Record ID => Record
    mapping(bytes32 => AccessLog[]) public accessLogs;         // Record ID => Access logs
    mapping(bytes32 => mapping(address => bool)) public access; // Record ID => Doctor => Has access

    // Events
    event RecordAdded(bytes32 indexed recordId, address indexed patient, uint256 timestamp);
    event AccessGranted(bytes32 indexed recordId, address indexed patient, address indexed doctor);
    event AccessRevoked(bytes32 indexed recordId, address indexed patient, address indexed doctor);
    event RecordAccessed(bytes32 indexed recordId, address indexed doctor, string action);
    event DoctorRegistered(address indexed doctor);
    event AdminAdded(address indexed admin);

    // Modifiers
    modifier onlyDoctor() {
        require(doctors[msg.sender], "Only registered doctors can perform this action");
        _;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender], "Only admins can perform this action");
        _;
    }

    modifier recordExists(bytes32 recordId) {
        require(records[recordId].exists, "Record does not exist");
        _;
    }

    // Constructor
    constructor() {
        admins[msg.sender] = true;
        emit AdminAdded(msg.sender);
    }

    // Admin functions
    function addAdmin(address _admin) external onlyAdmin {
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }

    function registerDoctor(address _doctor) external onlyAdmin {
        doctors[_doctor] = true;
        emit DoctorRegistered(_doctor);
    }

    // Patient functions
    function addRecord(bytes32 recordId, string memory ipfsHash, string memory encryptedKey) external {
        require(!records[recordId].exists, "Record already exists");
        
        records[recordId] = Record({
            ipfsHash: ipfsHash,
            encryptedKey: encryptedKey,
            timestamp: block.timestamp,
            exists: true
        });

        emit RecordAdded(recordId, msg.sender, block.timestamp);
    }

    function grantAccess(bytes32 recordId, address doctor) external recordExists(recordId) {
        require(doctors[doctor], "Address is not a registered doctor");
        access[recordId][doctor] = true;
        emit AccessGranted(recordId, msg.sender, doctor);
    }

    function revokeAccess(bytes32 recordId, address doctor) external recordExists(recordId) {
        access[recordId][doctor] = false;
        emit AccessRevoked(recordId, msg.sender, doctor);
    }

    // Doctor functions
    function accessRecord(bytes32 recordId, string memory action) external onlyDoctor recordExists(recordId) {
        require(access[recordId][msg.sender], "Doctor does not have access to this record");
        
        accessLogs[recordId].push(AccessLog({
            doctor: msg.sender,
            timestamp: block.timestamp,
            action: action
        }));

        emit RecordAccessed(recordId, msg.sender, action);
    }

    // View functions
    function getRecord(bytes32 recordId) external view recordExists(recordId) returns (string memory, uint256) {
        require(access[recordId][msg.sender] || msg.sender == tx.origin, "Unauthorized access");
        return (records[recordId].ipfsHash, records[recordId].timestamp);
    }

    function getAccessLogs(bytes32 recordId) external view recordExists(recordId) returns (AccessLog[] memory) {
        require(access[recordId][msg.sender] || msg.sender == tx.origin, "Unauthorized access");
        return accessLogs[recordId];
    }

    function hasAccess(bytes32 recordId, address doctor) external view returns (bool) {
        return access[recordId][doctor];
    }

    function isDoctor(address account) external view returns (bool) {
        return doctors[account];
    }

    function isAdmin(address account) external view returns (bool) {
        return admins[account];
    }
} 