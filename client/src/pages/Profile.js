import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';
import { toast } from 'react-toastify';
import PDFCacheStats from '../components/PDFCacheStats';
import {
  UserCircleIcon,
  CameraIcon,
  PencilIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  // Form state for doctor profile completion
  const [formData, setFormData] = useState({
    medicalBoard: '',
    licenseExpiry: '',
    governmentId: '',
    specialization: '',
    licenseNumber: '',
    mobileNumber: '',
    profilePhoto: null
  });

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        medicalBoard: user.medicalBoard || '',
        licenseExpiry: user.licenseExpiry ? new Date(user.licenseExpiry).toISOString().split('T')[0] : '',
        governmentId: user.governmentId || '',
        specialization: user.specialization || '',
        licenseNumber: user.licenseNumber || '',
        mobileNumber: user.mobileNumber || '',
        profilePhoto: user.profilePhoto || null
      });
      setProfilePicture(user.profilePicture);
    }
  }, [user]);

  if (!user) return <div className="p-4">No user data.</div>;

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await userApi.uploadProfilePicture(formData);
      setProfilePicture(response.profilePicture);
      toast.success('Profile picture uploaded successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const getProfilePictureUrl = () => {
    if (profilePicture) {
      return `https://gateway.pinata.cloud/ipfs/${profilePicture}`;
    }
    return null;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileCompletion = async (e) => {
    e.preventDefault();
    
    // Enhanced authentication check with better debugging
    const token = localStorage.getItem('token');
    console.log('Authentication check:', {
      user: !!user,
      userId: user?._id,
      token: !!token,
      userObject: user
    });
    
    if (!token) {
      toast.error('Authentication token missing. Please log in again.');
      return;
    }
    
    if (!user || !user._id) {
      // Try to refresh user data first
      try {
        const response = await userApi.getProfile();
        updateUser(response);
        console.log('User data refreshed:', response);
      } catch (refreshError) {
        console.error('Failed to refresh user data:', refreshError);
        toast.error('Session expired. Please log in again.');
        // Optionally redirect to login
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }
    }
    
    setLoading(true);

    try {
      // Validate that all required fields are filled
      const requiredFields = ['medicalBoard', 'licenseExpiry', 'governmentId', 'specialization', 'licenseNumber'];
      const missingFields = requiredFields.filter(field => !formData[field] || formData[field].trim() === '');
      
      if (missingFields.length > 0) {
        toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
        setLoading(false);
        return;
      }

      // Convert date string to proper format for backend
      const submissionData = {
        ...formData,
        profileCompleted: true
      };

      // If licenseExpiry is provided, ensure it's in the correct format
      if (formData.licenseExpiry) {
        submissionData.licenseExpiry = new Date(formData.licenseExpiry).toISOString();
      }

      console.log('Submitting profile data:', submissionData);
      console.log('Current form data:', formData);

      const response = await userApi.updateProfile(submissionData);
      
      console.log('Profile update response:', response);
      
      updateUser(response.user);
      setIsEditing(false);
      toast.success('Profile completed successfully!');
    } catch (error) {
      console.error('Profile completion error:', error);
      console.error('Error response:', error.response);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // More specific error messages
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Invalid data provided';
        toast.error(`Bad Request: ${errorMessage}`);
        console.error('Validation errors:', error.response?.data?.errors);
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        setTimeout(() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }, 2000);
      } else if (error.response?.status === 404) {
        toast.error('User not found. Please try logging in again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to complete profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const getCompletionStatus = () => {
    if (user.role !== 'doctor') return null;
    
    const requiredFields = ['medicalBoard', 'licenseExpiry', 'governmentId', 'specialization', 'licenseNumber'];
    
    // If profile is already completed, show 100%
    if (user.profileCompleted) {
      return {
        percentage: 100,
        completed: true,
        missingFields: []
      };
    }
    
    // Check formData values for completion status
    const completedFields = requiredFields.filter(field => formData[field] && formData[field].trim() !== '');
    const completionPercentage = (completedFields.length / requiredFields.length) * 100;
    
    return {
      percentage: completionPercentage,
      completed: false,
      missingFields: requiredFields.filter(field => !formData[field] || formData[field].trim() === '')
    };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <ExclamationCircleIcon className="w-5 h-5 text-yellow-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ExclamationCircleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  // Delete account function
  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toast.error('Please enter your password to confirm account deletion');
      return;
    }

    setDeleting(true);
    try {
      await userApi.deleteAccount(deletePassword);
      toast.success('Account successfully deleted. Redirecting...');
      
      // Clear local storage and redirect
      localStorage.removeItem('token');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setDeletePassword('');
    }
  };

  const completionStatus = getCompletionStatus();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
        </div>

        {/* Profile Picture Section */}
        <div className="px-6 py-6">
          <div className="flex items-center space-x-6">
            <div className="relative">
              {getProfilePictureUrl() ? (
                <img
                  src={getProfilePictureUrl()}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <UserCircleIcon className="w-24 h-24 text-gray-400" />
              )}
              
              {/* Upload Button Overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-2 -right-2 bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <CameraIcon className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
              <p className="text-gray-600 capitalize">{user.role}</p>
              {user.specialization && (
                <p className="text-sm text-gray-500">{user.specialization}</p>
              )}
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfilePictureUpload}
            className="hidden"
          />
        </div>

        {/* Doctor Profile Completion Section */}
        {user.role === 'doctor' && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Completion</h3>
              {completionStatus && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Completion Status</span>
                    <span className={`text-sm font-medium ${
                      completionStatus.completed ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {completionStatus.completed ? 'Completed' : `${Math.round(completionStatus.percentage)}% Complete`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${completionStatus.percentage}%` }}
                    ></div>
                  </div>
                  {!completionStatus.completed && completionStatus.missingFields.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Missing: {completionStatus.missingFields.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {!completionStatus?.completed ? (
              <form onSubmit={handleProfileCompletion} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medical Board <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="medicalBoard"
                      value={formData.medicalBoard}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Medical Council of India"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., MD123456"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Expiry Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="licenseExpiry"
                      value={formData.licenseExpiry}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Government ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="governmentId"
                      value={formData.governmentId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Aadhar, PAN, etc."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specialization <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Cardiologist, Neurologist"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., +91 1234567890"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Photo
                    </label>
                    <input
                      type="file"
                      name="profilePhoto"
                      onChange={handleProfilePictureUpload}
                      className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      accept="image/*"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {loading ? 'Completing...' : 'Complete Profile'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span className="text-green-800 font-medium">Profile completed successfully!</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  Your profile has been submitted for admin verification. You will be notified once verified.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Profile Information */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="text-gray-900">{user.name}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="text-gray-900">{user.email}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <div className="text-gray-900 capitalize">{user.role}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wallet Address
              </label>
              <div className="text-gray-900 font-mono text-sm break-all">
                {user.walletAddress}
              </div>
            </div>

            {user.specialization && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialization
                </label>
                <div className="text-gray-900">{user.specialization}</div>
              </div>
            )}

            {user.licenseNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Number
                </label>
                <div className="text-gray-900">{user.licenseNumber}</div>
              </div>
            )}

            {user.role === 'doctor' && user.medicalBoard && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical Board
                </label>
                <div className="text-gray-900">{user.medicalBoard}</div>
              </div>
            )}

            {user.role === 'doctor' && user.licenseExpiry && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Expiry
                </label>
                <div className="text-gray-900">{new Date(user.licenseExpiry).toLocaleDateString()}</div>
              </div>
            )}

            {user.role === 'doctor' && user.governmentId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Government ID
                </label>
                <div className="text-gray-900">{user.governmentId}</div>
              </div>
            )}

            {user.role === 'doctor' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Check Status
                </label>
                <div className="flex items-center">
                  {getStatusIcon(user.backgroundCheckStatus)}
                  <span className="ml-2 text-gray-900 capitalize">{user.backgroundCheckStatus || 'pending'}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Status
              </label>
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.isVerified 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {user.isVerified ? 'Verified' : 'Pending Verification'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Change Photo'}
            </button>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete Account
              </button>

              <button
                onClick={logout}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-lg font-medium text-gray-900">Delete Account</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500 mb-4">
                    Are you sure you want to permanently delete your account? This action cannot be undone.
                  </p>
                  <p className="text-sm text-red-600 mb-4">
                    All your data will be permanently removed from our servers.
                  </p>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter your password to confirm:
                    </label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Your password"
                      disabled={deleting}
                    />
                  </div>
                </div>
                
                <div className="flex justify-center space-x-3 px-4 py-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletePassword('');
                    }}
                    disabled={deleting}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || !deletePassword.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </div>
                    ) : (
                      'Delete Account'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Cache Statistics - Only for patients and doctors */}
      {(user?.role === 'patient' || user?.role === 'doctor') && (
        <div className="mt-6">
          <PDFCacheStats />
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleProfilePictureUpload}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
} 