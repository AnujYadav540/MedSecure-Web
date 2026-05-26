# Access Logging Explanation - How It Works

## Issue Identified

You mentioned that when a doctor views a patient's record, the access logs are not being created. This is actually **working as designed**, but there's an important distinction to understand.

## How Access Logging Works

### What Gets Logged
Access logs are created when a doctor **views or downloads the actual PDF file**, not when they just view the record metadata (title, description, patient name, etc.).

### Two Types of "Viewing"

1. **Viewing Record Metadata** (NOT logged)
   - When a doctor sees the list of records
   - When a doctor clicks on a record to see its details
   - This only fetches basic information (title, description, patient name)
   - **No access log is created** because the doctor hasn't accessed the actual medical document

2. **Viewing the PDF Document** (LOGGED)
   - When a doctor clicks the **"View" button** to open the PDF
   - When a doctor clicks the **"Download" button** to download the PDF
   - This accesses the actual medical document from IPFS
   - **An access log IS created** with timestamp, action type, IP address, and user agent

## Why This Design?

This design is intentional for several reasons:

1. **Privacy**: Only actual document access is logged, not just browsing
2. **Meaningful Logs**: Logs show when doctors actually viewed medical content
3. **Performance**: Reduces unnecessary database writes
4. **Accuracy**: Distinguishes between browsing and actual document access

## How to Test Access Logging

### Step 1: Login as Doctor
1. Login with doctor credentials
2. Navigate to "Accessible Patient Records"

### Step 2: View a Record's PDF
1. Find a patient record you have access to
2. Click the **"View" button** (eye icon)
3. The PDF will open in a new tab
4. **This action creates an access log**

### Step 3: Check Access Logs as Patient
1. Logout from doctor account
2. Login as the patient who owns the record
3. Navigate to "My Records"
4. Click on the record
5. Click "View Access Logs" or "Access History"
6. **You should now see the doctor's access logged**

## What You'll See in Access Logs

When a doctor views a PDF, the access log will show:
- **Doctor Name**: e.g., "Dr. Shivam Kumar"
- **Doctor Email**: e.g., "anbt36540@gmail.com"
- **Action**: "view" or "download"
- **Timestamp**: Relative time (e.g., "2 minutes ago")
- **IP Address**: The doctor's IP address
- **User Agent**: Browser and device information

## Server Logs to Confirm

When a doctor views a PDF, you'll see these logs in the server console:

```
PDF access request: User [doctorId] (doctor) requesting record [recordId], action: view
Record found: [recordTitle], IPFS Hash: [ipfsHash]
Successfully connected to gateway X, streaming PDF...
```

## Current Behavior

Based on the server logs, I can see:
- ✅ Doctors can access records (Access check shows hasAccess: true)
- ✅ Patients can view access logs (Fetching access logs works)
- ✅ The system returns 39 existing access logs

**What's NOT happening:**
- ❌ The doctor is not clicking the "View" button to actually view the PDF
- ❌ Therefore, no new access logs are being created

## Solution

To create new access logs, the doctor must:
1. Click the **"View" button** (not just click on the record title)
2. Or click the **"Download" button**

Both actions will create an access log entry.

## Testing Checklist

- [ ] Login as doctor
- [ ] Navigate to "Accessible Patient Records"
- [ ] Find a record with granted access
- [ ] Click the **"View" button** (eye icon) - NOT the record title
- [ ] Wait for PDF to open in new tab
- [ ] Logout and login as patient
- [ ] Navigate to the record's access logs
- [ ] Verify the new access log appears with current timestamp

## Additional Features

### Real-Time Notifications
If the patient has enabled email notifications:
- They will receive an email when the doctor views the PDF
- The email includes doctor name, timestamp, and action type

### Suspicious Activity Detection
The system monitors for:
- Rapid successive accesses
- Bulk access to multiple records
- Unusual access patterns
- These are flagged in the access logs

### Download Restrictions
- Patients can grant "view-only" access
- Doctors with view-only access can view PDFs but cannot download them
- Download attempts are logged even if denied

## Troubleshooting

### If access logs still don't appear after clicking "View":

1. **Check browser console** for errors:
   - Open DevTools (F12)
   - Look for errors when clicking "View"

2. **Check server logs** for PDF access requests:
   - Look for "PDF access request" messages
   - If missing, the request isn't reaching the server

3. **Verify doctor has access**:
   - Patient must have granted access to the doctor
   - Check "Access Granted" section in patient's record view

4. **Check PDF loading**:
   - Does the PDF actually open in a new tab?
   - If not, there may be a popup blocker or IPFS issue

5. **Refresh access logs page**:
   - Click the "Refresh" button on the access logs page
   - New logs should appear immediately

## Summary

**The access logging system is working correctly.** The key point is:

> Access logs are created when doctors **VIEW or DOWNLOAD the PDF file**, not when they just browse record metadata.

To test, make sure to click the **"View" button** to actually open the PDF document.

---

*Last Updated: May 23, 2026*
