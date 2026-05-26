import axios from 'axios';

// Debug the base URL
console.log('API Base URL:', process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000 // 30 second timeout
});

// Request interceptor for adding auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Debug logging
  console.log('API Request:', {
    method: config.method,
    url: config.url,
    baseURL: config.baseURL,
    fullURL: `${config.baseURL}${config.url}`,
    data: config.data
  });
  
  return config;
});

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      response: error.response?.data
    });
    
    // Prevent infinite redirect loop - only redirect on 401 if not already on login page
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Medical Records API
export const medicalRecordsApi = {
  // Upload a new medical record
  uploadRecord: async (formData) => {
    const response = await api.post('/records/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000, // 60 second timeout for uploads
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    return response.data;
  },

  // Get all records for a patient
  getPatientRecords: async () => {
    const response = await api.get('/records/patient');
    return response.data;
  },

  // Get all accessible records for a doctor
  getDoctorRecords: async () => {
    const response = await api.get('/records/doctor');
    return response.data;
  },

  // Get a specific record by ID
  getRecord: async (recordId) => {
    const response = await api.get(`/records/${recordId}`);
    return response.data;
  },

  // Grant access to a doctor
  grantAccess: async (doctorId, recordId) => {
    const response = await api.post('/records/grant-access', {
      doctorId,
      recordId
    });
    return response.data;
  },

  // Revoke access from a doctor
  revokeAccess: async (doctorId, recordId) => {
    const response = await api.post('/records/revoke-access', {
      doctorId,
      recordId
    });
    return response.data;
  },

  // Grant access to a doctor by email
  grantAccessByEmail: async (doctorEmail, recordId) => {
    const response = await api.post('/records/grant-access-by-email', {
      doctorEmail,
      recordId
    });
    return response.data;
  },

  // Revoke access from a doctor by email
  revokeAccessByEmail: async (doctorEmail, recordId) => {
    const response = await api.post('/records/revoke-access-by-email', {
      doctorEmail,
      recordId
    });
    return response.data;
  },

  // Delete a medical record
  deleteRecord: async (recordId) => {
    const response = await api.delete(`/records/${recordId}`);
    return response.data;
  },

  // Get PDF with caching support
  // skipLog: if true, server won't create access log entry (used for preloading)
  getPDF: async (recordId, action = 'view', skipLog = false) => {
    try {
      console.log(`Requesting PDF for record: ${recordId}, action: ${action}, skipLog: ${skipLog}`);
      
      const response = await api.get(`/records/${recordId}/pdf`, {
        params: { 
          action, // Send action as query parameter
          skipLog: skipLog ? 'true' : 'false', // Tell server whether to log this access
          _t: Date.now() // Cache busting - force fresh request every time
        },
        responseType: 'blob',
        timeout: 60000 // 60 second timeout
      });
      
      console.log(`PDF response received:`, {
        status: response.status,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'],
        blobSize: response.data.size,
        action: action,
        skipLog: skipLog
      });
      
      return response.data;
    } catch (error) {
      console.error('PDF download error:', {
        recordId: recordId,
        action: action,
        skipLog: skipLog,
        status: error.response?.status,
        message: error.message,
        response: error.response?.data
      });
      
      // Provide more specific error messages
      if (error.response?.status === 403) {
        const errorData = error.response?.data;
        if (errorData?.viewOnly) {
          throw new Error('Download not allowed. You have view-only access to this record.');
        }
        throw new Error('Access denied to this medical record');
      } else if (error.response?.status === 404) {
        throw new Error('Medical record not found');
      } else if (error.response?.status === 500) {
        const errorData = error.response?.data;
        if (errorData?.error === 'All IPFS gateways are currently unavailable') {
          throw new Error('PDF temporarily unavailable - IPFS gateways are down. Please try again later.');
        } else {
          throw new Error(`Server error: ${errorData?.message || 'Failed to load PDF'}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - PDF is taking too long to load. Please try again.');
      } else {
        throw new Error(`Failed to load PDF: ${error.message}`);
      }
    }
  },

  // Update access permissions for a doctor
  updateAccessPermissions: async (data) => {
    const response = await api.put('/medical-records/permissions', data);
    return response.data;
  },

  // Update notification settings for a record
  updateNotificationSettings: async (recordId, settings) => {
    const response = await api.put(`/medical-records/${recordId}/notifications`, settings);
    return response.data;
  }
};

// User API
export const userApi = {
  // Get user profile
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  // Update user profile
  updateProfile: async (data) => {
    console.log('API: updateProfile called with data:', data);
    const response = await api.post('/auth/profile', data, {
      params: {
        _t: Date.now() // Cache busting parameter
      }
    });
    console.log('API: updateProfile response:', response.data);
    return response.data;
  },

  // Upload profile picture
  uploadProfilePicture: async (formData) => {
    const response = await api.post('/auth/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000
    });
    return response.data;
  },

  // Fetch all verified doctors
  getAllDoctors: async () => {
    const response = await api.get('/doctors');
    return response.data;
  },

  // Admin functions
  createFirstAdmin: async (adminData) => {
    const response = await api.post('/admin/create', adminData);
    return response.data;
  },

  getPendingDoctors: async () => {
    const response = await api.get('/admin/pending-doctors');
    return response.data;
  },

  getVerifiedDoctors: async () => {
    const response = await api.get('/admin/verified-doctors');
    return response.data;
  },

  verifyDoctor: async (doctorId) => {
    const response = await api.post(`/doctors/verify/${doctorId}`);
    return response.data;
  },

  rejectDoctor: async (doctorId) => {
    const response = await api.post(`/doctors/reject/${doctorId}`);
    return response.data;
  },

  updateBackgroundCheck: async (doctorId, status) => {
    console.log('API: updateBackgroundCheck called with:', { doctorId, status });
    const response = await api.post(`/doctors/background-check/${doctorId}`, { status });
    console.log('API: updateBackgroundCheck response:', response.data);
    return response.data;
  },

  performAutomatedVerification: async (doctorId) => {
    console.log('API: performAutomatedVerification called with:', { doctorId });
    const response = await api.post(`/doctors/automated-verification/${doctorId}`);
    console.log('API: performAutomatedVerification response:', response.data);
    return response.data;
  },

  // Delete user account
  deleteAccount: async (password) => {
    console.log('API: deleteAccount called');
    const response = await api.delete('/auth/delete-account', {
      data: { password }
    });
    console.log('API: deleteAccount response:', response.data);
    return response.data;
  }
};

export default api; 