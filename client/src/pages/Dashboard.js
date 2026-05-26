import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { medicalRecordsApi } from '../services/api';
import { toast } from 'react-toastify';
import { usePDFPreload, usePDFViewer } from '../hooks/usePDFPreload';
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  UserGroupIcon,
  ClockIcon,
  EyeIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalRecords: 0,
    recentRecords: [],
    accessGranted: 0,
    pendingRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [showGrantAccessModal, setShowGrantAccessModal] = useState(false);
  const [showRevokeAccessModal, setShowRevokeAccessModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [doctorEmail, setDoctorEmail] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Use PDF preloading and viewing hooks
  const { preloadStatus } = usePDFPreload(stats.recentRecords, !loading);
  const { viewPDF, loading: pdfLoading } = usePDFViewer();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Check if doctor needs to complete profile
  const needsProfileCompletion = user?.role === 'doctor' && !user?.profileCompleted;

  const fetchDashboardData = async () => {
    try {
      let records = [];
      if (user.role === 'patient' || user.role === 'admin') {
        records = await medicalRecordsApi.getPatientRecords();
      } else if (user.role === 'doctor') {
        records = await medicalRecordsApi.getDoctorRecords();
      }

      setStats({
        totalRecords: records.length,
        recentRecords: records.slice(0, 5),
        accessGranted: records.filter(r => r.accessGranted?.length > 0).length,
        pendingRequests: 0 // Implement if needed
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Profile Completion Warning Component
  const ProfileCompletionWarning = () => (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
      <div className="flex items-start">
        <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500 mt-0.5 mr-3" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Complete Your Profile
          </h3>
          <p className="text-yellow-700 mb-4">
            To access medical records and be verified by administrators, you need to complete your profile with all required verification details.
          </p>
          <div className="flex items-center space-x-4">
            <Link
              to="/profile"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              Complete Profile
            </Link>
            <span className="text-sm text-yellow-600">
              Required: Medical Board, License Number, License Expiry, Government ID, Specialization
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const handleViewPDF = async (recordId) => {
    // Check if PDF is preloaded
    const isPreloaded = preloadStatus[recordId] === 'loaded' || preloadStatus[recordId] === 'cached';
    
    if (!isPreloaded) {
      toast.info('Loading PDF...');
    }
    
    const result = await viewPDF(recordId, (error) => {
      toast.error(error.message || 'Failed to load PDF document. Please try again.');
    });
    
    if (result.success) {
      toast.success('PDF opened in new tab');
    }
  };

  const handleGrantAccess = (recordId) => {
    setSelectedRecordId(recordId);
    setDoctorEmail('');
    setShowGrantAccessModal(true);
  };

  const handleGrantAccessSubmit = async () => {
    if (!doctorEmail.trim()) {
      toast.error('Please enter a doctor email');
      return;
    }
    
    setGrantLoading(true);
    try {
      await medicalRecordsApi.grantAccessByEmail(doctorEmail, selectedRecordId);
      toast.success('Access granted successfully!');
      setShowGrantAccessModal(false);
      fetchDashboardData(); // Refresh the dashboard
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to grant access');
    } finally {
      setGrantLoading(false);
    }
  };

  const closeGrantAccessModal = () => {
    setShowGrantAccessModal(false);
    setDoctorEmail('');
    setSelectedRecordId(null);
  };

  const handleRevokeAccess = (recordId) => {
    setSelectedRecordId(recordId);
    setDoctorEmail('');
    setShowRevokeAccessModal(true);
  };

  const handleRevokeAccessSubmit = async () => {
    if (!doctorEmail.trim()) {
      toast.error('Please enter a doctor email');
      return;
    }
    
    setRevokeLoading(true);
    try {
      await medicalRecordsApi.revokeAccessByEmail(doctorEmail, selectedRecordId);
      toast.success('Access revoked successfully!');
      setShowRevokeAccessModal(false);
      fetchDashboardData(); // Refresh the dashboard
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to revoke access');
    } finally {
      setRevokeLoading(false);
    }
  };

  const closeRevokeAccessModal = () => {
    setShowRevokeAccessModal(false);
    setDoctorEmail('');
    setSelectedRecordId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome back, {user.name}!
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Here's an overview of your medical records
            </p>
          </div>
          
        </div>
      </div>

      {/* Profile Completion Warning for Doctors */}
      {needsProfileCompletion && <ProfileCompletionWarning />}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Records
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.totalRecords}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {user.role === 'patient' ? 'Shared Records' : 'Accessible Records'}
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.accessGranted}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

             {/* Quick Actions for Patients/Admins */}
       {(user.role === 'patient' || user.role === 'admin') && (
         <div className="mt-8">
           <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
             <Link
               to="/patient/upload"
               className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
             >
               <div className="p-5">
                 <div className="flex items-center">
                   <div className="flex-shrink-0">
                     <CloudArrowUpIcon className="h-6 w-6 text-primary-600" />
                   </div>
                   <div className="ml-5 w-0 flex-1">
                     <p className="text-sm font-medium text-gray-900">Upload Record</p>
                     <p className="text-sm text-gray-500">Add new medical document</p>
                   </div>
                 </div>
               </div>
             </Link>
             
             <Link
               to="/patient/records"
               className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
             >
               <div className="p-5">
                 <div className="flex items-center">
                   <div className="flex-shrink-0">
                     <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                   </div>
                   <div className="ml-5 w-0 flex-1">
                     <p className="text-sm font-medium text-gray-900">View All Records</p>
                     <p className="text-sm text-gray-500">Manage your records</p>
                   </div>
                 </div>
               </div>
             </Link>
             
                           <button
                onClick={() => {
                  if (stats.recentRecords.length > 0) {
                    handleViewPDF(stats.recentRecords[0].recordId);
                  } else {
                    toast.info('No records available to view');
                  }
                }}
                disabled={stats.recentRecords.length === 0}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <EyeIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">View Latest PDF</p>
                      <p className="text-sm text-gray-500">Open most recent document</p>
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => {
                  const grantedRecords = stats.recentRecords.filter(record => record.accessGranted && record.accessGranted.length > 0);
                  if (grantedRecords.length > 0) {
                    // Scroll to the Granted Access section
                    document.querySelector('[data-section="granted-access"]')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    toast.info('No records with granted access found');
                  }
                }}
                disabled={stats.recentRecords.filter(record => record.accessGranted && record.accessGranted.length > 0).length === 0}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UserGroupIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">View Granted Access</p>
                      <p className="text-sm text-gray-500">See shared documents</p>
                    </div>
                  </div>
                </div>
              </button>
           </div>
         </div>
       )}

      {/* Recent Records */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-gray-900">Recent Records</h2>
                     <div className="flex items-center space-x-4">
             <Link
               to={user.role === 'doctor' ? '/doctor/records' : '/patient/records'}
               className="text-sm font-medium text-primary-600 hover:text-primary-500"
             >
               View all
             </Link>
           </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {stats.recentRecords.map((record) => (
              <li key={record._id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="truncate flex-1">
                      <Link
                        to={`/records/${record.recordId}`}
                        className="block hover:bg-gray-50 -m-4 p-4 rounded-md"
                      >
                        <div className="flex text-sm">
                          <p className="font-medium text-primary-600 truncate">
                            {record.title}
                          </p>
                          <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                            {record.recordType}
                          </p>
                          {(preloadStatus[record.recordId] === 'loaded' || preloadStatus[record.recordId] === 'cached') && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              ⚡ Ready
                            </span>
                          )}
                          {preloadStatus[record.recordId] === 'loading' && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              ⏳ Loading...
                            </span>
                          )}
                          {record.accessGranted && record.accessGranted.length > 0 && (
                            <div className="ml-2 flex items-center">
                              <UserGroupIcon className="h-4 w-4 text-green-600 mr-1" />
                              <span className="text-xs text-green-600 font-medium">
                                {record.accessGranted.length} doctor{record.accessGranted.length > 1 ? 's' : ''} granted
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex">
                          <div className="flex items-center text-sm text-gray-500">
                            <ClockIcon
                              className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                              aria-hidden="true"
                            />
                            <p>
                              Added on{' '}
                              {new Date(record.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </div>
                                         {(user.role === 'patient' || user.role === 'admin') && (
                       <div className="flex items-center space-x-2">
                         <button
                           onClick={() => handleViewPDF(record.recordId)}
                           className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-600 bg-blue-50 hover:bg-blue-100"
                         >
                           View PDF
                         </button>
                         <button
                           onClick={() => handleGrantAccess(record.recordId)}
                           className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-600 bg-green-50 hover:bg-green-100"
                         >
                           Grant Access
                         </button>
                         <button
                           onClick={() => handleRevokeAccess(record.recordId)}
                           className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-600 bg-red-50 hover:bg-red-100"
                         >
                           Revoke Access
                         </button>
                       </div>
                     )}
                  </div>
                </div>
              </li>
            ))}
            {stats.recentRecords.length === 0 && (
              <li className="px-4 py-5 text-center text-sm text-gray-500">
                No records found
              </li>
            )}
          </ul>
                 </div>
       </div>

       {/* Granted Access Section for Patients/Admins */}
       {(user.role === 'patient' || user.role === 'admin') && (
         <div className="mt-8" data-section="granted-access">
           <h2 className="text-lg font-medium text-gray-900 mb-5">Granted Access</h2>
           <div className="bg-white shadow overflow-hidden sm:rounded-md">
             <ul role="list" className="divide-y divide-gray-200">
               {stats.recentRecords
                 .filter(record => record.accessGranted && record.accessGranted.length > 0)
                 .map((record) => (
                   <li key={record._id}>
                     <div className="px-4 py-4 sm:px-6">
                       <div className="flex items-center justify-between">
                         <div className="flex-1">
                           <div className="flex items-center justify-between">
                             <div>
                               <h3 className="text-sm font-medium text-gray-900">
                                 {record.title}
                               </h3>
                               <p className="text-sm text-gray-500">
                                 {record.recordType} • Added on {new Date(record.createdAt).toLocaleDateString()}
                               </p>
                             </div>
                             <div className="flex items-center space-x-2">
                               <button
                                 onClick={() => handleViewPDF(record.recordId)}
                                 className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-600 bg-blue-50 hover:bg-blue-100"
                               >
                                 View PDF
                               </button>
                             </div>
                           </div>
                           
                           {/* Show granted doctors */}
                           <div className="mt-3">
                             <p className="text-xs font-medium text-gray-700 mb-2">
                               Access granted to:
                             </p>
                             <div className="space-y-2">
                               {record.accessGranted.map((access, index) => (
                                 <div key={index} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                                   <div className="flex items-center space-x-2">
                                     <UserGroupIcon className="h-4 w-4 text-green-600" />
                                     <span className="text-sm text-gray-900">
                                       {access.doctor?.name || access.doctor?.email || 'Unknown Doctor'}
                                     </span>
                                     <span className="text-xs text-gray-500">
                                       (Granted on {new Date(access.grantedAt).toLocaleDateString()})
                                     </span>
                                   </div>
                                   <button
                                     onClick={() => {
                                       setSelectedRecordId(record.recordId);
                                       setDoctorEmail(access.doctor?.email || '');
                                       setShowRevokeAccessModal(true);
                                     }}
                                     className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-600 bg-red-50 hover:bg-red-100"
                                   >
                                     Revoke
                                   </button>
                                 </div>
                               ))}
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>
                   </li>
                 ))}
               {stats.recentRecords.filter(record => record.accessGranted && record.accessGranted.length > 0).length === 0 && (
                 <li className="px-4 py-5 text-center text-sm text-gray-500">
                   No records with granted access found
                 </li>
               )}
             </ul>
           </div>
         </div>
       )}

       {/* Grant Access Modal */}
       {showGrantAccessModal && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
           <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
             <div className="mt-3">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-medium text-gray-900">Grant Access to Doctor</h3>
                 <button
                   onClick={closeGrantAccessModal}
                   className="text-gray-400 hover:text-gray-600"
                 >
                   <XMarkIcon className="h-6 w-6" />
                 </button>
               </div>
               <div className="mt-2">
                 <p className="text-sm text-gray-500 mb-4">
                   Enter the email address of the doctor you want to grant access to this medical record.
                 </p>
                 <input
                   type="email"
                   value={doctorEmail}
                   onChange={(e) => setDoctorEmail(e.target.value)}
                   placeholder="Enter doctor's email address"
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                 />
               </div>
               <div className="flex justify-end space-x-3 mt-6">
                 <button
                   onClick={closeGrantAccessModal}
                   className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleGrantAccessSubmit}
                   disabled={!doctorEmail.trim() || grantLoading}
                   className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {grantLoading ? 'Granting...' : 'Grant Access'}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Revoke Access Modal */}
       {showRevokeAccessModal && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
           <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
             <div className="mt-3">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-medium text-gray-900">Revoke Access from Doctor</h3>
                 <button
                   onClick={closeRevokeAccessModal}
                   className="text-gray-400 hover:text-gray-600"
                 >
                   <XMarkIcon className="h-6 w-6" />
                 </button>
               </div>
               <div className="mt-2">
                 <p className="text-sm text-gray-500 mb-4">
                   Enter the email address of the doctor you want to revoke access from this medical record.
                 </p>
                 <input
                   type="email"
                   value={doctorEmail}
                   onChange={(e) => setDoctorEmail(e.target.value)}
                   placeholder="Enter doctor's email address"
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                 />
               </div>
               <div className="flex justify-end space-x-3 mt-6">
                 <button
                   onClick={closeRevokeAccessModal}
                   className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleRevokeAccessSubmit}
                   disabled={!doctorEmail.trim() || revokeLoading}
                   className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {revokeLoading ? 'Revoking...' : 'Revoke Access'}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

     </div>
   );
} 