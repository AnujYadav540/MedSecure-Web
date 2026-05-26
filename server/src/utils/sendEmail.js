const nodemailer = require('nodemailer');

// Check if email credentials are configured
const isEmailConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;

// Configure email transporter
let transporter;
let testAccount = null;

async function initializeTransporter() {
  if (isEmailConfigured) {
    // Real email configuration
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log('✅ Email configured with Gmail');
  } else {
    // Development mode: Create test account with Ethereal
    try {
      testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('⚠️  Using test email service (Ethereal)');
      console.log('📧 Emails will be captured at: https://ethereal.email');
    } catch (error) {
      console.error('Failed to create test email account:', error);
    }
  }
}

// Initialize on module load
initializeTransporter();

async function sendEmail({ to, subject, text, html }) {
  // Ensure transporter is initialized
  if (!transporter) {
    await initializeTransporter();
  }

  // If still no transporter, log to console
  if (!transporter) {
    console.log('\n📧 ========== EMAIL (Console Mode) ==========');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text}`);
    console.log('============================================\n');
    
    return {
      accepted: [to],
      rejected: [],
      messageId: 'console-mode-' + Date.now()
    };
  }

  const mailOptions = {
    from: isEmailConfigured 
      ? `"MedSecure - Medical Records" <${process.env.EMAIL_USER}>` 
      : testAccount.user,
    to,
    subject,
    text,
    html,
    // Add headers to improve deliverability
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high',
      'X-Mailer': 'MedSecure Medical Platform',
      'Reply-To': process.env.EMAIL_USER || testAccount.user
    }
  };
  
  const info = await transporter.sendMail(mailOptions);
  
  // If using test account, log the preview URL
  if (testAccount) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('\n📧 ========== TEST EMAIL SENT ==========');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Preview URL: ${previewUrl}`);
    console.log(`Copy this URL to see the email!`);
    console.log('========================================\n');
  }
  
  return info;
}

module.exports = sendEmail;