/**
 * Sharing Detection System
 * Detects suspicious patterns that may indicate unauthorized sharing of medical records
 */

/**
 * Detect if a doctor is accessing records from multiple locations/devices rapidly
 */
function detectRapidLocationChange(accessLogs, doctorId, currentIp) {
  try {
    // Get recent accesses by this doctor (last 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAccesses = accessLogs.filter(log => 
      log.doctor.toString() === doctorId.toString() &&
      log.timestamp > oneHourAgo &&
      log.ipAddress
    );

    if (recentAccesses.length < 2) return null;

    // Check for different IP addresses
    const uniqueIps = new Set(recentAccesses.map(log => log.ipAddress));
    
    if (uniqueIps.size > 1 && uniqueIps.has(currentIp)) {
      return {
        type: 'rapid_location_change',
        description: `Access from multiple IP addresses within 1 hour. Previous IPs: ${Array.from(uniqueIps).filter(ip => ip !== currentIp).join(', ')}`,
        severity: 'high',
        evidence: {
          ipAddresses: Array.from(uniqueIps),
          accessCount: recentAccesses.length,
          timeWindow: '1 hour'
        }
      };
    }

    return null;
  } catch (error) {
    console.error('Error in detectRapidLocationChange:', error);
    return null;
  }
}

/**
 * Detect unusual access patterns (e.g., accessing many records in short time)
 */
function detectBulkAccess(allRecordsAccessLogs, doctorId) {
  try {
    // Get accesses in last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    let recentAccessCount = 0;
    allRecordsAccessLogs.forEach(recordLogs => {
      const doctorAccesses = recordLogs.filter(log =>
        log.doctor.toString() === doctorId.toString() &&
        log.timestamp > tenMinutesAgo
      );
      recentAccessCount += doctorAccesses.length;
    });

    // If doctor accessed more than 10 records in 10 minutes, flag it
    if (recentAccessCount > 10) {
      return {
        type: 'bulk_access',
        description: `Accessed ${recentAccessCount} records within 10 minutes, which may indicate bulk downloading or sharing`,
        severity: 'high',
        evidence: {
          accessCount: recentAccessCount,
          timeWindow: '10 minutes'
        }
      };
    }

    return null;
  } catch (error) {
    console.error('Error in detectBulkAccess:', error);
    return null;
  }
}

/**
 * Detect if download action is attempted when permission is not granted
 */
function detectUnauthorizedDownload(accessGranted, doctorId, action) {
  try {
    if (action !== 'download') return null;

    const doctorAccess = accessGranted.find(access => 
      access.doctor.toString() === doctorId.toString()
    );

    if (!doctorAccess) {
      return {
        type: 'unauthorized_download',
        description: 'Attempted to download record without access permission',
        severity: 'high',
        evidence: {
          action: 'download',
          hasAccess: false
        }
      };
    }

    if (!doctorAccess.permissions || !doctorAccess.permissions.canDownload) {
      return {
        type: 'unauthorized_download',
        description: 'Attempted to download record with view-only permission',
        severity: 'high',
        evidence: {
          action: 'download',
          permission: 'view-only'
        }
      };
    }

    return null;
  } catch (error) {
    console.error('Error in detectUnauthorizedDownload:', error);
    return null;
  }
}

/**
 * Detect access outside normal working hours
 */
function detectOffHoursAccess(timestamp) {
  try {
    const hour = timestamp.getHours();
    const day = timestamp.getDay();

    // Flag if access is between 11 PM and 6 AM or on weekends
    const isNightTime = hour >= 23 || hour < 6;
    const isWeekend = day === 0 || day === 6;

    if (isNightTime || isWeekend) {
      return {
        type: 'off_hours_access',
        description: `Record accessed during ${isNightTime ? 'night hours' : 'weekend'}, which is unusual for medical professionals`,
        severity: 'medium',
        evidence: {
          hour: hour,
          day: day,
          isNightTime: isNightTime,
          isWeekend: isWeekend
        }
      };
    }

    return null;
  } catch (error) {
    console.error('Error in detectOffHoursAccess:', error);
    return null;
  }
}

/**
 * Detect if same record is accessed multiple times in short period
 */
function detectRepeatedAccess(accessLogs, doctorId) {
  try {
    // Get accesses by this doctor in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentAccesses = accessLogs.filter(log =>
      log.doctor.toString() === doctorId.toString() &&
      log.timestamp > fiveMinutesAgo
    );

    // If accessed more than 5 times in 5 minutes, flag it
    if (recentAccesses.length > 5) {
      return {
        type: 'repeated_access',
        description: `Record accessed ${recentAccesses.length} times within 5 minutes, which may indicate automated scraping or sharing`,
        severity: 'medium',
        evidence: {
          accessCount: recentAccesses.length,
          timeWindow: '5 minutes'
        }
      };
    }

    return null;
  } catch (error) {
    console.error('Error in detectRepeatedAccess:', error);
    return null;
  }
}

/**
 * Main function to run all detection algorithms
 */
async function detectSuspiciousActivity(record, doctorId, action, ipAddress, allRecordsAccessLogs = []) {
  const suspiciousActivities = [];

  // Run all detection algorithms
  const rapidLocationChange = detectRapidLocationChange(record.accessLogs, doctorId, ipAddress);
  if (rapidLocationChange) suspiciousActivities.push(rapidLocationChange);

  const bulkAccess = detectBulkAccess(allRecordsAccessLogs, doctorId);
  if (bulkAccess) suspiciousActivities.push(bulkAccess);

  const unauthorizedDownload = detectUnauthorizedDownload(record.accessGranted, doctorId, action);
  if (unauthorizedDownload) suspiciousActivities.push(unauthorizedDownload);

  const offHoursAccess = detectOffHoursAccess(new Date());
  if (offHoursAccess) suspiciousActivities.push(offHoursAccess);

  const repeatedAccess = detectRepeatedAccess(record.accessLogs, doctorId);
  if (repeatedAccess) suspiciousActivities.push(repeatedAccess);

  return suspiciousActivities;
}

module.exports = {
  detectSuspiciousActivity,
  detectRapidLocationChange,
  detectBulkAccess,
  detectUnauthorizedDownload,
  detectOffHoursAccess,
  detectRepeatedAccess
};
