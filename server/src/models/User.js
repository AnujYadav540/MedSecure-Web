const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'admin'],
    required: true
  },
  walletAddress: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  specialization: {
    type: String,
    required: function() { return this.role === 'doctor'; }
  },
  licenseNumber: {
    type: String,
    required: function() { return this.role === 'doctor'; }
  },
  // New verification fields for doctors
  medicalBoard: {
    type: String
  },
  licenseExpiry: {
    type: Date
  },
  governmentId: {
    type: String
  },
  backgroundCheckStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  profileCompleted: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed', 'requires_manual_review'],
    default: 'pending'
  },
  verificationResults: {
    type: Object,
    default: null
  },
  lastVerificationDate: {
    type: Date,
    default: null
  },
  mobileNumber: {
    type: String,
    required: false // Changed from required: function() { return this.role === 'doctor'; }
  },
  profilePhoto: {
    type: String,
    default: null
  },
  nameMatchingStatus: {
    type: String,
    enum: ['pending', 'matched', 'mismatch', 'requires_review', 'perfect_match'],
    default: 'pending'
  },
  verificationScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  profilePicture: {
    type: String,
    default: null
  },
  // Password reset OTP fields
  resetPasswordOTP: {
    type: String,
    default: null
  },
  resetPasswordOTPExpires: {
    type: Date,
    default: null
  },
  // Email verification fields
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationOTP: {
    type: String,
    default: null
  },
  emailVerificationOTPExpires: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Create indexes
userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

// Ensure indexes are created
User.createIndexes();

module.exports = User; 