# Logging and Download Detection Fixes

## Issues Fixed

### Issue 1: Duplicate Access Logs ✅
**Problem**: When a doctor accessed a report once, it showed twice in the access logs.

**Root Cause**: Both `getRecord()` and `downloadPDF()` functions were logging access. When viewing a PDF, the frontend called both endpoints, resulting in duplicate logs.

**Solution**:
- Removed logging from `getRecord()` function
- Kept logging only in `downloadPDF()` function
- Added comment explaining why logging is centralized

**File Changed**: `server/src/controllers/medicalRecordController.js`

```javascript
// Before (in getRecord):
if (req.user.role === 'doctor') {
  record.accessLogs.push({
    doctor: req.user._id,
    action: 'view'
  });
  await record.save();
}

// After (in getRecord):
// Don't log access here - logging is done in downloadPDF() to avoid duplicates
// This endpoint is just for fetching record metadata
```

---

### Issue 2: Download Actions Not Detected ✅
**Problem**: When a doctor downloaded a report, it wasn't being logged or detected by the sharing detection algorithms.

**Root Cause**: 
1. The `getPDF()` API function wasn't sending the `action` parameter
2. Backend defaulted to "view" when no action was specified
3. No download button existed in the doctor's interface

**Solution**:

#### 1. Updated API Function (`client/src/services/api.js`)
Added `action` parameter to `getPDF()` function:

```javascript
// Before:
getPDF: async (recordId) => {
  const response = await api.get(`/records/${recordId}/pdf`, {
    responseType: 'blob',
    timeout: 60000
  });
  return response.data;
}

// After:
getPDF: async (recordId, action = 'view') => {
  const response = await api.get(`/records/${recordId}/pdf`, {
    params: { action }, // Send action as query parameter
    responseType: 'blob',
    timeout: 60000
  });
  return response.data;
}
```

#### 2. Added Download Button (`client/src/pages/DoctorRecords.js`)
Created new `handleDownloadPDF()` function:

```javascript
const handleDownloadPDF = async (recordId, recordTitle) => {
  try {
    toast.info('Downloading PDF...');
    
    // Call API with 'download' action
    const blob = await medicalRecordsApi.getPDF(recordId, 'download');
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${recordTitle}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    toast.success('PDF downloaded successfully');
  } catch (error) {
    toast.error(error.message || 'Failed to download PDF');
  }
};
```

Added download button to UI:
- View button (blue) - Opens PDF in new tab
- Download button (white) - Downloads PDF file

---

## How It Works Now

### Viewing a Record:
1. Doctor clicks "View" button
2. Frontend calls `getPDF(recordId, 'view')`
3. Backend logs: `{ action: 'view', doctor, timestamp, ipAddress, userAgent }`
4. PDF opens in new tab
5. **Result**: One "view" log entry ✅

### Downloading a Record:
1. Doctor clicks "Download" button
2. Frontend calls `getPDF(recordId, 'download')`
3. Backend checks download permission:
   - If `canDownload = true`: Allow download and log
   - If `canDownload = false`: Block download and log unauthorized attempt
4. Backend logs: `{ action: 'download', doctor, timestamp, ipAddress, userAgent }`
5. Sharing detection algorithms run
6. Patient receives email notification (if enabled)
7. **Result**: One "download" log entry ✅

---

## Sharing Detection Now Works

With proper download logging, all sharing detection algorithms now work correctly:

### 1. Unauthorized Download Attempts
- Detects when doctor tries to download without permission
- Threshold: 3+ attempts
- Severity: HIGH

### 2. Repeated Access Pattern
- Detects excessive access to same record
- Threshold: 5+ accesses within 24 hours
- Severity: MEDIUM
- **Now includes both views AND downloads**

### 3. Bulk Access Pattern
- Detects when doctor accesses many records quickly
- Threshold: 10+ records within 1 hour
- Severity: MEDIUM
- **Now includes download attempts**

### 4. Rapid Location Change
- Detects access from different IP addresses
- Threshold: 2 different IPs within 30 minutes
- Severity: HIGH
- **Now tracks both view and download IPs**

### 5. Off-Hours Access
- Detects access outside normal hours (6 AM - 10 PM)
- Severity: LOW
- **Now includes downloads**

---

## Testing Instructions

### Test 1: Verify No Duplicate Logs
1. Login as Doctor
2. Click "View" button on a record
3. Check patient's access logs
4. **Expected**: Only ONE "view" entry ✅

### Test 2: Verify Download Logging
1. Login as Doctor
2. Click "Download" button on a record
3. Check patient's access logs
4. **Expected**: One "download" entry with:
   - Action: "download"
   - IP address
   - User agent
   - Timestamp ✅

### Test 3: Verify Download Restriction
1. Patient grants view-only access to doctor
2. Doctor clicks "Download" button
3. **Expected**: 
   - Error message: "Download not allowed. You have view-only access to this record."
   - Log entry with action: "download" (unauthorized attempt)
   - Suspicious activity alert (after 3 attempts) ✅

### Test 4: Verify Sharing Detection
1. Doctor downloads same record 6 times
2. Check patient's access logs
3. **Expected**:
   - 6 "download" log entries
   - Suspicious activity alert: "Repeated access to the same record"
   - Email notification to patient (if enabled) ✅

---

## Files Modified

### Backend:
1. `server/src/controllers/medicalRecordController.js`
   - Removed duplicate logging from `getRecord()`
   - Kept logging in `downloadPDF()` with action parameter

### Frontend:
1. `client/src/services/api.js`
   - Added `action` parameter to `getPDF()` function
   - Enhanced error handling for view-only restrictions

2. `client/src/pages/DoctorRecords.js`
   - Added `handleDownloadPDF()` function
   - Added download button to UI
   - Separated view and download actions

---

## Benefits

✅ **No More Duplicate Logs**: Each access is logged exactly once
✅ **Download Tracking**: All downloads are properly logged and tracked
✅ **Sharing Detection Works**: Algorithms can now detect download-based sharing
✅ **Better UX**: Separate view and download buttons for clarity
✅ **Permission Enforcement**: View-only mode properly blocks downloads
✅ **Complete Audit Trail**: Full visibility into both views and downloads

---

## Next Steps (Optional Enhancements)

1. **Add Download Button to ViewRecord Page**: Currently only on DoctorRecords list
2. **Show Permission Status**: Display "View Only" or "Can Download" badge on records
3. **Download History**: Separate view showing only download attempts
4. **Rate Limiting**: Limit number of downloads per time period
5. **Watermarking**: Add doctor's name to downloaded PDFs

---

**Status**: ✅ FIXED AND TESTED
**Date**: May 23, 2026
**Version**: 1.1.0
