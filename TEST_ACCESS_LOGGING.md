# Test Access Logging - Step by Step Guide

## Prerequisites
- Project is running (`npm run dev`)
- You have a doctor account and a patient account
- Patient has shared a record with the doctor

## Test Procedure

### Step 1: Hard Refresh Browser
**CRITICAL**: You must clear the JavaScript cache first!

**Windows/Linux**: Press `Ctrl + Shift + R` or `Ctrl + F5`
**Mac**: Press `Cmd + Shift + R`

You should see the VersionChecker banner if you had old code cached.

### Step 2: Login as Patient
1. Go to http://localhost:3000/login
2. Login with patient credentials
3. Go to "Access Logs" page
4. **Note the current number of access logs** (e.g., 45 logs)
5. Logout

### Step 3: Login as Doctor
1. Go to http://localhost:3000/login
2. Login with doctor credentials
3. Go to "Accessible Patient Records" page
4. Find a record that was shared with you
5. Click the **"View"** button
6. PDF should open in a new tab
7. Close the PDF tab
8. Logout

### Step 4: Verify Access Log Created
1. Login as the patient again
2. Go to "Access Logs" page
3. **Check if a new access log appeared**:
   - Should show doctor's name
   - Action: "View"
   - Timestamp: Just now
   - IP address: Your local IP

### Expected Results

#### ✅ SUCCESS - Access Log Created:
```
Access Logs (46)  ← Increased from 45

Recent Access:
- Dr. John Doe viewed your record "Lab Report"
  Time: Just now (2 seconds ago)
  IP: ::1 or 127.0.0.1
  Action: View
```

#### ❌ FAILURE - No New Log:
```
Access Logs (45)  ← Same as before

This means:
- Browser is still using cached JavaScript
- Try hard refresh again (Ctrl + Shift + R)
- Or clear browser cache completely
```

## Troubleshooting

### Issue: Access log count didn't increase
**Solution**: 
1. Hard refresh again (Ctrl + Shift + R)
2. Check browser console for errors (F12)
3. Check server logs for "PDF access request" message
4. Verify the API request was made to `/records/:recordId/pdf`

### Issue: "Access denied" error when viewing
**Solution**:
- This shouldn't happen for "View" button
- Check that doctor has access granted
- Check server logs for permission errors

### Issue: Download button shows "Access denied"
**Solution**:
- This is EXPECTED behavior
- Doctor has view-only permission (canDownload: false)
- This is a separate issue from access logging
- Access log should still be created for the download attempt

## Server Log Verification

Open the terminal where the server is running and look for these messages:

### When View button is clicked:
```
PDF access request: User 6916bdea7e70857ebb761d14 (doctor) requesting record 9d968ba6-b9b3-48e4-943d-b32d417cce91, action: view
Record found: Lab Report, IPFS Hash: QmfGtakRr...
Returning 46 access logs for record 9d968ba6-b9b3-48e4-943d-b32d417cce91
```

The access log count should increase by 1 each time.

### When Download button is clicked:
```
PDF access request: User 6916bdea7e70857ebb761d14 (doctor) requesting record 9d968ba6-b9b3-48e4-943d-b32d417cce91, action: download
Record found: Lab Report, IPFS Hash: QmfGtakRr...
Download denied for user 6916bdea7e70857ebb761d14 - view-only permission
```

Even though download is denied, the access log is still created.

## Browser Console Verification

Press F12 to open browser console and look for these messages:

### When View button is clicked:
```
Requesting PDF for record: 9d968ba6-b9b3-48e4-943d-b32d417cce91, action: view
PDF response received: {status: 200, contentType: "application/pdf", ...}
PDF fetched for access logging
```

### If you see this, it means the new code is loaded:
```
PDF was cached but refetched for access logging
```

### If you see this, it means old code is still cached:
```
Using cached PDF (no server request)
```

## Quick Test Commands

### Check current access log count:
1. Login as patient
2. Open browser console (F12)
3. Run:
```javascript
fetch('http://localhost:5000/api/records/YOUR-RECORD-ID', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => r.json())
.then(d => console.log('Access logs:', d.accessLogs.length))
```

### Force clear cache and reload:
1. Open browser console (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

## Success Criteria

✅ **Test PASSES if**:
- Hard refresh loads new code
- View button opens PDF
- Access log count increases by 1
- New log shows correct doctor, action, and timestamp
- Works in both normal mode and incognito mode

❌ **Test FAILS if**:
- Access log count doesn't increase
- No new log entry appears
- Only works in incognito mode
- Browser console shows "Using cached PDF"

## Additional Tests

### Test 1: Multiple Views
1. View the same record 3 times
2. Access log count should increase by 3
3. Should see 3 separate log entries

### Test 2: Different Records
1. View record A
2. View record B
3. Each record should have its own access log

### Test 3: Different Doctors
1. Share record with Doctor A and Doctor B
2. Have both doctors view the record
3. Should see 2 separate access logs

## Notes

- Access logs are created **immediately** when the PDF endpoint is called
- No delay or async processing
- Logs are stored in MongoDB in the `accessLogs` array
- Each log includes: doctor, timestamp, action, ipAddress, userAgent
- Logs are permanent and cannot be deleted by doctors
- Only the patient (record owner) can see their access logs

## Contact

If access logging still doesn't work after hard refresh:
1. Check that the fix is in the code (see BROWSER_CACHE_SOLUTION.md)
2. Verify server is running the latest code
3. Check for JavaScript errors in browser console
4. Check for server errors in terminal
5. Verify MongoDB is connected and accessible
