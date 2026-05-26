import React, { useEffect, useState } from 'react';
import { medicalRecordsApi } from '../services/api';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { usePDFPreload, usePDFViewer } from '../hooks/usePDFPreload';
import { EyeIcon, DocumentTextIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function DoctorRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Use PDF preloading and viewing hooks
  const { preloadStatus } = usePDFPreload(records, !loading);
  const { viewPDF, loading: pdfLoading } = usePDFViewer();

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const data = await medicalRecordsApi.getDoctorRecords();
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

  const handleDownloadPDF = async (recordId, recordTitle) => {
    try {
      toast.info('Downloading PDF...');
      
      // Call API with 'download' action and skipLog=false to ensure logging
      const blob = await medicalRecordsApi.getPDF(recordId, 'download', false);
      
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
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Accessible Patient Records</h2>
        <p className="mt-1 text-sm text-gray-500">
          Medical records that patients have shared with you
        </p>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No records available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Patients haven't shared any records with you yet.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {records.map((record) => (
              <li key={record._id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/records/${record.recordId}`}
                        className="block focus:outline-none"
                      >
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <p className="text-sm font-medium text-primary-600 truncate hover:underline">
                            {record.title}
                          </p>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {record.recordType}
                          </span>
                          {preloadStatus[record.recordId] === 'loaded' && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              ⚡ Cached
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <UserIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          <span className="truncate">
                            Patient: {record.patient?.name || 'Unknown'}
                          </span>
                          <ClockIcon className="flex-shrink-0 ml-4 mr-1.5 h-4 w-4 text-gray-400" />
                          <span>
                            Added {new Date(record.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {record.description && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {record.description}
                          </p>
                        )}
                      </Link>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      <button
                        onClick={() => handleViewPDF(record.recordId)}
                        disabled={pdfLoading}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(record.recordId, record.title)}
                        disabled={pdfLoading}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 