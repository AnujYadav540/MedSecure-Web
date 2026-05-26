# Testing Guide: Advanced Privacy Features

## Quick Start

**Server**: http://localhost:5001
**Client**: http://localhost:3000

---

## Test Scenario 1: Download Restrictions (View-Only Mode)

### Setup:
1. **Create Patient Account**
   - Go to http://localhost:3000/register
   - Register as Patient
   - Verify email with OTP

2. **Create Doctor Account**
   - Register as Doctor
   - Verify email with OTP
   - Wait for admin verification (or use admin panel)

3. **Upload Medical Record**
   - Login as Patient
   - Go to "My Medical Records"
   - Click "Upload New Record"
   - Upload a PDF file

### Test View-Only Access:
1. **Grant View-Only Access**
   - Click "Grant Access" button on the record
   - Enter doctor's email
   - **Enable "View-Only Mode" toggle** (should be blue/on)
   - Leave "Access Expiry" empty
   - Click "Grant Access"
   - ✅ Should see success message: "Access granted successfully! (View-only)"

2. **Test as Doctor**
   - Logout and login as Doctor
   - Go to "Accessible Records"
   - Click on the patient's record
   - Click "View PDF" → ✅ Should open PDF in new tab
   - Try to download PDF → ❌ Should show error: "Download not allowed. You have view-only access to this record."

3. **Check Access Logs**
   - Login as Patient
   - Go to record's "Access Logs"
   - ✅ Should see doctor's view attempt logged
   - ✅ Should see doctor's failed download attempt logged

### Test Download Access:
1. **Update Permissions**
   - As Patient, click "Grant Access" again
   - Enter same doctor's email
   - **Disable "View-Only Mode" toggle** (should be gray/off)
   - Click "Grant Access"
   - ✅ Should see: "Access granted successfully! (Download allowed)"

2. **Test as Doctor**
   - As Doctor, try to download PDF again
   - ✅ Should successfully download the file

---

## Test Scenario 2: Real-Time Email Notifications

### Setup:
1. **Enable Notifications**
   - Login as Patient
   - Go to a record's "Access Logs" page
   - Scroll to "Notification Settings" section
   - Click "Show Settings"
   - ✅ Ensure all toggles are enabled (blue):
     - Enable Notifications
     - Email on View
     - Email on Download
     - Email on Suspicious Activity

### Test View Notification:
1. **Doctor Views Record**
   - Login as Doctor (in incognito/different browser)
   - View the patient's record

2. **Check Patient Email**
   - Check email: medsecure.noreply@gmail.com (or patient's email)
   - ✅ Should receive email with subject: "Medical Record Accessed - [Record Title]"
   - ✅ Email should contain:
     - Doctor's name and specialization
     - Action: "viewed"
     - Timestamp
     - Link to access logs

### Test Download Notification:
1. **Doctor Downloads Record**
   - As Doctor, download the record (if permission granted)

2. **Check Patient Email**
   - ✅ Should receive email with action: "downloaded"

---

## Test Scenario 3: Sharing Detection Algorithms

### Test 1: Repeated Access Detection
1. **Access Record Multiple Times**
   - Login as Doctor
   - Access the same patient record 6 times quickly
   - (Click "View PDF" 6 times)

2. **Check Suspicious Activity**
   - Login as Patient
   - Go to record's "Access Logs"
   - ✅ Should see red "Suspicious Activity Detected" banner
   - ✅ Should show: "Repeated access to the same record (6 times in 24 hours)"
   - ✅ Severity: MEDIUM

### Test 2: Unauthorized Download Attempts
1. **Try to Download Without Permission**
   - Revoke download permission from doctor (view-only)
   - As Doctor, try to download 3+ times

2. **Check Suspicious Activity**
   - As Patient, check Access Logs
   - ✅ Should see: "Multiple unauthorized download attempts detected"
   - ✅ Severity: HIGH

### Test 3: Off-Hours Access
1. **Access During Off-Hours**
   - (If testing after 10 PM or before 6 AM)
   - As Doctor, access the record

2. **Check Suspicious Activity**
   - As Patient, check Access Logs
   - ✅ Should see: "Access during off-hours (outside 6 AM - 10 PM)"
   - ✅ Severity: LOW

---

## Test Scenario 4: Export Access Logs

### Test PDF Export:
1. **Generate Access Logs**
   - Ensure there are several access logs (view/download attempts)

2. **Export as PDF**
   - Login as Patient
   - Go to record's "Access Logs"
   - Scroll to "Export Access Logs" section
   - Click "Export PDF" button
   - ✅ Should download file: `access-logs-[recordId].pdf`

3. **Verify PDF Content**
   - Open the PDF file
   - ✅ Should contain:
     - MedSecure branding
     - Patient name and record title
     - Table with columns: Date/Time, Doctor, Action, IP Address, Device
     - All access log entries
     - Page numbers
     - Generation timestamp

### Test CSV Export:
1. **Export as CSV**
   - Click "Export CSV" button
   - ✅ Should download file: `access-logs-[recordId].csv`

2. **Verify CSV Content**
   - Open in Excel or text editor
   - ✅ Should contain headers: Timestamp, Doctor Name, Email, Specialization, Action, IP Address, User Agent
   - ✅ All access log entries in CSV format

---

## Test Scenario 5: Enhanced Access Log Display

### Verify Detailed Logging:
1. **View Access Logs**
   - Login as Patient
   - Go to record's "Access Logs"
   - Scroll to "Access History" section

2. **Check Log Details**
   - For each access log entry, verify:
     - ✅ Doctor name and email
     - ✅ Action badge (blue for view, green for download)
     - ✅ Timestamp (relative time: "5 minutes ago")
     - ✅ IP Address with globe icon
     - ✅ User Agent/Device info with device icon
     - ✅ Blockchain verification badge (if available)

---

## Test Scenario 6: Access Expiry

### Setup:
1. **Grant Temporary Access**
   - Login as Patient
   - Click "Grant Access" on a record
   - Enter doctor's email
   - Set "Access Expiry" to 5 minutes from now
   - Click "Grant Access"

### Test Before Expiry:
1. **Access Within Time Limit**
   - Login as Doctor immediately
   - ✅ Should be able to view the record

### Test After Expiry:
1. **Wait for Expiry**
   - Wait 5+ minutes

2. **Try to Access**
   - As Doctor, try to view the record
   - ❌ Should see error: "Your access to this record has expired"

---

## Test Scenario 7: Notification Settings

### Test Toggle Functionality:
1. **Access Notification Settings**
   - Login as Patient
   - Go to Access Logs
   - Click "Show Settings" in Notification Settings section

2. **Test Each Toggle**
   - Click "Enable Notifications" toggle
     - ✅ Should turn off (gray)
     - ✅ All other toggles should become disabled
   - Click again to re-enable
     - ✅ Should turn on (blue)
     - ✅ Other toggles should become enabled

3. **Test Individual Toggles**
   - Disable "Email on View"
     - ✅ Should turn off (gray)
     - ✅ Should show success toast
   - Have doctor view record
     - ✅ Should NOT receive email
   - Re-enable "Email on View"
     - ✅ Should turn on (green)

---

## Test Scenario 8: Statistics Cards

### Verify Statistics:
1. **Generate Activity**
   - Have multiple doctors access the record
   - Have same doctor access multiple times

2. **Check Statistics Cards**
   - Go to Access Logs
   - Verify statistics cards show:
     - ✅ **Total Accesses**: Correct count
     - ✅ **Unique Doctors**: Number of different doctors
     - ✅ **Most Active**: Doctor with most accesses + count
     - ✅ **Last Accessed**: Relative time of last access

---

## Common Issues & Solutions

### Issue: Email not received
**Solution**: 
- Check spam folder
- Verify email settings in `server/.env`
- Check server logs for email errors

### Issue: PDF export fails
**Solution**:
- Ensure `pdfkit` and `json2csv` are installed
- Run: `cd server && npm install pdfkit json2csv`

### Issue: Suspicious activity not detected
**Solution**:
- Ensure you meet the threshold (e.g., 6 accesses for repeated access)
- Check server logs for detection algorithm execution

### Issue: Download restriction not working
**Solution**:
- Verify permissions are set correctly in database
- Check browser console for error messages
- Verify backend is checking `canDownload` permission

---

## Verification Checklist

After testing, verify:
- ✅ View-only mode prevents downloads
- ✅ Download permission allows downloads
- ✅ Email notifications are sent for views/downloads
- ✅ Suspicious activities are detected and displayed
- ✅ PDF export generates correct file
- ✅ CSV export generates correct file
- ✅ Access logs show IP addresses and user agents
- ✅ Notification settings can be toggled
- ✅ Access expiry works correctly
- ✅ Statistics cards show accurate data

---

## Test Data Cleanup

After testing, you may want to:
1. Delete test medical records
2. Delete test user accounts
3. Clear access logs from database
4. Reset notification settings

---

**Happy Testing! 🎉**

If you encounter any issues, check:
- Server logs: `server/src/logs/`
- Browser console (F12)
- Network tab for API errors
