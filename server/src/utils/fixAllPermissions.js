const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medsecure', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const MedicalRecord = require('../models/MedicalRecord');

async function fixAllPermissions() {
  try {
    console.log('🔧 Fixing all permissions...');

    // Update all medical records to grant both view and download permissions
    const result = await MedicalRecord.updateMany(
      { 'accessGranted.doctor': { $exists: true } },
      { 
        $set: { 
          'accessGranted.$[].permissions.canView': true,
          'accessGranted.$[].permissions.canDownload': true
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} records`);
    console.log('✅ All doctors now have view AND download permission');

    // Verify
    const records = await MedicalRecord.find({ 'accessGranted.doctor': { $exists: true } })
      .select('title recordId accessGranted')
      .lean();

    console.log('\n📋 Verification:');
    records.forEach(record => {
      console.log(`\n📄 ${record.title} (${record.recordId})`);
      record.accessGranted.forEach((access, index) => {
        console.log(`   Doctor ${index + 1}: canView=${access.permissions?.canView}, canDownload=${access.permissions?.canDownload}`);
      });
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAllPermissions();
