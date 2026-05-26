# OTP Email Setup Guide

## Current Status: Development Mode ✅

Your application is now running in **development mode** where OTPs are displayed instead of being sent via email. This allows you to test the forgot password functionality without configuring email credentials.

## How It Works Now

### 1. **Request OTP**
- Go to "Forgot Password" page
- Enter your email address
- Click "Send OTP"

### 2. **View OTP**
The OTP will be shown in **THREE places**:
1. **Toast notification** (top-right corner) - Shows for 10 seconds
2. **Verify OTP page** - Yellow banner with the OTP
3. **Server console** - Check the terminal running the backend

### 3. **Use OTP**
- Copy the 6-digit OTP
- Enter it on the Verify OTP page
- Set your new password
- Done!

## Example Flow

```
1. Enter email: anuj.yadav26540@gmail.com
2. Click "Send OTP"
3. See toast: "OTP sent! (Dev Mode: 123456)"
4. On next page, see yellow banner with OTP
5. Enter OTP: 123456
6. Enter new password
7. Click "Reset Password"
```

## Server Console Output

When you request an OTP, you'll see this in the server console:

```
📧 ========== EMAIL (Development Mode) ==========
To: anuj.yadav26540@gmail.com
Subject: MedSecure Password Reset OTP
Text: Your OTP for password reset is: 123456. It is valid for 10 minutes.
================================================
```

## Setting Up Real Email (Optional)

If you want to send real emails, add these to `server/.env`:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### For Gmail:
1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Generate an "App Password"
4. Use that password in EMAIL_PASS

### Supported Email Services:
- Gmail
- Outlook
- Yahoo
- SendGrid
- Mailgun
- Any SMTP service

## Benefits of Development Mode

✅ **No email setup required** - Start testing immediately
✅ **Faster testing** - No waiting for emails
✅ **No email limits** - Test as many times as you want
✅ **Easy debugging** - See OTPs in console
✅ **Works offline** - No internet required for OTP

## Security Notes

⚠️ **Development mode is for testing only!**
- OTPs are visible in the UI and console
- Not suitable for production
- Configure real email before deploying

## Troubleshooting

### OTP Not Showing?
1. Check the toast notification (top-right)
2. Look at the yellow banner on Verify OTP page
3. Check server console logs

### OTP Expired?
- OTPs are valid for 10 minutes
- Request a new one if expired

### Wrong OTP?
- Make sure you're using the latest OTP
- Check for typos
- OTP is case-sensitive (numbers only)

## Production Setup Checklist

Before deploying to production:

- [ ] Add EMAIL_USER to .env
- [ ] Add EMAIL_PASS to .env
- [ ] Test email sending
- [ ] Remove development mode indicators
- [ ] Set up email monitoring
- [ ] Configure email rate limiting

---

**Current Mode:** Development (Email not configured)
**Status:** ✅ Working
**Last Updated:** January 31, 2026
