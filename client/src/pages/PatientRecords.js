import React, { useEffect, useState } from 'react';
import { medicalRecordsApi } from '../services/api';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { usePDFPreload, usePDFViewer } from '../hooks/usePDFPreload';
import pdfCache from '../utils/pdfCache';

export default function PatientRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGrantAccessModal, setShowGrantAccessModal] = useState(false);
  const [showRevokeAccessModal, setShowRevokeAccessModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [doctorEmail, setDoctorEmail] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Permission controls
  const [canDownload, setCanDownload] = useState(false);
  const [accessExpiry, setAccessExpiry] = useState('');
  const [viewOnly, setViewOnly] = useState(true);

  // Use PDF preloading and viewing hooks
  const { preloadStatus } = usePDFPreload(records, !loading);
  const { viewPDF, loading: pdfLoading } = usePDFViewer();

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const data = await medicalRecordsApi.getPatientRecords();
        setRecords(data);
      } catch (err) {
        setError('Failed to fetch records');
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

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
    setViewOnly(true);
    setCanDownload(false);
    setAccessExpiry('');
    setShowGrantAccessModal(true);
  };

  const handleGrantAccessSubmit = async () => {
    if (!doctorEmail.trim()) {
      toast.error('Please enter a doctor email');
      return;
    }
    
    setGrantLoading(true);
    try {
      // First grant access
      await medicalRecordsApi.grantAccessByEmail(doctorEmail, selectedRecordId);
      
      // Then update permissions if not default (view-only)
      if (!viewOnly || accessExpiry) {
        await medicalRecordsApi.updateAccessPermissions({
          recordId: selectedRecordId,
          doctorEmail: doctorEmail,
          permissions: {
            canDownload: !viewOnly,
            expiresAt: accessExpiry || null
          }
        });
      }
      
      toast.success(`Access granted successfully! ${viewOnly ? '(View-only)' : '(Download allowed)'}`);
      setShowGrantAccessModal(false);
      // Refresh the records
      const fetchRecords = async () => {
        try {
          const data = await medicalRecordsApi.getPatientRecords();
          setRecords(data);
        } catch (err) {
          setError('Failed to fetch records');
        }
      };
      fetchRecords();
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
      // Refresh the records
      const fetchRecords = async () => {
        try {
          const data = await medicalRecordsApi.getPatientRecords();
          setRecords(data);
        } catch (err) {
          setError('Failed to fetch records');
        }
      };
      fetchRecords();
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

  // Add delete record function
  const handleDeleteRecord = async (recordId) => {
    try {
      setDeleteLoading(true);
      await medicalRecordsApi.deleteRecord(recordId);
      
      // Remove from cache
      pdfCache.remove(recordId);
      
      // Remove from local state
      setRecords(prevRecords => prevRecords.filter(record => record.recordId !== recordId));
      
      // Close confirmation dialog
      setDeleteConfirm(null);
      
      toast.success('Record deleted successfully');
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error(error.response?.data?.message || 'Failed to delete record');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Add delete confirmation dialog
  const showDeleteConfirm = (record) => {
    setDeleteConfirm(record);
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">My Medical Records</h2>
        <Link
          to="/patient/upload"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          Upload New Record
        </Link>
      </div>
      {records.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No records found.</p>
          <Link
            to="/patient/upload"
            className="inline-flex items-center px-4 py-2 mt-4 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-primary-50 hover:bg-primary-100"
          >
            Upload Your First Record
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {records.map((record) => (
            <div key={record._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Link 
                    to={`/records/${record.recordId}`} 
                    className="text-lg font-medium text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    {record.title}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">{record.recordType}</p>
                  <p className="text-sm text-gray-600 mt-2">{record.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Added on {new Date(record.createdAt).toLocaleDateString()}
                  </p>
                </div>
                                 <div className="flex items-center space-x-2">
                   <button
                     onClick={() => handleViewPDF(record.recordId)}
                     className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-600 bg-blue-50 hover:bg-blue-100"
                   >
                     View PDF
                   </button>
                   <Link
                     to={`/patient/records/${record.recordId}/access-logs`}
                     className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-purple-600 bg-purple-50 hover:bg-purple-100"
                   >
                     <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                     </svg>
                     Access Logs
                   </Link>
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
                   <button
                     onClick={() => showDeleteConfirm(record)}
                     className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-800 bg-red-100 hover:bg-red-200"
                     title="Delete Record"
                   >
                     <TrashIcon className="h-4 w-4" />
                   </button>
                 </div>
              </div>
            </div>
          ))}
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
               <div className="mt-2 space-y-4">
                 <div>
                   <p className="text-sm text-gray-500 mb-2">
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

                 {/* Permission Controls */}
                 <div className="border-t pt-4">
                   <h4 className="text-sm font-medium text-gray-900 mb-3">Access Permissions</h4>
                   
                   {/* View-Only Toggle */}
                   <div className="flex items-center justify-between mb-3">
                     <div>
                       <label className="text-sm font-medium text-gray-700">View-Only Mode</label>
                       <p className="text-xs text-gray-500">Prevent doctor from downloading the file</p>
                     </div>
                     <button
                       type="button"
                       onClick={() => {
                         setViewOnly(!viewOnly);
                         setCanDownload(viewOnly);
                       }}
                       className={`${
                         viewOnly ? 'bg-blue-600' : 'bg-gray-200'
                       } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                     >
                       <span
                         className={`${
                           viewOnly ? 'translate-x-5' : 'translate-x-0'
                         } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                       />
                     </button>
                   </div>

                   {/* Access Expiry */}
                   <div>
                     <label className="text-sm font-medium text-gray-700 block mb-1">
                       Access Expiry (Optional)
                     </label>
                     <input
                       type="datetime-local"
                       value={accessExpiry}
                       onChange={(e) => setAccessExpiry(e.target.value)}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                     />
                     <p className="text-xs text-gray-500 mt-1">Leave empty for permanent access</p>
                   </div>

                   {/* Permission Summary */}
                   <div className="mt-3 p-3 bg-blue-50 rounded-md">
                     <p className="text-xs font-medium text-blue-900 mb-1">Permission Summary:</p>
                     <ul className="text-xs text-blue-800 space-y-1">
                       <li>✓ Can view the record</li>
                       <li>{viewOnly ? '✗ Cannot download the file' : '✓ Can download the file'}</li>
                       <li>{accessExpiry ? `✓ Access expires on ${new Date(accessExpiry).toLocaleString()}` : '✓ Permanent access'}</li>
                     </ul>
                   </div>
                 </div>
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

       {/* Delete Confirmation Modal */}
       {deleteConfirm && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
           <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
             <div className="mt-3">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-medium text-gray-900">Delete Record</h3>
                 <button
                   onClick={() => setDeleteConfirm(null)}
                   className="text-gray-400 hover:text-gray-600"
                 >
                   <XMarkIcon className="h-6 w-6" />
                 </button>
               </div>
               <div className="mt-2">
                 <p className="text-sm text-gray-500 mb-4">
                   Are you sure you want to delete "{deleteConfirm.title}"? This action cannot be undone.
                 </p>
               </div>
               <div className="flex justify-end space-x-3 mt-6">
                 <button
                   onClick={() => setDeleteConfirm(null)}
                   className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={() => handleDeleteRecord(deleteConfirm.recordId)}
                   disabled={deleteLoading}
                   className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {deleteLoading ? 'Deleting...' : 'Delete'}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

     </div>
   );
} 