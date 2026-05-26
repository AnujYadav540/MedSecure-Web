const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const medicalRecordController = require('../controllers/medicalRecordController');
const { auth, checkRole, verifyWalletSignature } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads (disk storage)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../temp'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Test route to verify server is working
router.get('/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// Diagnostic endpoint for access logs
router.get('/diagnostic/access-logs/:recordId', auth, async (req, res) => {
  try {
    const { recordId } = req.params;
    const MedicalRecord = require('../models/MedicalRecord');
    
    const record = await MedicalRecord.findOne({ recordId })
      .populate('patient', 'name email')
      .populate('accessLogs.doctor', 'name email specialization')
      .lean();

    if (!record) {
      return res.json({
        status: 'error',
        message: 'Record not found',
        recordId
      });
    }

    const diagnostic = {
      status: 'success',
      recordId: record.recordId,
      recordTitle: record.title,
      patientId: record.patient._id,
      requestingUserId: req.user._id,
      isOwner: record.patient._id.toString() === req.user._id.toString(),
      accessLogsCount: record.accessLogs ? record.accessLogs.length : 0,
      accessLogs: record.accessLogs ? record.accessLogs.map((log, index) => ({
        index,
        hasDoctor: !!log.doctor,
        doctorId: log.doctor?._id,
        doctorName: log.doctor?.name,
        hasTimestamp: !!log.timestamp,
        timestamp: log.timestamp,
        timestampType: typeof log.timestamp,
        timestampIsDate: log.timestamp instanceof Date,
        action: log.action,
        ipAddress: log.ipAddress
      })) : []
    };

    res.json(diagnostic);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const { getSystemHealth } = require('../utils/errorMonitor');
  
  const health = {
    ...getSystemHealth(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  
  const statusCode = health.database === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
});

// IPFS connectivity test endpoint
router.get('/test-ipfs', async (req, res) => {
  try {
    const axios = require('axios');
    const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'; // IPFS hello world
    
    const results = {
      timestamp: new Date().toISOString(),
      testHash: testHash,
      gateways: {}
    };
    
    // Test Pinata gateway
    try {
      const startTime = Date.now();
      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${testHash}`, {
        timeout: 10000
      });
      results.gateways.pinata = {
        status: 'working',
        responseTime: Date.now() - startTime,
        statusCode: response.status
      };
    } catch (error) {
      results.gateways.pinata = {
        status: 'failed',
        error: error.message
      };
    }
    
    // Test ipfs.io gateway
    try {
      const startTime = Date.now();
      const response = await axios.get(`https://ipfs.io/ipfs/${testHash}`, {
        timeout: 10000
      });
      results.gateways.ipfs_io = {
        status: 'working',
        responseTime: Date.now() - startTime,
        statusCode: response.status
      };
    } catch (error) {
      results.gateways.ipfs_io = {
        status: 'failed',
        error: error.message
      };
    }
    
    // Test Cloudflare gateway
    try {
      const startTime = Date.now();
      const response = await axios.get(`https://cloudflare-ipfs.com/ipfs/${testHash}`, {
        timeout: 10000
      });
      results.gateways.cloudflare = {
        status: 'working',
        responseTime: Date.now() - startTime,
        statusCode: response.status
      };
    } catch (error) {
      results.gateways.cloudflare = {
        status: 'failed',
        error: error.message
      };
    }
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to test IPFS connectivity',
      message: error.message 
    });
  }
});

// Auth routes
router.post('/auth/register', [
  check('name').trim().notEmpty().withMessage('Name is required'),
  check('email').trim().isEmail().withMessage('Please enter a valid email'),
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  check('role').isIn(['patient', 'doctor']).withMessage('Invalid role'),
  check('walletAddress').trim().notEmpty().withMessage('Wallet address is required'),
  check('specialization').if(check('role').equals('doctor')).notEmpty().withMessage('Specialization is required for doctors'),
  check('licenseNumber').if(check('role').equals('doctor')).notEmpty().withMessage('License number is required for doctors')
], authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/profile', auth, authController.getProfile);
router.post('/auth/profile', auth, (req, res, next) => {
  console.log('Profile update route hit:', {
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers
  });
  next();
}, authController.updateProfile);
router.post('/auth/verify-wallet', auth, verifyWalletSignature, authController.verifyWallet);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/verify-otp', authController.verifyOTP);
// Email verification routes
router.post('/auth/verify-email', authController.verifyEmail);
router.post('/auth/resend-verification', authController.resendEmailVerification);
router.post('/auth/change-unverified-email', authController.changeUnverifiedEmail);
router.get('/doctors', auth, authController.getAllDoctors);
router.post('/doctors/verify/:doctorId', auth, checkRole(['admin']), authController.verifyDoctor);
router.post('/doctors/reject/:doctorId', auth, checkRole(['admin']), authController.rejectDoctor);
router.post('/doctors/background-check/:doctorId', auth, checkRole(['admin']), authController.updateBackgroundCheck);
router.post('/doctors/automated-verification/:doctorId', auth, checkRole(['admin']), authController.performAutomatedVerification);
router.post('/auth/profile-picture', auth, upload.single('profilePicture'), authController.uploadProfilePicture);
router.delete('/auth/delete-account', auth, authController.deleteAccount);

// Admin routes
router.post('/admin/create', authController.createFirstAdmin); // No auth required for first admin
router.get('/admin/pending-doctors', auth, checkRole(['admin']), authController.getPendingDoctors);
router.get('/admin/verified-doctors', auth, checkRole(['admin']), authController.getVerifiedDoctors);

// Medical record routes - Patient
router.post(
  '/records/upload',
  auth,
  checkRole(['patient', 'admin']),
  upload.single('file'),
  medicalRecordController.uploadRecord
);

router.post(
  '/records/grant-access',
  auth,
  checkRole(['patient', 'admin']),
  medicalRecordController.grantAccess
);

router.post(
  '/records/revoke-access',
  auth,
  checkRole(['patient', 'admin']),
  medicalRecordController.revokeAccess
);

router.post(
  '/records/grant-access-by-email',
  auth,
  checkRole(['patient', 'admin']),
  medicalRecordController.grantAccessByEmail
);

router.post(
  '/records/revoke-access-by-email',
  auth,
  checkRole(['patient', 'admin']),
  medicalRecordController.revokeAccessByEmail
);

// Add delete record route
router.delete(
  '/records/:recordId',
  auth,
  checkRole(['patient', 'admin']),
  medicalRecordController.deleteRecord
);

router.get(
  '/records/patient',
  auth,
  checkRole(['patient', 'admin']),
  medicalRecordController.getPatientRecords
);

// Medical record routes - Doctor
router.get(
  '/records/doctor',
  auth,
  checkRole(['doctor']),
  medicalRecordController.getDoctorAccessibleRecords
);

// Common routes
router.get(
  '/records/:recordId',
  auth,
  checkRole(['patient', 'doctor', 'admin']),
  medicalRecordController.getRecord
);

// Download PDF route
router.get(
  '/records/:recordId/pdf',
  auth,
  checkRole(['patient', 'doctor', 'admin']),
  medicalRecordController.downloadPDF
);

// Access logs routes (patient only)
router.get(
  '/medical-records/:recordId/access-logs',
  auth,
  checkRole(['patient', 'admin']),
  medicalRecordController.getAccessLogs
);

router.get(
  '/medical-records/statistics/access',
  auth,
  checkRole(['patient', 'admin']),
  medicalRecordController.getAccessStatistics
);

// Export access logs routes (patient only)
router.get(
  '/medical-records/:recordId/export/pdf',
  auth,
  checkRole(['patient', 'admin']),
  medicalRecordController.exportAccessLogsPDF
);

router.get(
  '/medical-records/:recordId/export/csv',
  auth,
  checkRole(['patient', 'admin']),
  medicalRecordController.exportAccessLogsCSV
);

// Update access permissions route (patient only)
router.put(
  '/medical-records/permissions',
  auth,
  checkRole(['patient', 'admin']),
  medicalRecordController.updateAccessPermissions
);

// Update notification settings route (patient only)
router.put(
  '/medical-records/:recordId/notifications',
  auth,
  checkRole(['patient', 'admin']),
  medicalRecordController.updateNotificationSettings
);

module.exports = router; 