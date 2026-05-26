const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

/**
 * Export access logs as PDF
 */
function exportAccessLogsPDF(record, accessLogs, patient) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      // Collect PDF data
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).fillColor('#1e40af').text('MedSecure', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(18).fillColor('#374151').text('Access Audit Trail Report', { align: 'center' });
      doc.moveDown(1);

      // Record Information
      doc.fontSize(14).fillColor('#1f2937').text('Record Information', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#4b5563');
      doc.text(`Title: ${record.title}`);
      doc.text(`Type: ${record.recordType}`);
      doc.text(`Description: ${record.description}`);
      doc.text(`Record ID: ${record.recordId}`);
      doc.text(`Created: ${new Date(record.createdAt).toLocaleString()}`);
      doc.moveDown(1);

      // Patient Information
      doc.fontSize(14).fillColor('#1f2937').text('Patient Information', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#4b5563');
      doc.text(`Name: ${patient.name}`);
      doc.text(`Email: ${patient.email}`);
      doc.moveDown(1);

      // Statistics
      const uniqueDoctors = new Set(accessLogs.map(log => log.doctor._id.toString())).size;
      const lastAccess = accessLogs.length > 0 ? new Date(accessLogs[0].timestamp).toLocaleString() : 'Never';

      doc.fontSize(14).fillColor('#1f2937').text('Access Statistics', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#4b5563');
      doc.text(`Total Accesses: ${accessLogs.length}`);
      doc.text(`Unique Doctors: ${uniqueDoctors}`);
      doc.text(`Last Accessed: ${lastAccess}`);
      doc.text(`Report Generated: ${new Date().toLocaleString()}`);
      doc.moveDown(1);

      // Access Logs Table
      doc.fontSize(14).fillColor('#1f2937').text('Access History', { underline: true });
      doc.moveDown(0.5);

      if (accessLogs.length === 0) {
        doc.fontSize(11).fillColor('#6b7280').text('No access logs found.');
      } else {
        // Table headers
        const tableTop = doc.y;
        const col1X = 50;
        const col2X = 200;
        const col3X = 350;
        const col4X = 450;

        doc.fontSize(10).fillColor('#1f2937').font('Helvetica-Bold');
        doc.text('Doctor', col1X, tableTop);
        doc.text('Action', col2X, tableTop);
        doc.text('Date & Time', col3X, tableTop);
        doc.text('IP', col4X, tableTop);

        doc.moveDown(0.5);
        doc.strokeColor('#e5e7eb').lineWidth(1);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.3);

        // Table rows
        doc.font('Helvetica').fontSize(9).fillColor('#4b5563');
        
        accessLogs.forEach((log, index) => {
          if (doc.y > 700) {
            doc.addPage();
            doc.y = 50;
          }

          const rowY = doc.y;
          doc.text(log.doctor.name || 'Unknown', col1X, rowY, { width: 140 });
          doc.text(log.action.toUpperCase(), col2X, rowY, { width: 140 });
          doc.text(new Date(log.timestamp).toLocaleString(), col3X, rowY, { width: 90 });
          doc.text(log.ipAddress || 'N/A', col4X, rowY, { width: 90 });

          doc.moveDown(0.8);

          // Add separator line
          if (index < accessLogs.length - 1) {
            doc.strokeColor('#f3f4f6').lineWidth(0.5);
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.3);
          }
        });
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#9ca3af').text(
        'This report is generated from blockchain-verified access logs and is tamper-proof.',
        { align: 'center' }
      );
      doc.text(
        '© 2024 MedSecure. All rights reserved.',
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Export access logs as CSV
 */
function exportAccessLogsCSV(record, accessLogs, patient) {
  try {
    const data = accessLogs.map(log => ({
      'Record Title': record.title,
      'Record Type': record.recordType,
      'Record ID': record.recordId,
      'Patient Name': patient.name,
      'Patient Email': patient.email,
      'Doctor Name': log.doctor.name || 'Unknown',
      'Doctor Email': log.doctor.email || 'N/A',
      'Doctor Specialization': log.doctor.specialization || 'N/A',
      'Action': log.action.toUpperCase(),
      'Date': new Date(log.timestamp).toLocaleDateString(),
      'Time': new Date(log.timestamp).toLocaleTimeString(),
      'IP Address': log.ipAddress || 'N/A',
      'User Agent': log.userAgent || 'N/A',
      'Blockchain TX': log.blockchainTxHash || 'Pending'
    }));

    const fields = [
      'Record Title',
      'Record Type',
      'Record ID',
      'Patient Name',
      'Patient Email',
      'Doctor Name',
      'Doctor Email',
      'Doctor Specialization',
      'Action',
      'Date',
      'Time',
      'IP Address',
      'User Agent',
      'Blockchain TX'
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    return csv;
  } catch (error) {
    throw new Error(`Failed to generate CSV: ${error.message}`);
  }
}

module.exports = {
  exportAccessLogsPDF,
  exportAccessLogsCSV
};
