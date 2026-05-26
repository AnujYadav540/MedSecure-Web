const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medsecure', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const MedicalRecord = require('../models/MedicalRecord');

async function grantDownloadPermission() {
  try {
    console.log('🔧 Granting download permission to all doctors...');

    // Update all medical records to grant download permission to all doctors who have access
    const result = await MedicalRecord.updateMany(
      { 'accessGranted.doctor': { $exists: true } },
      { 
        $set: { 
          'accessGranted.$[].permissions.canDownload': true 
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} records`);
    console.log('✅ All doctors now have download permission');

    // Verify the update
    const records = await MedicalRecord.find({ 'accessGranted.doctor': { $exists: true } })
      .populate('accessGranted.doctor', 'name email')
      .select('title accessGranted');

    console.log('\n📋 Updated Records:');
    records.forEach(record => {
      console.log(`\nRecord: ${record.title}`);
      record.accessGranted.forEach(access => {
        console.log(`  - Doctor: ${access.doctor.name} (${access.doctor.email})`);
        console.log(`    canView: ${access.permissions.canView}`);
        console.log(`    canDownload: ${access.permissions.canDownload}`);
      });
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
grantDownloadPermission();
