import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useWeb3React } from '@web3-react/core';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PatientRecords from './pages/PatientRecords';
import DoctorRecords from './pages/DoctorRecords';
import UploadRecord from './pages/UploadRecord';
import ViewRecord from './pages/ViewRecord';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import CreateAdmin from './pages/CreateAdmin';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOTP from './pages/VerifyOTP';
import VerifyEmail from './pages/VerifyEmail';
import RecordAccessLogs from './pages/RecordAccessLogs';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import VersionChecker from './components/VersionChecker';

function App() {
  const { active } = useWeb3React();

  return (
    <ErrorBoundary>
      <AuthProvider>
        <VersionChecker />
        <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/create-admin" element={<CreateAdmin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Protected Routes */}
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* Patient Routes */}
          <Route
            path="/patient/records"
            element={
              <PrivateRoute roles={['patient', 'admin']}>
                <PatientRecords />
              </PrivateRoute>
            }
          />
          <Route
            path="/patient/records/:recordId/access-logs"
            element={
              <PrivateRoute roles={['patient', 'admin']}>
                <RecordAccessLogs />
              </PrivateRoute>
            }
          />
          <Route
            path="/patient/upload"
            element={
              <PrivateRoute roles={['patient', 'admin']}>
                <UploadRecord />
              </PrivateRoute>
            }
          />

          {/* Doctor Routes */}
          <Route
            path="/doctor/records"
            element={
              <PrivateRoute roles={['doctor']}>
                <DoctorRecords />
              </PrivateRoute>
            }
          />

          {/* Common Routes */}
          <Route
            path="/records/:recordId"
            element={
              <PrivateRoute roles={['patient', 'doctor']}>
                <ViewRecord />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App; 