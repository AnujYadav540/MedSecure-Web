import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

export default function AccessAuditTrail({ recordId, recordTitle }) {
  const [accessLogs, setAccessLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suspiciousActivities, setSuspiciousActivities] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    emailOnAccess: true,
    emailOnDownload: true,
    emailOnShare: true
  });
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [stats, setStats] = useState({
    totalAccesses: 0,
    uniqueDoctors: 0,
    lastAccessed: null,
    mostActiveDoctor: null
  });

  useEffect(() => {
    fetchAccessLogs();
    fetchSuspiciousActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const fetchAccessLogs = async () => {
    try {
      setLoading(true);
      console.log(`Fetching access logs for record: ${recordId}`);
      
      const response = await api.get(`/medical-records/${recordId}/access-logs`);
      console.log('Access logs response:', response.data);
      
      const logs = response.data.accessLogs || [];
      console.log(`Received ${logs.length} access logs`);
      
      // Validate and clean logs
      const validLogs = logs.filter(log => {
        if (!log.timestamp) {
          console.warn('Log entry missing timestamp:', log);
          return false;
        }
        if (!log.doctor) {
          console.warn('Log entry missing doctor:', log);
          return false;
        }
        return true;
      });
      
      console.log(`${validLogs.length} valid logs after filtering`);
      setAccessLogs(validLogs);
      calculateStats(validLogs);
    } catch (error) {
      console.error('Error fetching access logs:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error('Failed to load access logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuspiciousActivities = async () => {
    try {
      // Fetch the full record to get suspicious activities
      const response = await api.get(`/records/${recordId}`);
      const record = response.data;
      
      if (record.sharingDetection && record.sharingDetection.suspiciousActivities) {
        setSuspiciousActivities(record.sharingDetection.suspiciousActivities);
      }
      
      // Also fetch notification settings from the record
      if (record.accessNotifications) {
        setNotificationSettings(record.accessNotifications);
      }
    } catch (error) {
      console.error('Error fetching suspicious activities:', error);
    }
  };

  const handleUpdateNotificationSettings = async (newSettings) => {
    try {
      await api.put(`/medical-records/${recordId}/notifications`, newSettings);
      setNotificationSettings(newSettings);
      toast.success('Notification settings updated successfully');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to update notification settings');
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      const response = await api.get(`/medical-records/${recordId}/export/pdf`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `access-logs-${recordId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Access logs exported as PDF');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export access logs as PDF');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExportLoading(true);
      const response = await api.get(`/medical-records/${recordId}/export/csv`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `access-logs-${recordId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Access logs exported as CSV');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export access logs as CSV');
    } finally {
      setExportLoading(false);
    }
  };

  const calculateStats = (logs) => {
    if (logs.length === 0) {
      setStats({
        totalAccesses: 0,
        uniqueDoctors: 0,
        lastAccessed: null,
        mostActiveDoctor: null
      });
      return;
    }

    // Calculate total accesses
    const totalAccesses = logs.length;

    // Calculate unique doctors
    const doctorMap = new Map();
    logs.forEach(log => {
      const doctorId = log.doctor._id || log.doctor;
      const doctorName = log.doctor.name || 'Unknown Doctor';
      
      if (!doctorMap.has(doctorId)) {
        doctorMap.set(doctorId, { name: doctorName, count: 0 });
      }
      doctorMap.get(doctorId).count++;
    });

    const uniqueDoctors = doctorMap.size;

    // Find most active doctor
    let mostActiveDoctor = null;
    let maxCount = 0;
    doctorMap.forEach((value, key) => {
      if (value.count > maxCount) {
        maxCount = value.count;
        mostActiveDoctor = { name: value.name, count: value.count };
      }
    });

    // Get last accessed time
    const lastAccessed = logs.length > 0 ? new Date(logs[0].timestamp) : null;

    setStats({
      totalAccesses,
      uniqueDoctors,
      lastAccessed,
      mostActiveDoctor
    });
  };

  const getActionIcon = (action) => {
    switch (action.toLowerCase()) {
      case 'view':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
      case 'download':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        );
      case 'share':
        return (
          <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const formatTimestamp = (timestamp) => {
    // Handle null, undefined, or invalid timestamps
    if (!timestamp) {
      return 'Unknown time';
    }

    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid timestamp:', timestamp);
      return 'Invalid Date';
    }

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex items-center space-x-3 mb-2">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-2xl font-bold">Access Audit Trail</h2>
        </div>
        <p className="text-blue-100">Track who accessed "{recordTitle}"</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Accesses</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalAccesses}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Unique Doctors</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.uniqueDoctors}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Most Active</p>
              <p className="text-lg font-bold text-gray-900 mt-1 truncate">
                {stats.mostActiveDoctor ? stats.mostActiveDoctor.name : 'N/A'}
              </p>
              {stats.mostActiveDoctor && (
                <p className="text-xs text-gray-500">{stats.mostActiveDoctor.count} accesses</p>
              )}
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Last Accessed</p>
              <p className="text-sm font-bold text-gray-900 mt-1">
                {stats.lastAccessed ? formatTimestamp(stats.lastAccessed) : 'Never'}
              </p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Suspicious Activity Alerts */}
      {suspiciousActivities.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">⚠️ Suspicious Activity Detected</h3>
              <p className="text-sm text-red-800 mb-4">
                Our system has detected potentially suspicious access patterns for this record. Please review the activities below.
              </p>
              <div className="space-y-3">
                {suspiciousActivities.slice(0, 5).map((activity, idx) => (
                  <div key={idx} className="bg-white rounded-md p-3 border border-red-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.activity}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Detected: {formatTimestamp(activity.detectedAt)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        activity.severity === 'high' ? 'bg-red-100 text-red-800' :
                        activity.severity === 'medium' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {activity.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {suspiciousActivities.length > 5 && (
                <p className="text-xs text-red-700 mt-3">
                  + {suspiciousActivities.length - 5} more suspicious activities detected
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Export Access Logs</h3>
            <p className="text-sm text-gray-600 mt-1">Download complete access history for your records</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExportPDF}
              disabled={exportLoading || accessLogs.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {exportLoading ? 'Exporting...' : 'Export PDF'}
            </button>
            <button
              onClick={handleExportCSV}
              disabled={exportLoading || accessLogs.length === 0}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {exportLoading ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Notification Settings</h3>
            <p className="text-sm text-gray-600 mt-1">Configure when you want to receive email notifications</p>
          </div>
          <button
            onClick={() => setShowNotificationSettings(!showNotificationSettings)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showNotificationSettings ? 'Hide Settings' : 'Show Settings'}
          </button>
        </div>

        {showNotificationSettings && (
          <div className="space-y-4 mt-4 pt-4 border-t">
            {/* Enable/Disable All Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Enable Notifications</label>
                <p className="text-xs text-gray-500">Receive email alerts for record access</p>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateNotificationSettings({
                  ...notificationSettings,
                  enabled: !notificationSettings.enabled
                })}
                className={`${
                  notificationSettings.enabled ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    notificationSettings.enabled ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            {/* Email on Access */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Email on View</label>
                <p className="text-xs text-gray-500">Get notified when a doctor views your record</p>
              </div>
              <button
                type="button"
                disabled={!notificationSettings.enabled}
                onClick={() => handleUpdateNotificationSettings({
                  ...notificationSettings,
                  emailOnAccess: !notificationSettings.emailOnAccess
                })}
                className={`${
                  notificationSettings.emailOnAccess && notificationSettings.enabled ? 'bg-green-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span
                  className={`${
                    notificationSettings.emailOnAccess && notificationSettings.enabled ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            {/* Email on Download */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Email on Download</label>
                <p className="text-xs text-gray-500">Get notified when a doctor downloads your record</p>
              </div>
              <button
                type="button"
                disabled={!notificationSettings.enabled}
                onClick={() => handleUpdateNotificationSettings({
                  ...notificationSettings,
                  emailOnDownload: !notificationSettings.emailOnDownload
                })}
                className={`${
                  notificationSettings.emailOnDownload && notificationSettings.enabled ? 'bg-orange-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span
                  className={`${
                    notificationSettings.emailOnDownload && notificationSettings.enabled ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            {/* Email on Share */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Email on Suspicious Activity</label>
                <p className="text-xs text-gray-500">Get notified when suspicious sharing patterns are detected</p>
              </div>
              <button
                type="button"
                disabled={!notificationSettings.enabled}
                onClick={() => handleUpdateNotificationSettings({
                  ...notificationSettings,
                  emailOnShare: !notificationSettings.emailOnShare
                })}
                className={`${
                  notificationSettings.emailOnShare && notificationSettings.enabled ? 'bg-red-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span
                  className={`${
                    notificationSettings.emailOnShare && notificationSettings.enabled ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-xs text-blue-800">
                <strong>Privacy Note:</strong> Email notifications help you stay informed about who accesses your medical records in real-time, enhancing your privacy and security.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Access Logs Timeline */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Access History</h3>
          <button
            onClick={fetchAccessLogs}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {accessLogs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No access logs</h3>
            <p className="mt-1 text-sm text-gray-500">This record hasn't been accessed by any doctor yet.</p>
          </div>
        ) : (
          <div className="flow-root">
            <ul className="-mb-8">
              {accessLogs.map((log, logIdx) => (
                <li key={logIdx}>
                  <div className="relative pb-8">
                    {logIdx !== accessLogs.length - 1 && (
                      <span
                        className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex items-start space-x-3">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                          {getActionIcon(log.action)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Dr. {log.doctor.name || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-500">{log.doctor.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">{formatTimestamp(log.timestamp)}</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              log.action === 'view' ? 'bg-blue-100 text-blue-800' :
                              log.action === 'download' ? 'bg-green-100 text-green-800' :
                              log.action === 'share' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {log.action}
                            </span>
                          </div>
                        </div>
                        {/* IP Address and User Agent Information */}
                        {(log.ipAddress || log.userAgent) && (
                          <div className="mt-2 space-y-1">
                            {log.ipAddress && (
                              <div className="flex items-center text-xs text-gray-500">
                                <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                                <span className="font-medium">IP:</span> {log.ipAddress}
                              </div>
                            )}
                            {log.userAgent && (
                              <div className="flex items-start text-xs text-gray-500">
                                <svg className="w-4 h-4 mr-1 mt-0.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="font-medium">Device:</span> <span className="ml-1 truncate">{log.userAgent.substring(0, 60)}{log.userAgent.length > 60 ? '...' : ''}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {log.blockchainTxHash && (
                          <div className="mt-2 flex items-center text-xs text-gray-500">
                            <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Verified on blockchain
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Blockchain Verification Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-green-800">
            <p className="font-medium mb-1">Blockchain-Verified Access Logs</p>
            <p className="text-green-700">
              All access logs are immutably recorded on the blockchain, ensuring complete transparency and preventing tampering. You have full visibility into who accessed your medical records and when.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
