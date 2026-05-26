const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recordType: {
    type: String,
    required: true,
    enum: ['prescription', 'labReport', 'diagnosis', 'imaging', 'other']
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  ipfsHash: {
    type: String,
    required: true
  },
  encryptedKey: {
    type: String,
    required: true
  },
  blockchainTxHash: {
    type: String,
    required: true
  },
  recordId: {
    type: String,
    required: true
  },
  accessGranted: [{
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    grantedAt: {
      type: Date,
      default: Date.now
    },
    permissions: {
      canView: {
        type: Boolean,
        default: true
      },
      canDownload: {
        type: Boolean,
        default: false  // Default: view-only mode
      },
      expiresAt: {
        type: Date,
        default: null  // null = no expiration
      }
    }
  }],
  accessLogs: [{
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    action: {
      type: String,
      enum: ['view', 'download', 'share', 'diagnose']
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    },
    blockchainTxHash: {
      type: String,
      default: null
    }
  }],
  accessNotifications: {
    enabled: {
      type: Boolean,
      default: true  // Enable notifications by default
    },
    emailOnAccess: {
      type: Boolean,
      default: true
    },
    emailOnDownload: {
      type: Boolean,
      default: true
    },
    emailOnShare: {
      type: Boolean,
      default: true
    }
  },
  sharingDetection: {
    enabled: {
      type: Boolean,
      default: true
    },
    suspiciousActivities: [{
      doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      activity: {
        type: String
      },
      detectedAt: {
        type: Date,
        default: Date.now
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      }
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
medicalRecordSchema.index({ patient: 1, recordType: 1 });
medicalRecordSchema.index({ recordId: 1 }, { unique: true });
medicalRecordSchema.index({ 'accessLogs.timestamp': -1 });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema); 