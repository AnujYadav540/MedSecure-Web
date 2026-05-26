const sendEmail = require('./sendEmail');

/**
 * Send email notification to patient when their record is accessed
 */
async function notifyPatientOnAccess(patient, doctor, record, action) {
  try {
    const actionText = {
      view: 'viewed',
      download: 'downloaded',
      share: 'shared',
      diagnose: 'diagnosed'
    }[action] || 'accessed';

    const actionColor = {
      view: '#3b82f6',
      download: '#10b981',
      share: '#8b5cf6',
      diagnose: '#f59e0b'
    }[action] || '#6b7280';

    const subject = `🔔 Your Medical Record Was ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, ${actionColor} 0%, #1e40af 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedSecure</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Access Notification</p>
        </div>
        
        <div style="padding: 30px; background-color: #f9fafb;">
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid ${actionColor};">
            <h2 style="color: #1f2937; margin-top: 0;">Record Access Alert</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Dr. <strong>${doctor.name}</strong> has ${actionText} your medical record.
            </p>
          </div>

          <div style="background-color: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #1f2937; margin-top: 0; font-size: 16px;">Record Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Record Title:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; font-size: 14px;">${record.title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Record Type:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; font-size: 14px;">${record.recordType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Action:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; font-size: 14px;">${actionText.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; font-size: 14px;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #1f2937; margin-top: 0; font-size: 16px;">Doctor Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Name:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; font-size: 14px;">Dr. ${doctor.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; font-size: 14px;">${doctor.email}</td>
              </tr>
              ${doctor.specialization ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Specialization:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; font-size: 14px;">${doctor.specialization}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              <strong>Your Privacy Matters:</strong> All access to your medical records is logged on the blockchain and cannot be tampered with. You can view the complete access history anytime in your MedSecure dashboard.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/patient/records/${record.recordId}/access-logs" 
               style="display: inline-block; padding: 12px 30px; background-color: ${actionColor}; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Access Logs
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; text-align: center;">
            This is an automated notification from MedSecure. To manage your notification preferences, visit your account settings.
          </p>
        </div>
        
        <div style="background-color: #1f2937; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 12px;">
            © 2024 MedSecure. All rights reserved.
          </p>
        </div>
      </div>
    `;

    const textContent = `
MedSecure - Access Notification

Dr. ${doctor.name} has ${actionText} your medical record.

Record Details:
- Title: ${record.title}
- Type: ${record.recordType}
- Action: ${actionText.toUpperCase()}
- Time: ${new Date().toLocaleString()}

Doctor Information:
- Name: Dr. ${doctor.name}
- Email: ${doctor.email}
${doctor.specialization ? `- Specialization: ${doctor.specialization}` : ''}

Your Privacy Matters: All access to your medical records is logged on the blockchain and cannot be tampered with.

View complete access history: ${process.env.CLIENT_URL || 'http://localhost:3000'}/patient/records/${record.recordId}/access-logs

---
This is an automated notification from MedSecure.
© 2024 MedSecure. All rights reserved.
    `;

    await sendEmail({
      to: patient.email,
      subject: subject,
      text: textContent,
      html: htmlContent
    });

    console.log(`✅ Access notification sent to ${patient.email} for ${action} by Dr. ${doctor.name}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send access notification:', error);
    return false;
  }
}

/**
 * Send email notification about suspicious sharing activity
 */
async function notifySuspiciousActivity(patient, doctor, record, activity) {
  try {
    const subject = `⚠️ Suspicious Activity Detected on Your Medical Record`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">⚠️ MedSecure Security Alert</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f9fafb;">
          <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
            <h2 style="color: #991b1b; margin-top: 0;">Suspicious Activity Detected</h2>
            <p style="color: #7f1d1d; font-size: 16px; line-height: 1.6;">
              Our system has detected potentially suspicious activity related to your medical record.
            </p>
          </div>

          <div style="background-color: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #1f2937; margin-top: 0; font-size: 16px;">Activity Details</h3>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
              ${activity.description}
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Record:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; font-size: 14px;">${record.title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Doctor:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; font-size: 14px;">Dr. ${doctor.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Detected:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; font-size: 14px;">${new Date().toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Severity:</td>
                <td style="padding: 8px 0; color: #ef4444; font-weight: 600; font-size: 14px;">${activity.severity.toUpperCase()}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Recommended Actions:</strong>
            </p>
            <ul style="color: #92400e; font-size: 14px; margin: 10px 0; padding-left: 20px;">
              <li>Review the access logs for this record</li>
              <li>Consider revoking access if unauthorized</li>
              <li>Contact support if you have concerns</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/patient/records/${record.recordId}/access-logs" 
               style="display: inline-block; padding: 12px 30px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 10px;">
              View Access Logs
            </a>
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/patient/records" 
               style="display: inline-block; padding: 12px 30px; background-color: #6b7280; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Manage Access
            </a>
          </div>
        </div>
        
        <div style="background-color: #1f2937; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 12px;">
            © 2024 MedSecure. All rights reserved.
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: patient.email,
      subject: subject,
      html: htmlContent
    });

    console.log(`⚠️ Suspicious activity notification sent to ${patient.email}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send suspicious activity notification:', error);
    return false;
  }
}

module.exports = {
  notifyPatientOnAccess,
  notifySuspiciousActivity
};
