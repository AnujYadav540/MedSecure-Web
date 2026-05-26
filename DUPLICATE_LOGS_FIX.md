# Duplicate Access Logs Fix

## Problem
When a doctor clicked "View" or "Download" once, **multiple duplicate log entries** were created in the patient's access log history. This was creating fake/inaccurate audit trails.

## Root Cause
The application was using TWO hooks that both fetched PDFs from the server:

1. **`usePDFPreload` hook** - Automatically preloads PDFs in the background when the DoctorRecords page loads
2. **`usePDFViewer` hook** - Fetches the PDF when the doctor explicitly clicks "View"

Both hooks called the server endpoint `/records/:recordId/pdf`, and each server call created an access log entry. So when a doctor clicked "View", they were actually triggering multiple server requests:
- Background preload requests (creating logs)
- Explicit view action (creating another log)

## Solution Implemented

### 1. Client-Side Changes

#### `client/src/services/api.js`
- Added `skipLog` parameter to `getPDF()` function
- When `skipLog=true`, the server will NOT create an access log entry
- When `skipLog=false` (default), the server WILL create an access log entry

```javascript
getPDF: async (recordId, action = 'view', skipLog = false) => {
  const response = await api.get(`/records/${recordId}/pdf`, {
    params: { 
      action,
      skipLog: skipLog ? 'true' : 'false', // Tell server whether to log
      _t: Date.now()
    },
    responseType: 'blob',
    timeout: 60000
  });
  return response.data;
}
```

#### `client/src/hooks/usePDFPreload.js`
- **Preload hook**: Now uses `skipLog=true` to prevent logging background preloads
- **View hook**: Uses `skipLog=false` to ensure explicit user actions ARE logged

```javascript
// Preload (background) - NO logging
const blob = await medicalRecordsApi.getPDF(recordId, 'view', true);

// View (explicit user action) - YES logging
const blob = await medicalRecordsApi.getPDF(recordId, 'view', false);
```

#### `client/src/pages/DoctorRecords.js`
- Download button now explicitly uses `skipLog=false` to ensure logging

```javascript
const blob = await medicalRecordsApi.getPDF(recordId, 'download', false);
```

### 2. Server-Side Changes

#### `server/src/controllers/medicalRecordController.js`
- Added `skipLog` parameter parsing from query string
- Modified logging logic to respect `skipLog` flag
- Only creates access log entries when `skipLog=false`

```javascript
const skipLog = req.query.skipLog === 'true';

// Log access ONLY if skipLog is false
if (req.user.role === 'doctor' && !skipLog) {
  console.log(`✅ Creating access log entry for doctor ${req.user._id}, action: ${action}`);
  
  record.accessLogs.push({
    doctor: req.user._id,
    timestamp: new Date(),
    action: action,
    ipAddress,
    userAgent
  });
  await record.save();
  
  // Send email notification if enabled
  // ...
} else if (skipLog) {
  console.log(`⏭️ Skipping access log for preload request (doctor ${req.user._id})`);
}
```

## Result

✅ **One doctor click = One log entry**
- Background preloads do NOT create log entries
- Only explicit View/Download button clicks create log entries
- Accurate audit trail showing actual doctor access
- No more fake/duplicate log history

## Testing

1. Login as a doctor
2. Navigate to "Accessible Patient Records"
3. Click "View" button once
4. Login as the patient who owns that record
5. Check "Access Logs" - should see **exactly ONE** log entry for that view action

## Files Modified

### Client-Side
- `client/src/services/api.js` - Added skipLog parameter
- `client/src/hooks/usePDFPreload.js` - Use skipLog=true for preloads
- `client/src/pages/DoctorRecords.js` - Use skipLog=false for explicit actions

### Server-Side
- `server/src/controllers/medicalRecordController.js` - Respect skipLog parameter

## Important Notes

- **Preloading still works** - PDFs are still cached in the background for faster viewing
- **Security maintained** - Access control checks still happen on every request
- **Audit trail accurate** - Only real user actions are logged
- **Email notifications** - Only sent for explicit actions, not preloads
