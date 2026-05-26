import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';
import { toast } from 'react-toastify';
import {
  ShieldCheckIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  CogIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [verifiedDoctors, setVerifiedDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [pendingResponse, verifiedResponse] = await Promise.all([
        userApi.getPendingDoctors(),
        userApi.getVerifiedDoctors()
      ]);
      
      setPendingDoctors(pendingResponse);
      setVerifiedDoctors(verifiedResponse);
    } catch (error) {
      toast.error('Failed to load admin data');
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDoctor = async (doctorId) => {
    try {
      await userApi.verifyDoctor(doctorId);
      toast.success('Doctor verified successfully!');
      fetchAdminData(); // Refresh data
    } catch (error) {
      toast.error('Failed to verify doctor');
      console.error('Error verifying doctor:', error);
    }
  };

  const handleRejectDoctor = async (doctorId) => {
    try {
      await userApi.rejectDoctor(doctorId);
      toast.success('Doctor rejected successfully!');
      fetchAdminData(); // Refresh data
    } catch (error) {
      toast.error('Failed to reject doctor');
      console.error('Error rejecting doctor:', error);
    }
  };

  const handleViewDetails = (doctor) => {
    setSelectedDoctor(doctor);
    setShowDetailsModal(true);
  };

  const handleBackgroundCheckUpdate = async (doctorId, status) => {
    try {
      console.log('Updating background check:', { doctorId, status });
      const result = await userApi.updateBackgroundCheck(doctorId, status);
      console.log('Background check update result:', result);
      toast.success(`Background check ${status} successfully!`);
      fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Error updating background check:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      toast.error('Failed to update background check');
    }
  };

  const handleAutomatedVerification = async (doctorId) => {
    try {
      console.log('Starting automated verification for doctor:', doctorId);
      toast.info('Starting automated verification... This may take a few moments.');
      
      const result = await userApi.performAutomatedVerification(doctorId);
      console.log('Automated verification result:', result);
      
      if (result.verificationResults.overallStatus === 'verified') {
        toast.success('✅ Automated verification completed successfully! Doctor is verified.');
      } else if (result.verificationResults.overallStatus === 'requires_manual_review') {
        toast.warning('⚠️ Automated verification completed. Manual review required.');
        console.log('Verification recommendations:', result.verificationResults.recommendations);
      } else {
        toast.error('❌ Automated verification failed. Manual review required.');
      }
      
      fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Error performing automated verification:', error);
      toast.error('Failed to perform automated verification');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-red-800">Access Denied</h2>
              <p className="text-red-600">You don't have permission to access the admin dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage doctors and system settings</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full">
              <ShieldCheckIcon className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">Admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Verification</p>
              <p className="text-2xl font-bold text-gray-900">{pendingDoctors.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verified Doctors</p>
              <p className="text-2xl font-bold text-gray-900">{verifiedDoctors.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Doctors</p>
              <p className="text-2xl font-bold text-gray-900">{pendingDoctors.length + verifiedDoctors.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Verification ({pendingDoctors.length})
            </button>
            <button
              onClick={() => setActiveTab('verified')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'verified'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Verified Doctors ({verifiedDoctors.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'pending' ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Doctors Pending Verification</h3>
              {pendingDoctors.length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No doctors pending verification</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingDoctors.map((doctor) => (
                    <div key={doctor._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{doctor.name}</h4>
                          <p className="text-sm text-gray-600">{doctor.email}</p>
                          <p className="text-sm text-gray-500">Specialization: {doctor.specialization}</p>
                          <p className="text-sm text-gray-500">License: {doctor.licenseNumber}</p>
                          {/* Enhanced verification fields */}
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {/* Profile photo preview if available */}
                            <div className="text-xs">
                              <span className="font-medium text-gray-600">Profile Photo:</span>
                              {doctor.profilePicture || doctor.profilePhoto ? (
                                <img
                                  className="ml-2 inline-block h-10 w-10 rounded-full object-cover align-middle border"
                                  src={doctor.profilePicture ? `https://gateway.pinata.cloud/ipfs/${doctor.profilePicture}` : doctor.profilePhoto}
                                  alt="Profile"
                                />
                              ) : (
                                <span className="ml-1 text-red-600">Not provided</span>
                              )}
                            </div>
                            <div className="text-xs">
                              <span className="font-medium text-gray-600">Medical Board:</span>
                              <span className={`ml-1 ${doctor.medicalBoard ? 'text-green-600' : 'text-red-600'}`}>
                                {doctor.medicalBoard || 'Not provided'}
                              </span>
                            </div>
                            <div className="text-xs">
                              <span className="font-medium text-gray-600">License Expiry:</span>
                              <span className={`ml-1 ${doctor.licenseExpiry ? 'text-green-600' : 'text-red-600'}`}>
                                {doctor.licenseExpiry ? new Date(doctor.licenseExpiry).toLocaleDateString() : 'Not provided'}
                              </span>
                            </div>
                            <div className="text-xs">
                              <span className="font-medium text-gray-600">Government ID:</span>
                              <span className={`ml-1 ${doctor.governmentId ? 'text-green-600' : 'text-red-600'}`}>
                                {doctor.governmentId || 'Not provided'}
                              </span>
                            </div>
                            <div className="text-xs">
                              <span className="font-medium text-gray-600">Mobile Number:</span>
                              {doctor.mobileNumber ? (
                                <span className="ml-1 text-green-600">{doctor.mobileNumber}</span>
                              ) : (
                                <span className="ml-1 text-red-600">Not provided</span>
                              )}
                            </div>
                            <div className="text-xs">
                              <span className="font-medium text-gray-600">Background Check:</span>
                              <span className={`ml-1 ${
                                doctor.backgroundCheckStatus === 'completed' ? 'text-green-600' : 
                                doctor.backgroundCheckStatus === 'failed' ? 'text-red-600' : 'text-yellow-600'
                              }`}>
                                {doctor.backgroundCheckStatus || 'pending'}
                              </span>
                            </div>
                            <div className="text-xs">
                              <span className="font-medium text-gray-600">Name Matching:</span>
                              <span className={`ml-1 ${
                                doctor.nameMatchingStatus === 'matched' ? 'text-green-600' : 
                                doctor.nameMatchingStatus === 'mismatch' ? 'text-red-600' : 
                                doctor.nameMatchingStatus === 'requires_review' ? 'text-orange-600' : 'text-yellow-600'
                              }`}>
                                {doctor.nameMatchingStatus || 'pending'}
                              </span>
                            </div>
                            <div className="text-xs">
                              <span className="font-medium text-gray-600">Profile Completed:</span>
                              <span className={`ml-1 ${doctor.profileCompleted ? 'text-green-600' : 'text-red-600'}`}>
                                {doctor.profileCompleted ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="text-xs">
                              <span className="font-medium text-gray-600">Verification Status:</span>
                              <span className={`ml-1 ${
                                doctor.verificationStatus === 'verified' ? 'text-green-600' : 
                                doctor.verificationStatus === 'failed' ? 'text-red-600' : 
                                doctor.verificationStatus === 'requires_manual_review' ? 'text-orange-600' : 'text-yellow-600'
                              }`}>
                                {doctor.verificationStatus || 'pending'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleViewDetails(doctor)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            <EyeIcon className="h-3 w-3 mr-1" />
                            View Details
                          </button>
                          <button
                            onClick={() => handleAutomatedVerification(doctor._id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <ShieldCheckIcon className="h-3 w-3 mr-1" />
                            Auto Verify
                          </button>
                          <button
                            onClick={() => handleVerifyDoctor(doctor._id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Verify
                          </button>
                          <button
                            onClick={() => handleRejectDoctor(doctor._id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <XCircleIcon className="h-3 w-3 mr-1" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Verified Doctors</h3>
              {verifiedDoctors.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No verified doctors yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {verifiedDoctors.map((doctor) => (
                    <div key={doctor._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h4 className="font-medium text-gray-900">{doctor.name}</h4>
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Verified
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{doctor.email}</p>
                          <p className="text-sm text-gray-500">Specialization: {doctor.specialization}</p>
                          <p className="text-sm text-gray-500">License: {doctor.licenseNumber}</p>
                          {/* Enhanced verification fields for verified doctors */}
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-gray-400">Medical Board: {doctor.medicalBoard || 'Not provided'}</p>
                            <p className="text-xs text-gray-400">License Expiry: {doctor.licenseExpiry ? new Date(doctor.licenseExpiry).toLocaleDateString() : 'Not provided'}</p>
                            <p className="text-xs text-gray-400">Government ID: {doctor.governmentId ? '✅ Provided' : '❌ Missing'}</p>
                            <p className="text-xs text-gray-400">Background Check: {doctor.backgroundCheckStatus === 'completed' ? '✅ Passed' : doctor.backgroundCheckStatus === 'failed' ? '❌ Failed' : '🟡 Pending'}</p>
                          </div>
                          {/* Verification status indicators */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {doctor.medicalBoard && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Board Verified
                              </span>
                            )}
                            {doctor.governmentId && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ID Verified
                              </span>
                            )}
                            {doctor.backgroundCheckStatus === 'completed' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Background Clear
                              </span>
                            )}
                            {!doctor.medicalBoard && !doctor.governmentId && doctor.backgroundCheckStatus !== 'completed' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Basic Verification
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewDetails(doctor)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View Details
                          </button>
                          <button
                            onClick={() => handleAutomatedVerification(doctor._id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <ShieldCheckIcon className="h-4 w-4 mr-1" />
                            Re-verify
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* View Details Modal */}
      {showDetailsModal && selectedDoctor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Doctor Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Basic Information */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="text-sm text-gray-900">{selectedDoctor.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-sm text-gray-900">{selectedDoctor.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                      <p className={`text-sm ${selectedDoctor.mobileNumber ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedDoctor.mobileNumber || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Specialization</label>
                      <p className="text-sm text-gray-900">{selectedDoctor.specialization}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">License Number</label>
                      <p className="text-sm text-gray-900">{selectedDoctor.licenseNumber}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Profile Photo</label>
                      {selectedDoctor.profilePicture || selectedDoctor.profilePhoto ? (
                        <div className="mt-2">
                          <img 
                            src={selectedDoctor.profilePicture ? `https://gateway.pinata.cloud/ipfs/${selectedDoctor.profilePicture}` : selectedDoctor.profilePhoto}
                            alt="Profile" 
                            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-red-600">Not provided</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verification Information */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Verification Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Medical Board</label>
                      <p className={`text-sm ${selectedDoctor.medicalBoard ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedDoctor.medicalBoard || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">License Expiry</label>
                      <p className={`text-sm ${selectedDoctor.licenseExpiry ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedDoctor.licenseExpiry ? new Date(selectedDoctor.licenseExpiry).toLocaleDateString() : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Government ID</label>
                      <p className={`text-sm ${selectedDoctor.governmentId ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedDoctor.governmentId || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Profile Completed</label>
                      <p className={`text-sm ${selectedDoctor.profileCompleted ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedDoctor.profileCompleted ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Background Check Section */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Background Check</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">Current Status:</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedDoctor.backgroundCheckStatus === 'completed' ? 'bg-green-100 text-green-800' :
                        selectedDoctor.backgroundCheckStatus === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedDoctor.backgroundCheckStatus || 'pending'}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleBackgroundCheckUpdate(selectedDoctor._id, 'completed')}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                      >
                        Pass
                      </button>
                      <button
                        onClick={() => handleBackgroundCheckUpdate(selectedDoctor._id, 'failed')}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
                      >
                        Fail
                      </button>
                    </div>
                  </div>
                </div>

                {/* Automated Verification Section */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Automated Verification</h4>
                  <div className="flex items-center justify-between">
                     <div>
                       <p className="text-sm text-gray-700">Status:</p>
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                         selectedDoctor.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
                         selectedDoctor.verificationStatus === 'failed' ? 'bg-red-100 text-red-800' :
                         selectedDoctor.verificationStatus === 'requires_manual_review' ? 'bg-orange-100 text-orange-800' :
                         'bg-yellow-100 text-yellow-800'
                       }`}>
                         {selectedDoctor.verificationStatus || 'pending'}
                       </span>
                     </div>
                     <div className="flex space-x-2">
                       <button
                         onClick={() => handleAutomatedVerification(selectedDoctor._id)}
                         className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                       >
                         Run Verification
                       </button>
                     </div>
                   </div>
                   {selectedDoctor.verificationResults && (
                     <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                       <h5 className="text-sm font-medium text-gray-900 mb-2">Verification Results:</h5>
                       <p className="text-sm text-gray-700">Overall Status: {selectedDoctor.verificationResults.overallStatus}</p>
                       {selectedDoctor.verificationResults.recommendations && selectedDoctor.verificationResults.recommendations.length > 0 && (
                         <p className="text-sm text-gray-700">Recommendations: {selectedDoctor.verificationResults.recommendations.join(', ')}</p>
                       )}
                       {selectedDoctor.lastVerificationDate && (
                         <p className="text-sm text-gray-700">Last Verified: {new Date(selectedDoctor.lastVerificationDate).toLocaleString()}</p>
                       )}
                     </div>
                   )}
                 </div>

                 {/* Registration Date */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700">Registration Date</label>
                   <p className="text-sm text-gray-900">
                     {new Date(selectedDoctor.createdAt).toLocaleDateString()}
                   </p>
                 </div>
               </div>

               <div className="flex justify-end mt-6">
                 <button
                   onClick={() => setShowDetailsModal(false)}
                   className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                 >
                   Close
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
}