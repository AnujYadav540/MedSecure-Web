const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// Automated verification system

// Medical Board Verification API
const verifyMedicalBoard = async (medicalBoard, licenseNumber) => {
  try {
    console.log(`Verifying medical board: ${medicalBoard} with license: ${licenseNumber}`);
    
    // Real validation logic to detect fake details
    if (!medicalBoard || !licenseNumber) {
      return {
        verified: false,
        status: 'missing_data',
        error: 'Missing medical board or license information',
        requiresManualReview: true
      };
    }

    // Check for obviously fake patterns
    const obviouslyFakePatterns = [
      /^TEST\d+$/,
      /^FAKE\d+$/,
      /^DEMO\d+$/,
      /^12345$/,
      /^ABCDEF$/
    ];

    const isObviouslyFake = obviouslyFakePatterns.some(pattern => pattern.test(licenseNumber));
    
    if (isObviouslyFake) {
      return {
        verified: false,
        status: 'invalid',
        error: 'License number appears to be fake or test data',
        requiresManualReview: true,
        recommendations: ['Verify license number with medical board', 'Check for typos in license number']
      };
    }

    // Check for valid medical board names
    const validBoards = [
      'Delhi Medical Council',
      'Maharashtra Medical Council', 
      'Karnataka Medical Council',
      'Tamil Nadu Medical Council',
      'Kerala Medical Council',
      'West Bengal Medical Council',
      'Gujarat Medical Council',
      'Rajasthan Medical Council',
      'Uttar Pradesh Medical Council',
      'Madhya Pradesh Medical Council'
    ];

    if (!validBoards.includes(medicalBoard)) {
      return {
        verified: false,
        status: 'invalid_board',
        error: 'Invalid medical board name',
        requiresManualReview: true,
        recommendations: ['Verify medical board name', 'Check spelling of medical board']
      };
    }

    // For demo: Accept any license with valid board
    return {
      verified: true,
      status: 'active',
      expiryDate: '2025-12-31',
      source: 'Medical Board Database (Demo)',
      message: 'License verified successfully'
    };
  } catch (error) {
    console.error('Medical board verification error:', error);
    return {
      verified: false,
      status: 'error',
      error: 'Verification service unavailable',
      requiresManualReview: true
    };
  }
};

// Government ID Verification API
const verifyGovernmentId = async (governmentId) => {
  try {
    console.log(`Verifying government ID: ${governmentId}`);
    
    // Real validation logic to detect fake details
    if (!governmentId) {
      return {
        verified: false,
        status: 'missing_data',
        error: 'Government ID not provided',
        requiresManualReview: true
      };
    }

    // Check for obviously fake patterns (but allow realistic test data)
    const obviouslyFakePatterns = [
      /^123456789012$/, // Common fake Aadhaar
      /^111111111111$/, // All ones
      /^000000000000$/, // All zeros
      /^TEST\d+$/,
      /^FAKE\d+$/,
      /^DEMO\d+$/
    ];

    const isObviouslyFake = obviouslyFakePatterns.some(pattern => pattern.test(governmentId));
    
    if (isObviouslyFake) {
      return {
        verified: false,
        status: 'invalid',
        error: 'Government ID appears to be fake or test data',
        requiresManualReview: true,
        recommendations: ['Verify government ID with official database', 'Check for typos in ID number']
      };
    }

    // Validate Aadhaar format (if it's Aadhaar)
    if (governmentId.length === 12) {
      // Aadhaar validation: should not start with 0 or 1
      if (governmentId.startsWith('0') || governmentId.startsWith('1')) {
        return {
          verified: false,
          status: 'invalid_format',
          error: 'Invalid Aadhaar number format',
          requiresManualReview: true,
          recommendations: ['Aadhaar numbers should not start with 0 or 1', 'Verify Aadhaar number']
        };
      }
    }

    // For demo: Accept any realistic-looking ID (12 digits starting with 2-9)
    const realisticId = /^[2-9]\d{11}$/.test(governmentId);
    
    if (realisticId) {
      return {
        verified: true,
        status: 'valid',
        name: 'Verified User',
        source: 'Government Database (Demo)',
        message: 'ID verified successfully'
      };
    } else {
      return {
        verified: false,
        status: 'invalid_format',
        error: 'Invalid ID format',
        requiresManualReview: true
      };
    }
  } catch (error) {
    console.error('Government ID verification error:', error);
    return {
      verified: false,
      status: 'error',
      error: 'Verification service unavailable',
      requiresManualReview: true
    };
  }
};

// Background Check API
const performBackgroundCheck = async (name, governmentId) => {
  try {
    console.log(`Performing background check for: ${name}`);
    
    // Real validation logic to detect fake details
    if (!name || !governmentId) {
      return {
        status: 'pending',
        score: 0,
        error: 'Missing name or government ID for background check',
        requiresManualReview: true
      };
    }

    // Check for obviously fake names
    const obviouslyFakeNames = [
      'Test User',
      'Fake Name',
      'Demo User',
      'Test Doctor',
      'Fake Doctor'
    ];

    if (obviouslyFakeNames.includes(name)) {
      return {
        status: 'failed',
        score: 0,
        error: 'Name appears to be fake or test data',
        requiresManualReview: true,
        recommendations: ['Verify doctor name', 'Check for typos in name']
      };
    }

    // Check for obviously fake government IDs
    const obviouslyFakeIds = [
      '123456789012',
      '111111111111',
      '000000000000'
    ];

    if (obviouslyFakeIds.includes(governmentId)) {
      return {
        status: 'failed',
        score: 0,
        error: 'Government ID appears to be fake or test data',
        requiresManualReview: true,
        recommendations: ['Verify government ID', 'Check for typos in ID']
      };
    }

    // For demo: Accept any realistic-looking data
    const realisticName = name.length > 3 && !obviouslyFakeNames.includes(name);
    const realisticId = governmentId.length === 12 && !obviouslyFakeIds.includes(governmentId);
    
    if (realisticName && realisticId) {
      return {
        status: 'clear',
        score: 95,
        criminalRecord: false,
        professionalMisconduct: false,
        source: 'Background Check Service (Demo)',
        message: 'Background check passed successfully'
      };
    } else {
      return {
        status: 'requires_review',
        score: 50,
        error: 'Unable to complete automated verification',
        requiresManualReview: true,
        source: 'Background Check Service (Demo)'
      };
    }
  } catch (error) {
    console.error('Background check error:', error);
    return {
      status: 'error',
      score: 0,
      error: 'Background check service unavailable',
      requiresManualReview: true
    };
  }
};

// License Expiry Check
const checkLicenseExpiry = (expiryDate) => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  
  return {
    valid: daysUntilExpiry > 0,
    daysUntilExpiry: daysUntilExpiry,
    status: daysUntilExpiry > 30 ? 'valid' : daysUntilExpiry > 0 ? 'expiring_soon' : 'expired'
  };
};

// Name Matching Verification
const verifyNameMatching = async (doctorName, governmentId, licenseNumber) => {
  try {
    console.log(`Verifying name matching for: ${doctorName}`);
    
    // For demo: Simple name matching - accept if name is provided
    if (!doctorName || doctorName.length < 3) {
      return {
        matched: false,
        score: 0,
        status: 'invalid_name',
        error: 'Doctor name is too short or missing',
        recommendations: ['Provide full name']
      };
    }

    // For demo purposes: Accept any reasonable name
    return {
      matched: true,
      score: 100,
      status: 'matched',
      details: {
        doctorName: doctorName,
        governmentName: doctorName,
        licenseName: doctorName,
        source: 'Name Matching Service (Demo)'
      },
      message: 'Name verified across all sources'
    };
  } catch (error) {
    console.error('Name matching verification error:', error);
    return {
      matched: false,
      score: 0,
      status: 'error',
      error: 'Unable to verify name matching',
      requiresManualReview: true
    };
  }
};

// Comprehensive automated verification
exports.performAutomatedVerification = async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Prevent rapid re-verification attempts
    if (doctor.lastVerificationDate && 
        Date.now() - doctor.lastVerificationDate.getTime() < 300000) { // 5 minutes
      return res.status(429).json({ 
        message: 'Verification was attempted recently. Please wait before retrying.',
        nextAttemptTime: new Date(doctor.lastVerificationDate.getTime() + 300000)
      });
    }
    
    console.log(`Starting automated verification for doctor: ${doctor.name}`);
    
    // Initialize verification results
    const verificationResults = {
      doctorId: doctor._id,
      doctorName: doctor.name,
      timestamp: new Date(),
      checks: {},
      overallStatus: 'pending',
      requiresManualReview: false,
      recommendations: []
    };
    
    // 1. Medical Board Verification
    if (doctor.medicalBoard && doctor.licenseNumber) {
      console.log('Performing medical board verification...');
      const boardVerification = await verifyMedicalBoard(doctor.medicalBoard, doctor.licenseNumber);
      verificationResults.checks.medicalBoard = {
        verified: boardVerification.verified,
        status: boardVerification.status || 'unknown',
        details: boardVerification,
        timestamp: new Date()
      };
      
      if (!boardVerification.verified) {
        verificationResults.requiresManualReview = true;
        verificationResults.recommendations.push('Medical board verification failed - requires manual review');
      }
    } else {
      verificationResults.checks.medicalBoard = {
        verified: false,
        status: 'missing_data',
        details: { error: 'Medical board or license number not provided' },
        timestamp: new Date()
      };
      verificationResults.requiresManualReview = true;
      verificationResults.recommendations.push('Medical board information incomplete');
    }
    
    // 2. Government ID Verification
    if (doctor.governmentId) {
      console.log('Performing government ID verification...');
      const idVerification = await verifyGovernmentId(doctor.governmentId);
      verificationResults.checks.governmentId = {
        verified: idVerification.verified,
        status: idVerification.status || 'unknown',
        details: idVerification,
        timestamp: new Date()
      };
      
      if (!idVerification.verified) {
        verificationResults.requiresManualReview = true;
        verificationResults.recommendations.push('Government ID verification failed - requires manual review');
      }
    } else {
      verificationResults.checks.governmentId = {
        verified: false,
        status: 'missing_data',
        details: { error: 'Government ID not provided' },
        timestamp: new Date()
      };
      verificationResults.requiresManualReview = true;
      verificationResults.recommendations.push('Government ID not provided');
    }
    
    // 3. License Expiry Check
    if (doctor.licenseExpiry) {
      console.log('Checking license expiry...');
      const expiryCheck = checkLicenseExpiry(doctor.licenseExpiry);
      verificationResults.checks.licenseExpiry = {
        valid: expiryCheck.valid,
        status: expiryCheck.status,
        daysUntilExpiry: expiryCheck.daysUntilExpiry,
        details: expiryCheck,
        timestamp: new Date()
      };
      
      if (!expiryCheck.valid) {
        verificationResults.requiresManualReview = true;
        verificationResults.recommendations.push('License has expired - requires manual review');
      } else if (expiryCheck.status === 'expiring_soon') {
        verificationResults.recommendations.push('License expiring soon - notify doctor');
      }
    } else {
      verificationResults.checks.licenseExpiry = {
        valid: false,
        status: 'missing_data',
        details: { error: 'License expiry date not provided' },
        timestamp: new Date()
      };
      verificationResults.requiresManualReview = true;
      verificationResults.recommendations.push('License expiry date not provided');
    }
    
    // 4. Background Check
    console.log('Performing background check...');
    const backgroundCheck = await performBackgroundCheck(doctor.name, doctor.governmentId);
    verificationResults.checks.backgroundCheck = {
      status: backgroundCheck.status,
      score: backgroundCheck.score,
      details: backgroundCheck,
      timestamp: new Date()
    };
    
    if (backgroundCheck.status !== 'clear') {
      verificationResults.requiresManualReview = true;
      verificationResults.recommendations.push('Background check requires manual review');
    }
    
    // 5. Name Matching Check
    console.log('Performing name matching check...');
    const nameMatching = await verifyNameMatching(doctor.name, doctor.governmentId, doctor.licenseNumber);
    verificationResults.checks.nameMatching = {
      matched: nameMatching.matched,
      score: nameMatching.score,
      status: nameMatching.status,
      details: nameMatching.details,
      recommendations: nameMatching.recommendations,
      timestamp: new Date()
    };

    if (!nameMatching.matched) {
      verificationResults.requiresManualReview = true;
      verificationResults.recommendations.push('Name mismatch - requires manual review');
    }
    
    // 6. Determine Overall Status
    const allChecks = Object.values(verificationResults.checks);
    const passedChecks = allChecks.filter(check => 
      (check.verified !== false && check.valid !== false && check.status === 'clear')
    );
    
    if (verificationResults.requiresManualReview) {
      verificationResults.overallStatus = 'requires_manual_review';
    } else if (passedChecks.length === allChecks.length) {
      verificationResults.overallStatus = 'verified';
    } else {
      verificationResults.overallStatus = 'failed';
    }
    
    // 7. Update doctor's verification status
    doctor.verificationStatus = verificationResults.overallStatus;
    doctor.verificationResults = verificationResults;
    doctor.lastVerificationDate = new Date();
    doctor.verificationScore = verificationResults.overallScore;
    doctor.nameMatchingStatus = verificationResults.checks.nameMatching?.status || 'pending';
    
    // Ensure mobileNumber exists to prevent validation errors
    if (!doctor.mobileNumber) {
      doctor.mobileNumber = 'Not provided';
    }
    
    await doctor.save();
    
    // 8. Send notification to admin if manual review required
    if (verificationResults.requiresManualReview) {
      // This would integrate with notification system
      console.log(`Manual review required for doctor: ${doctor.name}`);
      console.log('Recommendations:', verificationResults.recommendations);
    }
    
    res.json({
      message: 'Automated verification completed',
      verificationResults,
      doctor: {
        id: doctor._id,
        name: doctor.name,
        verificationStatus: doctor.verificationStatus,
        isVerified: doctor.isVerified
      }
    });
    
  } catch (error) {
    console.error('Automated verification error:', error);
    res.status(500).json({ 
      message: 'Automated verification failed',
      error: error.message 
    });
  }
};

// Register new user
exports.register = async (req, res) => {
  try {
    console.log('Registration request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role, walletAddress, specialization, licenseNumber } = req.body;
    console.log('Extracted fields:', { name, email, role, walletAddress });

    // Check if user already exists with this email
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log('User already exists with email:', email);
      
      // Check if the existing user has verified their email
      if (existingUser.emailVerified) {
        // Email is verified - this is a real account
        return res.status(400).json({ 
          message: 'A verified account with this email already exists. Please login instead.' 
        });
      } else {
        // Email NOT verified - check if OTP expired
        const otpExpired = !existingUser.emailVerificationOTPExpires || 
                          existingUser.emailVerificationOTPExpires < Date.now();
        
        if (otpExpired) {
          // OTP expired - delete the old unverified account and allow re-registration
          console.log('Deleting expired unverified account for:', email);
          await User.deleteOne({ _id: existingUser._id });
          // Continue with new registration below
        } else {
          // OTP still valid - ask user to verify or resend
          return res.status(400).json({ 
            message: 'An account with this email is pending verification. Please check your email or request a new verification code.',
            emailVerificationPending: true,
            email: email
          });
        }
      }
    }

    // Generate 6-digit OTP for email verification
    const emailVerificationOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role,
      walletAddress,
      specialization,
      licenseNumber,
      emailVerified: false, // Email not verified yet
      emailVerificationOTP,
      emailVerificationOTPExpires: otpExpires,
      isVerified: false // Account not fully verified until email is confirmed
    });

    await user.save();
    console.log('User saved successfully:', user._id);

    // Send verification email
    try {
      await sendEmail({
        to: email,
        subject: 'Verify Your Email - MedSecure',
        text: `Welcome to MedSecure!\n\nYour email verification OTP is: ${emailVerificationOTP}\n\nThis OTP is valid for 10 minutes.\n\nIf you didn't create this account, please ignore this email. The account will be automatically deleted if not verified within 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">MedSecure</h1>
            </div>
            <div style="padding: 30px; background-color: #f9fafb;">
              <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email Address</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Welcome to MedSecure! To complete your registration and secure your account, please verify your email address.
              </p>
              <div style="background-color: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">Your Verification Code</p>
                <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                  ${emailVerificationOTP}
                </div>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                This code will expire in <strong>10 minutes</strong>.
              </p>
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>Security Notice:</strong> If you didn't create this account, please ignore this email. The unverified account will be automatically deleted after 10 minutes.
                </p>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
                This is an automated message from MedSecure. Please do not reply to this email.
              </p>
            </div>
            <div style="background-color: #1f2937; padding: 20px; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                © 2024 MedSecure. All rights reserved.
              </p>
            </div>
          </div>
        `
      });
      console.log('Verification email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // If email fails, delete the user to prevent email squatting
      await User.deleteOne({ _id: user._id });
      return res.status(500).json({ 
        message: 'Failed to send verification email. Please try again with a valid email address.' 
      });
    }

    // Generate JWT token (but account is not fully active until email verified)
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret_key_for_development',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account. The verification code will expire in 10 minutes.',
      token,
      emailVerificationRequired: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        specialization: user.specialization,
        licenseNumber: user.licenseNumber,
        emailVerified: user.emailVerified,
        isVerified: user.isVerified,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        specialization: user.specialization,
        licenseNumber: user.licenseNumber,
        medicalBoard: user.medicalBoard,
        licenseExpiry: user.licenseExpiry,
        governmentId: user.governmentId,
        backgroundCheckStatus: user.backgroundCheckStatus,
        profileCompleted: user.profileCompleted,
        isVerified: user.isVerified,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    console.log('Update profile request body:', req.body);
    
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Current user data:', {
      id: user._id,
      role: user.role,
      existingFields: {
        medicalBoard: user.medicalBoard,
        licenseExpiry: user.licenseExpiry,
        governmentId: user.governmentId,
        specialization: user.specialization,
        licenseNumber: user.licenseNumber,
        mobileNumber: user.mobileNumber,
        profilePhoto: user.profilePhoto,
        profileCompleted: user.profileCompleted
      }
    });
    
    // Update fields if provided
    if (req.body.medicalBoard !== undefined) user.medicalBoard = req.body.medicalBoard;
    if (req.body.licenseExpiry !== undefined) user.licenseExpiry = req.body.licenseExpiry;
    if (req.body.governmentId !== undefined) user.governmentId = req.body.governmentId;
    if (req.body.specialization !== undefined) user.specialization = req.body.specialization;
    if (req.body.licenseNumber !== undefined) user.licenseNumber = req.body.licenseNumber;
    if (req.body.mobileNumber !== undefined) user.mobileNumber = req.body.mobileNumber;
    if (req.body.profilePhoto !== undefined) user.profilePhoto = req.body.profilePhoto;
    if (req.body.profileCompleted !== undefined) user.profileCompleted = req.body.profileCompleted;
    
    await user.save();
    
    console.log('Updated user data:', {
      medicalBoard: user.medicalBoard,
      licenseExpiry: user.licenseExpiry,
      governmentId: user.governmentId,
      specialization: user.specialization,
      licenseNumber: user.licenseNumber,
      mobileNumber: user.mobileNumber,
      profilePhoto: user.profilePhoto,
      profileCompleted: user.profileCompleted
    });
    
    console.log('User saved successfully');
    
    res.json({ 
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        licenseNumber: user.licenseNumber,
        medicalBoard: user.medicalBoard,
        licenseExpiry: user.licenseExpiry,
        governmentId: user.governmentId,
        mobileNumber: user.mobileNumber,
        profilePhoto: user.profilePhoto,
        profileCompleted: user.profileCompleted,
        backgroundCheckStatus: user.backgroundCheckStatus,
        verificationStatus: user.verificationStatus,
        nameMatchingStatus: user.nameMatchingStatus,
        verificationScore: user.verificationScore
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Verify wallet connection
exports.verifyWallet = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const user = await User.findById(req.user._id);

    if (user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).json({ 
        message: 'Wallet address does not match registered address' 
      });
    }

    res.json({ message: 'Wallet verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 

// Fetch all doctors
exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }, '_id name email specialization isVerified');
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify a doctor (admin only)
exports.verifyDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    doctor.isVerified = true;
    await doctor.save();
    
    res.json({ message: 'Doctor verified successfully', doctor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reject a doctor (admin only)
exports.rejectDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // You can either delete the doctor or mark them as rejected
    // For now, we'll just return a success message
    res.json({ message: 'Doctor rejected successfully', doctor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update background check status (admin only)
exports.updateBackgroundCheck = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid background check status' });
    }
    
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    doctor.backgroundCheckStatus = status;
    await doctor.save();
    
    res.json({ 
      message: 'Background check status updated successfully', 
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        backgroundCheckStatus: doctor.backgroundCheckStatus
      }
    });
  } catch (error) {
    console.error('Background check update error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create first admin user (one-time setup)
exports.createFirstAdmin = async (req, res) => {
  try {
    // Check if any admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ 
        message: 'Admin already exists. Cannot create another admin.' 
      });
    }

    const { name, email, password, walletAddress } = req.body;

    // Validate required fields
    if (!name || !email || !password || !walletAddress) {
      return res.status(400).json({ 
        message: 'All fields are required for admin creation' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'A user with this email already exists' 
      });
    }

    // Create admin user
    const admin = new User({
      name,
      email,
      password,
      role: 'admin',
      walletAddress,
      isVerified: true // Admin is auto-verified
    });

    await admin.save();

    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isVerified: admin.isVerified
      }
    });
  } catch (error) {
    console.error('Admin creation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all pending doctors for admin review
exports.getPendingDoctors = async (req, res) => {
  try {
    const pendingDoctors = await User.find({ 
      role: 'doctor', 
      isVerified: false 
    }, '_id name email specialization licenseNumber medicalBoard licenseExpiry governmentId mobileNumber profilePhoto profilePicture backgroundCheckStatus profileCompleted verificationStatus verificationResults lastVerificationDate nameMatchingStatus verificationScore createdAt');
    
    res.json(pendingDoctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all verified doctors
exports.getVerifiedDoctors = async (req, res) => {
  try {
    const verifiedDoctors = await User.find({ 
      role: 'doctor', 
      isVerified: true 
    }, '_id name email specialization licenseNumber medicalBoard licenseExpiry governmentId mobileNumber profilePhoto profilePicture backgroundCheckStatus profileCompleted verificationStatus verificationResults lastVerificationDate nameMatchingStatus verificationScore createdAt');
    
    res.json(verifiedDoctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload profile picture
exports.uploadProfilePicture = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check file size (5MB limit for profile pictures)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'File size exceeds 5MB limit' });
    }

    // Check file type (only images)
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Only image files are allowed' });
    }

    // Create form data for Pinata
    const formData = new FormData();
    formData.append('file', fs.createReadStream(file.path));

    // Upload to IPFS using Pinata
    const pinataResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxBodyLength: 'Infinity',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          'pinata_api_key': 'd3dfdbacd5131bdbb10b',
          'pinata_secret_api_key': '11f7384a1aa0b5f69b75a9042f77f93e7be42a38137abfae8364f4a0f3e36345'
        }
      }
    );

    // Update user profile with new picture
    const user = await User.findById(req.user._id);
    user.profilePicture = pinataResponse.data.IpfsHash;
    await user.save();

    // Clean up temporary file
    fs.unlinkSync(file.path);

    res.json({
      message: 'Profile picture uploaded successfully',
      profilePicture: user.profilePicture
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    
    // Clean up temporary file in case of error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting temporary file:', unlinkError);
      }
    }
    
    res.status(500).json({
      message: 'Error uploading profile picture',
      error: error.message
    });
  }
}; 

// Forgot Password: Send OTP to email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send OTP email
    try {
      const emailInfo = await sendEmail({
        to: user.email,
        subject: 'Your MedSecure Password Reset Code',
        text: `Hello ${user.name},\n\nYou requested to reset your password for your MedSecure account.\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this password reset, please ignore this email or contact support if you have concerns.\n\nBest regards,\nMedSecure Team`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">MedSecure</h1>
                        <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">Secure Medical Records Platform</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: 600;">Password Reset Request</h2>
                        <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">Hello ${user.name},</p>
                        <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.5;">We received a request to reset your password. Use the verification code below to proceed:</p>
                        
                        <!-- OTP Box -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 30px 0;">
                          <tr>
                            <td style="padding: 30px; background-color: #f8f9fa; border-radius: 8px; text-align: center; border: 2px dashed #667eea;">
                              <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                              <p style="margin: 0; color: #667eea; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.5;">
                          <strong>⏱️ This code will expire in 10 minutes.</strong>
                        </p>
                        
                        <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.5;">
                          If you didn't request this password reset, please ignore this email. Your account remains secure.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                        <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px; line-height: 1.5;">
                          This is an automated message from MedSecure. Please do not reply to this email.
                        </p>
                        <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                          © ${new Date().getFullYear()} MedSecure. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      });
      
      res.json({ 
        message: 'OTP sent successfully! Check your email inbox.',
        emailSent: true
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      res.status(500).json({ message: 'Failed to send OTP email. Please try again later.' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// Verify OTP and reset password
exports.verifyOTP = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ message: 'All fields are required' });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (!user.resetPasswordOTP || !user.resetPasswordOTPExpires) return res.status(400).json({ message: 'No OTP requested' });
  if (user.resetPasswordOTP !== otp) return res.status(400).json({ message: 'Invalid OTP' });
  if (user.resetPasswordOTPExpires < Date.now()) return res.status(400).json({ message: 'OTP expired' });

  user.password = newPassword;
  user.resetPasswordOTP = null;
  user.resetPasswordOTPExpires = null;
  await user.save();

  res.json({ message: 'Password reset successful' });
};

// Delete Account - Allow users to permanently delete their account
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!password) {
      return res.status(400).json({ 
        message: 'Password is required to delete your account' 
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Verify password before deletion
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(400).json({ 
        message: 'Incorrect password. Account deletion cancelled.' 
      });
    }

    // Check if user has any medical records that need to be handled
    const MedicalRecord = require('../models/MedicalRecord');
    const userRecords = await MedicalRecord.find({ patient: userId });
    
    if (userRecords.length > 0) {
      // For now, we'll prevent deletion if user has medical records
      // In a production system, you might want to anonymize or transfer records
      return res.status(400).json({ 
        message: 'Cannot delete account with existing medical records. Please contact support for assistance.',
        recordCount: userRecords.length
      });
    }

    // Log the deletion for audit purposes
    console.log(`Account deletion requested for user: ${user.email} (${user.role}) at ${new Date().toISOString()}`);

    // Delete the user account
    await User.findByIdAndDelete(userId);

    // Clear any uploaded profile pictures or temporary files
    if (user.profilePicture) {
      try {
        const path = require('path');
        const fs = require('fs');
        const filePath = path.join(__dirname, '../temp', user.profilePicture);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error('Error deleting profile picture:', error);
      }
    }

    res.json({ 
      message: 'Account successfully deleted. We\'re sorry to see you go.',
      deletedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      message: 'Error deleting account. Please try again later.',
      error: error.message 
    });
  }
}; 


// Verify email with OTP
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Check if OTP exists
    if (!user.emailVerificationOTP || !user.emailVerificationOTPExpires) {
      return res.status(400).json({ message: 'No verification OTP found. Please request a new one.' });
    }

    // Check if OTP matches
    if (user.emailVerificationOTP !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Check if OTP expired
    if (user.emailVerificationOTPExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationOTP = null;
    user.emailVerificationOTPExpires = null;
    
    // For patients, also mark account as verified
    if (user.role === 'patient') {
      user.isVerified = true;
    }

    await user.save();

    res.json({
      message: 'Email verified successfully!',
      emailVerified: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// Resend email verification OTP
exports.resendEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Generate new OTP
    const emailVerificationOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.emailVerificationOTP = emailVerificationOTP;
    user.emailVerificationOTPExpires = otpExpires;
    await user.save();

    // Send verification email
    try {
      await sendEmail({
        to: email,
        subject: 'Verify Your Email - MedSecure',
        text: `Your new email verification OTP is: ${emailVerificationOTP}\n\nThis OTP is valid for 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">MedSecure</h1>
            </div>
            <div style="padding: 30px; background-color: #f9fafb;">
              <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email Address</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Here's your new verification code:
              </p>
              <div style="background-color: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">Your Verification Code</p>
                <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                  ${emailVerificationOTP}
                </div>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                This code will expire in <strong>10 minutes</strong>.
              </p>
            </div>
            <div style="background-color: #1f2937; padding: 20px; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                © 2024 MedSecure. All rights reserved.
              </p>
            </div>
          </div>
        `
      });

      res.json({
        message: 'Verification email sent! Please check your inbox.',
        emailSent: true
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      res.status(500).json({ message: 'Failed to send verification email. Please try again later.' });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};


// Change email for unverified account
exports.changeUnverifiedEmail = async (req, res) => {
  try {
    const { oldEmail, newEmail } = req.body;

    if (!oldEmail || !newEmail) {
      return res.status(400).json({ message: 'Both old and new email addresses are required' });
    }

    if (oldEmail === newEmail) {
      return res.status(400).json({ message: 'New email must be different from current email' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Find the unverified user with old email
    const user = await User.findOne({ email: oldEmail });
    if (!user) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({ 
        message: 'Email already verified. Cannot change email for verified accounts. Please contact support.' 
      });
    }

    // Check if new email is already taken by another user
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      // Check if it's verified
      if (existingUser.emailVerified) {
        return res.status(400).json({ 
          message: 'This email is already registered and verified. Please use a different email or login.' 
        });
      } else {
        // Check if OTP expired for existing unverified account
        const otpExpired = !existingUser.emailVerificationOTPExpires || 
                          existingUser.emailVerificationOTPExpires < Date.now();
        
        if (otpExpired) {
          // Delete the expired unverified account
          await User.deleteOne({ _id: existingUser._id });
        } else {
          return res.status(400).json({ 
            message: 'This email is pending verification by another account. Please use a different email.' 
          });
        }
      }
    }

    // Generate new OTP
    const emailVerificationOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user email and OTP
    user.email = newEmail;
    user.emailVerificationOTP = emailVerificationOTP;
    user.emailVerificationOTPExpires = otpExpires;
    await user.save();

    // Send verification email to new address
    try {
      await sendEmail({
        to: newEmail,
        subject: 'Verify Your New Email - MedSecure',
        text: `Your email has been updated!\n\nYour new email verification OTP is: ${emailVerificationOTP}\n\nThis OTP is valid for 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">MedSecure</h1>
            </div>
            <div style="padding: 30px; background-color: #f9fafb;">
              <h2 style="color: #1f2937; margin-top: 0;">Email Address Updated</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Your email address has been successfully updated. Please verify your new email address to complete registration.
              </p>
              <div style="background-color: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">Your Verification Code</p>
                <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                  ${emailVerificationOTP}
                </div>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                This code will expire in <strong>10 minutes</strong>.
              </p>
              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #1e40af; margin: 0; font-size: 14px;">
                  <strong>Good News:</strong> All your registration details have been preserved. Only your email address was updated.
                </p>
              </div>
            </div>
            <div style="background-color: #1f2937; padding: 20px; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                © 2024 MedSecure. All rights reserved.
              </p>
            </div>
          </div>
        `
      });

      res.json({
        message: 'Email updated successfully! Please check your new email for the verification code.',
        newEmail: newEmail
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Revert email change if email fails
      user.email = oldEmail;
      await user.save();
      res.status(500).json({ message: 'Failed to send verification email to new address. Please try again.' });
    }
  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};
