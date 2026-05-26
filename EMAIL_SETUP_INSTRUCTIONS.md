# 📧 Email Setup Instructions for OTP

## Current Status
✅ Code is ready and secure - OTPs will NOT be shown on screen
⏳ Waiting for email configuration to send real emails

## What You Need to Do

### Option 1: Quick Setup with Gmail (Recommended - 5 minutes)

#### Step 1: Enable 2-Step Verification
1. Go to: https://myaccount.google.com/signinoptions/two-step-verification
2. Click "Get Started"
3. Follow the prompts to enable 2-Step Verification
4. Use your phone number to receive verification codes

#### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. You might need to sign in again
3. Under "Select app" choose: **Mail**
4. Under "Select device" choose: **Windows Computer** (or "Other" and type "MedSecure")
5. Click **Generate**
6. You'll see a 16-character password like: `abcd efgh ijkl mnop`
7. **Copy this password** (you'll only see it once!)

#### Step 3: Update Configuration
Open the file: `MedSecure/server/.env`

Find these lines:
```env
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-16-char-app-password
```

Remove the `#` and add your details:
```env
EMAIL_USER=anuj.yadav26540@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
```
(Replace with your actual app password - no spaces!)

#### Step 4: Restart Server
The server will automatically restart and detect the email configuration.

---

### Option 2: Use a Different Email Service

If you don't want to use Gmail, you can use:

#### SendGrid (Free: 100 emails/day)
1. Sign up at: https://sendgrid.com/
2. Get your API key
3. Update `server/src/utils/sendEmail.js` with SendGrid configuration

#### Mailgun (Free: 5,000 emails/month)
1. Sign up at: https://www.mailgun.com/
2. Get your API key and domain
3. Update `server/src/utils/sendEmail.js` with Mailgun configuration

#### Brevo/Sendinblue (Free: 300 emails/day)
1. Sign up at: https://www.brevo.com/
2. Get your SMTP credentials
3. Update `.env` with Brevo SMTP settings

---

## How It Works After Setup

### 1. User Requests Password Reset
- User goes to "Forgot Password"
- Enters their email: `anuj.yadav26540@gmail.com`
- Clicks "Send OTP"

### 2. System Sends Email
- Server generates a random 6-digit OTP
- Sends professional email to user's Gmail
- OTP is valid for 10 minutes

### 3. User Receives Email
```
Subject: MedSecure Password Reset OTP

You requested to reset your password. Use the OTP below:

┌─────────┐
│ 123456  │
└─────────┘

This OTP is valid for 10 minutes.
```

### 4. User Resets Password
- User enters the OTP from their email
- Sets new password for MedSecure platform
- Can now login with new password

---

## Security Features

✅ **OTP NOT shown on screen** - Only sent to email
✅ **OTP NOT in API response** - Secure transmission
✅ **OTP expires in 10 minutes** - Time-limited
✅ **One-time use** - OTP deleted after successful reset
✅ **Email verification** - Confirms user owns the email

---

## Testing Without Email (Development Mode)

If you haven't configured email yet:
- OTP will be logged in the **server console only**
- Look for: `🔐 ========== OTP FOR TESTING ==========`
- This is for testing only - NOT secure for production!

---

## Troubleshooting

### "Failed to send OTP"
- Check if EMAIL_USER and EMAIL_PASS are set in `.env`
- Make sure there are no spaces in the app password
- Verify 2-Step Verification is enabled on Gmail

### "Invalid credentials"
- You might be using your regular Gmail password
- You need an **App Password**, not your regular password
- Generate a new app password if needed

### "Less secure app access"
- Gmail no longer supports this
- You MUST use App Passwords with 2-Step Verification

### Email not arriving
- Check spam/junk folder
- Wait 1-2 minutes (sometimes delayed)
- Try generating a new OTP
- Check server console for errors

---

## Important Notes

⚠️ **App Password vs Regular Password**
- App passwords are special passwords for apps
- They're NOT your regular Gmail password
- They can be revoked anytime without affecting your Gmail
- They only allow sending emails, nothing else

⚠️ **Security**
- Never share your app password publicly
- Store it only in the `.env` file
- The `.env` file is in `.gitignore` (not uploaded to GitHub)
- You can revoke and regenerate app passwords anytime

⚠️ **Production Deployment**
- Use environment variables on your hosting platform
- Don't commit `.env` file to version control
- Consider using a dedicated email service (SendGrid, Mailgun)
- Monitor email sending limits

---

## Quick Reference

**Gmail App Password URL:**
https://myaccount.google.com/apppasswords

**Configuration File:**
`MedSecure/server/.env`

**Required Variables:**
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**Test the Feature:**
1. Go to: http://localhost:3000/forgot-password
2. Enter your email
3. Check your Gmail inbox
4. Use the OTP to reset password

---

Need help? Check the server console for detailed error messages!
