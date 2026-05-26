const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Cleanup unverified accounts with expired OTPs
 * This prevents email squatting and keeps the database clean
 */
async function cleanupUnverifiedAccounts() {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('⏸️  Skipping cleanup - MongoDB not connected');
      return 0;
    }

    const now = new Date();
    
    // Find and delete users who:
    // 1. Have NOT verified their email (emailVerified = false)
    // 2. Have an expired OTP (emailVerificationOTPExpires < now)
    const result = await User.deleteMany({
      emailVerified: false,
      emailVerificationOTPExpires: { $lt: now }
    });

    if (result.deletedCount > 0) {
      console.log(`✅ Cleaned up ${result.deletedCount} expired unverified account(s)`);
    }

    return result.deletedCount;
  } catch (error) {
    console.error('❌ Error cleaning up unverified accounts:', error.message);
    return 0;
  }
}

/**
 * Start automatic cleanup job
 * Runs every 5 minutes to clean up expired unverified accounts
 */
function startCleanupJob() {
  // Run immediately on startup
  cleanupUnverifiedAccounts();

  // Then run every 5 minutes
  setInterval(() => {
    cleanupUnverifiedAccounts();
  }, 5 * 60 * 1000); // 5 minutes

  console.log('🧹 Unverified accounts cleanup job started (runs every 5 minutes)');
}

module.exports = {
  cleanupUnverifiedAccounts,
  startCleanupJob
};
