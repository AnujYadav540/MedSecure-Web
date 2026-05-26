import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { medicalRecordsApi, userApi } from '../services/api';
import { toast } from 'react-toastify';
import {
  ClockIcon,
  UserCircleIcon,
  DocumentTextIcon,
  LockClosedIcon,
  LockOpenIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

export default function ViewRecord() {
  const { recordId } = useParams();
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessLoading, setAccessLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [doctorEmail, setDoctorEmail] = useState('');

  useEffect(() => {
    fetchRecord();
  }, [recordId]);

  const fetchRecord = async () => {
    try {
      const data = await medicalRecordsApi.getRecord(recordId);
      setRecord(data);
    } catch (error) {
      toast.error('Failed to fetch record');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const data = await userApi.getAllDoctors();
      setDoctors(data);
    } catch (error) {
      toast.error('Failed to fetch doctors');
    }
  };

  const handleGrantAccess = async (doctorId) => {
    setAccessLoading(true);
    try {
      await medicalRecordsApi.grantAccess(doctorId, recordId);
      toast.success('Access granted successfully');
      fetchRecord();
    } catch (error) {
      toast.error('Failed to grant access');
    } finally {
      setAccessLoading(false);
    }
  };

  const handleRevokeAccess = async (doctorId) => {
    setAccessLoading(true);
    try {
      await medicalRecordsApi.revokeAccess(doctorId, recordId);
      toast.success('Access revoked successfully');
      fetchRecord();
    } catch (error) {
      toast.error('Failed to revoke access');
    } finally {
      setAccessLoading(false);
    }
  };

  const handleGrantAccessByEmail = async () => {
    if (!doctorEmail.trim()) {
      toast.error('Please enter a doctor email');
      return;
    }
    
    setAccessLoading(true);
    try {
      await medicalRecordsApi.grantAccessByEmail(doctorEmail, recordId);
      toast.success('Access granted successfully');
      setDoctorEmail('');
      fetchRecord();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to grant access');
    } finally {
      setAccessLoading(false);
    }
  };

  const handleViewPDF = async () => {
    try {
      // Use the optimized PDF API with caching
      const pdfBlob = await medicalRecordsApi.getPDF(recordId);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Open in new tab for better performance
      const newWindow = window.open(pdfUrl, '_blank');
      
      // Clean up blob URL after a delay to ensure it's loaded
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 10000); // Clean up after 10 seconds
      
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF document. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No record found</h3>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Medical Record Details
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {record.description}
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Title</dt>
              <dd className="mt-1 text-sm text-gray-900">{record.title}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Record Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{record.recordType}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                  {new Date(record.createdAt).toLocaleString()}
                </div>
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Patient</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <div className="flex items-center">
                  <UserCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
                  {record.patient.name}
                </div>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Access Control</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <ul role="list" className="divide-y divide-gray-200">
                  {record.accessGranted.map((access) => (
                    <li
                      key={access.doctor._id}
                      className="py-4 flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <UserCircleIcon className="h-8 w-8 text-gray-400" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {access.doctor.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Granted on{' '}
                            {new Date(access.grantedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {user.role === 'patient' && (
                        <button
                          onClick={() => handleRevokeAccess(access.doctor._id)}
                          disabled={accessLoading}
                          className="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <LockClosedIcon className="h-4 w-4 mr-2" />
                          Revoke Access
                        </button>
                      )}
                    </li>
                  ))}
                  {record.accessGranted.length === 0 && (
                    <li className="py-4 text-center text-sm text-gray-500">
                      No access granted yet
                    </li>
                  )}
                </ul>
              </dd>
            </div>
          </dl>
        </div>
        
        {/* View PDF Button */}
        <div className="bg-gray-50 px-4 py-5 sm:px-6 border-t border-gray-200">
          <div className="flex justify-center">
            <button
              onClick={handleViewPDF}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <EyeIcon className="h-5 w-5 mr-2" />
              View PDF Document
            </button>
          </div>
        </div>
        
        {(user.role === 'patient' || user.role === 'admin') && (
          <div className="bg-gray-50 px-4 py-5 sm:px-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Grant Access to Doctor</h4>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-2">
              <input
                type="email"
                value={doctorEmail}
                onChange={e => setDoctorEmail(e.target.value)}
                placeholder="Enter doctor's email address"
                className="border rounded px-3 py-2 flex-1 max-w-md"
              />
              <button
                onClick={handleGrantAccessByEmail}
                disabled={!doctorEmail.trim() || accessLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LockOpenIcon className="h-4 w-4 mr-2" />
                {accessLoading ? 'Granting...' : 'Grant Access'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Enter a doctor's email address to grant them access to this medical record.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 