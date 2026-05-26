const MedicalRecord = require('../models/MedicalRecord');
const User = require('../models/User');
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
let contract = null;
const { v4: uuidv4 } = require('uuid');
const { ipfsCircuitBreaker } = require('../utils/circuitBreaker');
const { notifyPatientOnAccess, notifySuspiciousActivity } = require('../utils/accessNotifications');
const { detectSuspiciousActivity } = require('../utils/sharingDetection');
const { exportAccessLogsPDF, exportAccessLogsCSV } = require('../utils/exportAccessLogs');

// Upload medical record
exports.uploadRecord = async (req, res) => {
  let tempFile = null;
  
  try {
    const { title, description, recordType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Store file path for cleanup
    tempFile = file.path;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ message: 'File size exceeds 10MB limit' });
    }

    // Check file type
    if (!file.mimetype.includes('pdf')) {
      return res.status(400).json({ message: 'Only PDF files are allowed' });
    }

    if (!file.path) {
      throw new Error('Uploaded file is missing a path.');
    }

    // Create form data for Pinata
    const formData = new FormData();
    formData.append('file', fs.createReadStream(file.path));

    // Upload to IPFS using Pinata with circuit breaker protection
    const pinataResponse = await ipfsCircuitBreaker.execute(async () => {
      return axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          maxBodyLength: 'Infinity',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
            'pinata_api_key': 'd3dfdbacd5131bdbb10b',
            'pinata_secret_api_key': '11f7384a1aa0b5f69b75a9042f77f93e7be42a38137abfae8364f4a0f3e36345'
          },
          timeout: 60000 // 60 second timeout
        }
      );
    });

    // Create medical record entry only after successful IPFS upload
    const medicalRecord = new MedicalRecord({
      title,
      description,
      recordType,
      ipfsHash: pinataResponse.data.IpfsHash,
      patient: req.user._id,
      recordId: uuidv4(),
      blockchainTxHash: 'mock-blockchain-tx-hash', // TODO: Replace with real tx hash
      encryptedKey: 'mock-encrypted-key' // TODO: Replace with real encrypted key
    });

    await medicalRecord.save();

    // Clean up temporary file
    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    res.status(201).json({
      message: 'Medical record uploaded successfully',
      record: medicalRecord
    });
  } catch (error) {
    console.error('Error uploading medical record:', error);
    
    // Clean up temporary file in case of error
    if (tempFile && fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (unlinkError) {
        console.error('Error deleting temporary file:', unlinkError);
      }
    }
    
    res.status(500).json({
      message: 'Error uploading medical record',
      error: error.message
    });
  }
};

// Grant access to doctor
exports.grantAccess = async (req, res) => {
  try {
    const { doctorId, recordId } = req.body;

    const record = await MedicalRecord.findOne({
      recordId,
      patient: req.user._id
    });

    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const doctor = await User.findOne({
      _id: doctorId,
      role: 'doctor',
      isVerified: true
    });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Grant access on blockchain (if available)
    if (contract && process.env.PRIVATE_KEY) {
      try {
        const account = web3.eth.accounts.privateKeyToAccount(
          process.env.PRIVATE_KEY
        );
        web3.eth.accounts.wallet.add(account);

        await contract.methods
          .grantAccess(recordId, doctor.walletAddress)
          .send({ from: account.address });
      } catch (error) {
        console.warn('Blockchain transaction failed:', error.message);
      }
    }

    // Update database
    record.accessGranted.push({
      doctor: doctorId,
      grantedAt: Date.now()
    });

    await record.save();

    res.json({ message: 'Access granted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Grant access to doctor by email
exports.grantAccessByEmail = async (req, res) => {
  try {
    const { doctorEmail, recordId } = req.body;

    const record = await MedicalRecord.findOne({
      recordId,
      patient: req.user._id
    });

    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const doctor = await User.findOne({
      email: doctorEmail,
      role: 'doctor'
    });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if access is already granted
    const alreadyGranted = record.accessGranted.some(
      access => access.doctor.toString() === doctor._id.toString()
    );

    if (alreadyGranted) {
      return res.status(400).json({ message: 'Access already granted to this doctor' });
    }

    // Grant access on blockchain (if available)
    if (contract && process.env.PRIVATE_KEY) {
      try {
        const account = web3.eth.accounts.privateKeyToAccount(
          process.env.PRIVATE_KEY
        );
        web3.eth.accounts.wallet.add(account);

        await contract.methods
          .grantAccess(recordId, doctor.walletAddress)
          .send({ from: account.address });
      } catch (error) {
        console.warn('Blockchain transaction failed:', error.message);
      }
    }

    // Update database
    record.accessGranted.push({
      doctor: doctor._id,
      grantedAt: Date.now()
    });

    await record.save();

    res.json({ message: 'Access granted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Revoke access from doctor by email
exports.revokeAccessByEmail = async (req, res) => {
  try {
    const { doctorEmail, recordId } = req.body;

    const record = await MedicalRecord.findOne({
      recordId,
      patient: req.user._id
    });

    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const doctor = await User.findOne({
      email: doctorEmail,
      role: 'doctor'
    });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if access is already granted
    const alreadyGranted = record.accessGranted.some(
      access => access.doctor.toString() === doctor._id.toString()
    );

    if (!alreadyGranted) {
      return res.status(400).json({ message: 'Access not granted to this doctor' });
    }

    // Revoke access on blockchain (if available)
    if (contract && process.env.PRIVATE_KEY) {
      try {
        const account = web3.eth.accounts.privateKeyToAccount(
          process.env.PRIVATE_KEY
        );
        web3.eth.accounts.wallet.add(account);

        await contract.methods
          .revokeAccess(recordId, doctor.walletAddress)
          .send({ from: account.address });
      } catch (error) {
        console.warn('Blockchain transaction failed:', error.message);
      }
    }

    // Update database
    record.accessGranted = record.accessGranted.filter(
      access => access.doctor.toString() !== doctor._id.toString()
    );

    await record.save();

    res.json({ message: 'Access revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Revoke access from doctor
exports.revokeAccess = async (req, res) => {
  try {
    const { doctorId, recordId } = req.body;

    const record = await MedicalRecord.findOne({
      recordId,
      patient: req.user._id
    });

    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const doctor = await User.findOne({
      _id: doctorId,
      role: 'doctor'
    });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Revoke access on blockchain (if available)
    if (contract && process.env.PRIVATE_KEY) {
      try {
        const account = web3.eth.accounts.privateKeyToAccount(
          process.env.PRIVATE_KEY
        );
        web3.eth.accounts.wallet.add(account);

        await contract.methods
          .revokeAccess(recordId, doctor.walletAddress)
          .send({ from: account.address });
      } catch (error) {
        console.warn('Blockchain transaction failed:', error.message);
      }
    }

    // Update database
    record.accessGranted = record.accessGranted.filter(
      access => access.doctor.toString() !== doctorId
    );

    await record.save();

    res.json({ message: 'Access revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get record by ID
exports.getRecord = async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await MedicalRecord.findOne({ recordId })
      .populate('patient', 'name email')
      .populate('accessGranted.doctor', 'name email');

    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // Check access permission
    let hasAccess = false;
    
    // Check if user is the patient (owner of the record)
    const isOwner = (record.patient._id ? record.patient._id.toString() : record.patient.toString()) === req.user._id.toString();
    
    if (isOwner) {
      hasAccess = true;
    } else {
      // Check if user is a doctor with granted access
      if (req.user.role === 'doctor') {
        hasAccess = record.accessGranted.some(access => {
          const doctorId = access.doctor._id ? access.doctor._id.toString() : access.doctor.toString();
          return doctorId === req.user._id.toString();
        });
      }
    }

    console.log('Access check:', {
      recordId,
      userId: req.user._id.toString(),
      userRole: req.user.role,
      isOwner,
      hasAccess,
      accessGranted: record.accessGranted.map(access => {
        const doctorId = access.doctor._id ? access.doctor._id.toString() : access.doctor.toString();
        return doctorId;
      })
    });

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Don't log access here - logging is done in downloadPDF() to avoid duplicates
    // This endpoint is just for fetching record metadata

    res.json(record);
  } catch (error) {
    console.error('Error in getRecord:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all records for a patient
exports.getPatientRecords = async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patient: req.user._id })
      .populate('accessGranted.doctor', 'name email')
      .sort('-createdAt');

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all accessible records for a doctor
exports.getDoctorAccessibleRecords = async (req, res) => {
  try {
    const records = await MedicalRecord.find({
      'accessGranted.doctor': req.user._id
    })
      .populate('patient', 'name email')
      .sort('-createdAt');

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Download/View PDF file - ENHANCED VERSION with download restrictions, notifications, and sharing detection
exports.downloadPDF = async (req, res) => {
  try {
    const { recordId } = req.params;
    const action = req.query.action || 'view'; // 'view' or 'download'
    const skipLog = req.query.skipLog === 'true'; // Skip logging for preload requests
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    console.log(`PDF access request: User ${req.user._id} (${req.user.role}) requesting record ${recordId}, action: ${action}, skipLog: ${skipLog}`);

    const record = await MedicalRecord.findOne({ recordId })
      .populate('patient', 'name email')
      .populate('accessGranted.doctor', 'name email');

    if (!record) {
      console.log(`Record not found: ${recordId}`);
      return res.status(404).json({ message: 'Record not found' });
    }

    console.log(`Record found: ${record.title}, IPFS Hash: ${record.ipfsHash}`);

    // Check access permission
    let hasAccess = false;
    let canDownload = false;
    const isOwner = record.patient._id.toString() === req.user._id.toString();
    
    if (isOwner) {
      hasAccess = true;
      canDownload = true; // Owners can always download
    } else if (req.user.role === 'doctor') {
      // Check if doctor has explicit access
      const doctorAccess = record.accessGranted.find(access => 
        access.doctor._id.toString() === req.user._id.toString()
      );
      
      if (doctorAccess) {
        hasAccess = true;
        // Check download permission
        canDownload = doctorAccess.permissions && doctorAccess.permissions.canDownload;
        
        // Check if access has expired
        if (doctorAccess.permissions && doctorAccess.permissions.expiresAt) {
          if (new Date() > new Date(doctorAccess.permissions.expiresAt)) {
            return res.status(403).json({ message: 'Your access to this record has expired' });
          }
        }
      }
    } else if (req.user.role === 'admin') {
      hasAccess = true;
      canDownload = true;
    }

    if (!hasAccess) {
      console.log(`Access denied for user ${req.user._id} to record ${recordId}`);
      return res.status(403).json({ message: 'Access denied' });
    }

    // DOWNLOAD RESTRICTION: Check if user is trying to download without permission
    if (action === 'download' && !canDownload && !isOwner) {
      console.log(`Download denied for user ${req.user._id} - view-only permission`);
      
      // Log unauthorized download attempt
      record.accessLogs.push({
        doctor: req.user._id,
        timestamp: new Date(),
        action: 'download',
        ipAddress,
        userAgent
      });
      await record.save();

      return res.status(403).json({ 
        message: 'Download not allowed. You have view-only access to this record.',
        viewOnly: true
      });
    }

    // SHARING DETECTION: Run detection algorithms
    if (req.user.role === 'doctor' && !skipLog) {
      try {
        // Get all records for bulk access detection
        const allRecords = await MedicalRecord.find({
          'accessGranted.doctor': req.user._id
        }).select('accessLogs').lean();
        
        const allAccessLogs = allRecords.map(r => r.accessLogs);
        
        const suspiciousActivities = await detectSuspiciousActivity(
          record,
          req.user._id,
          action,
          ipAddress,
          allAccessLogs
        );

        if (suspiciousActivities && suspiciousActivities.length > 0) {
          console.log(`⚠️ Suspicious activity detected for doctor ${req.user._id}:`, suspiciousActivities);
          
          // Save suspicious activities
          suspiciousActivities.forEach(activity => {
            record.sharingDetection.suspiciousActivities.push({
              doctor: req.user._id,
              activity: activity.description,
              detectedAt: new Date(),
              severity: activity.severity
            });
          });
          await record.save();

          // Notify patient about suspicious activity (high severity only)
          const highSeverityActivity = suspiciousActivities.find(a => a.severity === 'high');
          if (highSeverityActivity && record.accessNotifications.enabled) {
            const doctor = await User.findById(req.user._id);
            notifySuspiciousActivity(record.patient, doctor, record, highSeverityActivity)
              .catch(err => console.error('Failed to send suspicious activity notification:', err));
          }
        }
      } catch (detectionError) {
        console.error('Error in sharing detection:', detectionError);
        // Continue with access even if detection fails
      }
    }

    // Log access ONLY if skipLog is false (i.e., explicit user action, not preload)
    if (req.user.role === 'doctor' && !skipLog) {
      console.log(`✅ Creating access log entry for doctor ${req.user._id}, action: ${action}`);
      
      record.accessLogs.push({
        doctor: req.user._id,
        timestamp: new Date(),
        action: action,
        ipAddress,
        userAgent
      });
      await record.save();

      // REAL-TIME NOTIFICATION: Send email to patient
      if (record.accessNotifications && record.accessNotifications.enabled) {
        const shouldNotify = 
          (action === 'view' && record.accessNotifications.emailOnAccess) ||
          (action === 'download' && record.accessNotifications.emailOnDownload);

        if (shouldNotify) {
          const doctor = await User.findById(req.user._id);
          notifyPatientOnAccess(record.patient, doctor, record, action)
            .catch(err => console.error('Failed to send access notification:', err));
        }
      }
    } else if (skipLog) {
      console.log(`⏭️ Skipping access log for preload request (doctor ${req.user._id})`);
    }

    // Set headers for PDF viewing/downloading
    res.setHeader('Content-Type', 'application/pdf');
    
    if (action === 'download') {
      res.setHeader('Content-Disposition', `attachment; filename="${record.title}.pdf"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${record.title}.pdf"`);
      // Add header to prevent download for view-only mode
      if (!canDownload && !isOwner) {
        res.setHeader('X-Download-Options', 'noopen');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
    }
    
    res.setHeader('Cache-Control', 'private, max-age=3600');

    // IPFS gateways
    const gateways = [
      `https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`,
      `https://cloudflare-ipfs.com/ipfs/${record.ipfsHash}`,
      `https://ipfs.io/ipfs/${record.ipfsHash}`
    ];

    const downloadPromises = gateways.map(async (gateway, index) => {
      try {
        const response = await axios.get(gateway, {
          responseType: 'stream',
          headers: { 'Accept': 'application/pdf' },
          timeout: 15000,
          maxRedirects: 3
        });
        return { response, gateway, index };
      } catch (error) {
        console.log(`Gateway ${index + 1} failed: ${error.message}`);
        throw error;
      }
    });

    let ipfsResponse;
    try {
      const result = await Promise.race(
        downloadPromises.map(p => p.catch(e => ({ error: e })))
      );
      
      if (result.error) {
        const anyResult = await Promise.any(downloadPromises);
        ipfsResponse = anyResult.response;
        console.log(`Successfully connected to gateway ${anyResult.index + 1}, streaming PDF...`);
      } else {
        ipfsResponse = result.response;
        console.log(`Successfully connected to gateway ${result.index + 1}, streaming PDF...`);
      }
    } catch (error) {
      console.error('All IPFS gateways failed');
      return res.status(500).json({ 
        message: 'Error downloading PDF file from IPFS',
        error: 'All IPFS gateways are currently unavailable'
      });
    }

    ipfsResponse.data.on('error', (error) => {
      console.error('IPFS stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming PDF file' });
      }
    });

    ipfsResponse.data.pipe(res);

  } catch (error) {
    console.error('Error in downloadPDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        message: error.message,
        details: {
          recordId: req.params.recordId,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};

// Delete medical record (patient only)
exports.deleteRecord = async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await MedicalRecord.findOne({ recordId })
      .populate('patient', 'name email');

    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // Check if user is the owner of the record
    const isOwner = (record.patient._id ? record.patient._id.toString() : record.patient.toString()) === req.user._id.toString();
    
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the record owner or admin can delete this record' });
    }

    // Delete from IPFS (optional - depends on your IPFS policy)
    try {
      // You can implement IPFS deletion here if needed
      // For now, we'll just remove from our database
      console.log(`Record ${recordId} will be removed from database. IPFS content may remain.`);
    } catch (ipfsError) {
      console.warn('IPFS deletion failed:', ipfsError.message);
      // Continue with database deletion even if IPFS deletion fails
    }

    // Remove from database
    await MedicalRecord.findByIdAndDelete(record._id);

    // Log the deletion
    console.log(`Record ${recordId} deleted by user ${req.user._id}`);

    res.json({ 
      message: 'Medical record deleted successfully',
      deletedRecordId: recordId
    });

  } catch (error) {
    console.error('Error deleting medical record:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get access logs for a specific record (patient only)
exports.getAccessLogs = async (req, res) => {
  try {
    const { recordId } = req.params;

    console.log(`Fetching access logs for record: ${recordId}, user: ${req.user._id}`);

    const record = await MedicalRecord.findOne({ recordId })
      .populate('patient', 'name email')
      .populate('accessLogs.doctor', 'name email specialization')
      .lean();

    if (!record) {
      console.log(`Record not found: ${recordId}`);
      return res.status(404).json({ message: 'Record not found' });
    }

    // Check if user is the owner of the record
    const isOwner = (record.patient._id ? record.patient._id.toString() : record.patient.toString()) === req.user._id.toString();
    
    if (!isOwner && req.user.role !== 'admin') {
      console.log(`Access denied: User ${req.user._id} is not the owner of record ${recordId}`);
      return res.status(403).json({ message: 'Only the record owner can view access logs' });
    }

    // Sort access logs by timestamp (most recent first) and ensure timestamps are valid
    const sortedLogs = (record.accessLogs || [])
      .filter(log => {
        // Handle both 'timestamp' and 'accessedAt' field names (for backward compatibility)
        const hasTimestamp = log.timestamp || log.accessedAt;
        
        if (!hasTimestamp) {
          console.warn(`Log entry missing timestamp for record ${recordId}:`, log);
          return false;
        }
        if (!log.doctor) {
          console.warn(`Log entry missing doctor for record ${recordId}:`, log);
          return false;
        }
        return true;
      })
      .map(log => {
        // Use timestamp if available, otherwise use accessedAt (for backward compatibility)
        const timestamp = log.timestamp || log.accessedAt;
        
        return {
          ...log,
          // Ensure timestamp is a valid ISO string
          timestamp: timestamp instanceof Date ? timestamp.toISOString() : new Date(timestamp).toISOString(),
          // Ensure doctor object has required fields
          doctor: {
            _id: log.doctor._id,
            name: log.doctor.name || 'Unknown Doctor',
            email: log.doctor.email || 'unknown@example.com',
            specialization: log.doctor.specialization || 'General'
          }
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log(`Returning ${sortedLogs.length} access logs for record ${recordId}`);

    res.json({
      recordId: record.recordId,
      recordTitle: record.title,
      accessLogs: sortedLogs,
      totalAccesses: sortedLogs.length
    });

  } catch (error) {
    console.error('Error fetching access logs:', error);
    res.status(500).json({ 
      message: error.message,
      error: 'Failed to fetch access logs'
    });
  }
};

// Get access statistics for all patient records
exports.getAccessStatistics = async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patient: req.user._id })
      .populate('accessLogs.doctor', 'name email specialization')
      .lean();

    // Calculate statistics
    const statistics = {
      totalRecords: records.length,
      totalAccesses: 0,
      recordsWithAccess: 0,
      mostAccessedRecord: null,
      recentAccesses: [],
      doctorAccessCounts: {}
    };

    records.forEach(record => {
      const accessCount = record.accessLogs.length;
      statistics.totalAccesses += accessCount;

      if (accessCount > 0) {
        statistics.recordsWithAccess++;

        // Track most accessed record
        if (!statistics.mostAccessedRecord || accessCount > statistics.mostAccessedRecord.count) {
          statistics.mostAccessedRecord = {
            recordId: record.recordId,
            title: record.title,
            count: accessCount
          };
        }

        // Collect recent accesses
        record.accessLogs.forEach(log => {
          statistics.recentAccesses.push({
            recordId: record.recordId,
            recordTitle: record.title,
            doctor: log.doctor,
            action: log.action,
            timestamp: log.timestamp
          });

          // Count accesses by doctor
          const doctorId = log.doctor._id.toString();
          const doctorName = log.doctor.name;
          if (!statistics.doctorAccessCounts[doctorId]) {
            statistics.doctorAccessCounts[doctorId] = {
              name: doctorName,
              email: log.doctor.email,
              count: 0
            };
          }
          statistics.doctorAccessCounts[doctorId].count++;
        });
      }
    });

    // Sort recent accesses by timestamp (most recent first)
    statistics.recentAccesses.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Limit to 10 most recent
    statistics.recentAccesses = statistics.recentAccesses.slice(0, 10);

    // Convert doctor access counts to array and sort
    statistics.topDoctors = Object.values(statistics.doctorAccessCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    delete statistics.doctorAccessCounts;

    res.json(statistics);

  } catch (error) {
    console.error('Error fetching access statistics:', error);
    res.status(500).json({ message: error.message });
  }
};

// Export access logs as PDF
exports.exportAccessLogsPDF = async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await MedicalRecord.findOne({ recordId })
      .populate('patient', 'name email')
      .populate('accessLogs.doctor', 'name email specialization');

    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // Check if user is the owner
    const isOwner = record.patient._id.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the record owner can export access logs' });
    }

    // Sort logs by timestamp (most recent first)
    const sortedLogs = record.accessLogs.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Generate PDF
    const pdfBuffer = await exportAccessLogsPDF(record, sortedLogs, record.patient);

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="access-logs-${record.recordId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error exporting access logs as PDF:', error);
    res.status(500).json({ message: error.message });
  }
};

// Export access logs as CSV
exports.exportAccessLogsCSV = async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await MedicalRecord.findOne({ recordId })
      .populate('patient', 'name email')
      .populate('accessLogs.doctor', 'name email specialization');

    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // Check if user is the owner
    const isOwner = record.patient._id.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the record owner can export access logs' });
    }

    // Sort logs by timestamp (most recent first)
    const sortedLogs = record.accessLogs.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Generate CSV
    const csv = exportAccessLogsCSV(record, sortedLogs, record.patient);

    // Set headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="access-logs-${record.recordId}.csv"`);

    // Send CSV
    res.send(csv);

  } catch (error) {
    console.error('Error exporting access logs as CSV:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update access permissions for a doctor
exports.updateAccessPermissions = async (req, res) => {
  try {
    const { recordId, doctorEmail } = req.body;
    const { canDownload, expiresAt } = req.body.permissions || {};

    const record = await MedicalRecord.findOne({ recordId, patient: req.user._id });
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const doctor = await User.findOne({ email: doctorEmail, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Find and update doctor's access permissions
    const accessIndex = record.accessGranted.findIndex(
      access => access.doctor.toString() === doctor._id.toString()
    );

    if (accessIndex === -1) {
      return res.status(404).json({ message: 'Doctor does not have access to this record' });
    }

    // Update permissions
    record.accessGranted[accessIndex].permissions = {
      canView: true,
      canDownload: canDownload !== undefined ? canDownload : false,
      expiresAt: expiresAt || null
    };

    await record.save();

    res.json({ 
      message: 'Access permissions updated successfully',
      permissions: record.accessGranted[accessIndex].permissions
    });

  } catch (error) {
    console.error('Error updating access permissions:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update notification settings for a record
exports.updateNotificationSettings = async (req, res) => {
  try {
    const { recordId } = req.params;
    const { enabled, emailOnAccess, emailOnDownload, emailOnShare } = req.body;

    const record = await MedicalRecord.findOne({ recordId, patient: req.user._id });
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // Update notification settings
    record.accessNotifications = {
      enabled: enabled !== undefined ? enabled : record.accessNotifications.enabled,
      emailOnAccess: emailOnAccess !== undefined ? emailOnAccess : record.accessNotifications.emailOnAccess,
      emailOnDownload: emailOnDownload !== undefined ? emailOnDownload : record.accessNotifications.emailOnDownload,
      emailOnShare: emailOnShare !== undefined ? emailOnShare : record.accessNotifications.emailOnShare
    };

    await record.save();

    res.json({ 
      message: 'Notification settings updated successfully',
      settings: record.accessNotifications
    });

  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ message: error.message });
  }
}; 