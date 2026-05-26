import { useEffect, useCallback, useState } from 'react';
import { medicalRecordsApi } from '../services/api';
import pdfCache from '../utils/pdfCache';

// Custom hook for preloading PDFs
export const usePDFPreload = (records, enabled = true) => {
  const [preloadStatus, setPreloadStatus] = useState({});

  const preloadPDF = useCallback(async (recordId) => {
    // Skip if already cached
    if (pdfCache.has(recordId)) {
      setPreloadStatus(prev => ({
        ...prev,
        [recordId]: 'cached'
      }));
      return;
    }

    // Skip if already preloading
    if (preloadStatus[recordId] === 'loading') {
      return;
    }

    try {
      setPreloadStatus(prev => ({
        ...prev,
        [recordId]: 'loading'
      }));

      // CRITICAL: Use skipLog=true for preloading to prevent duplicate access logs
      // Only explicit user actions (View/Download buttons) should create logs
      const blob = await medicalRecordsApi.getPDF(recordId, 'view', true);
      pdfCache.set(recordId, blob);

      setPreloadStatus(prev => ({
        ...prev,
        [recordId]: 'loaded'
      }));
    } catch (error) {
      console.error(`Failed to preload PDF ${recordId}:`, error);
      setPreloadStatus(prev => ({
        ...prev,
        [recordId]: 'error'
      }));
    }
  }, [preloadStatus]);

  useEffect(() => {
    if (!enabled || !records || records.length === 0) {
      return;
    }

    // Preload PDFs with a delay to avoid overwhelming the server
    const preloadWithDelay = async () => {
      for (let i = 0; i < Math.min(records.length, 5); i++) {
        const record = records[i];
        if (record && record.recordId) {
          // Add delay between preloads
          await new Promise(resolve => setTimeout(resolve, i * 1000));
          preloadPDF(record.recordId);
        }
      }
    };

    // Start preloading after a short delay
    const timer = setTimeout(preloadWithDelay, 2000);

    return () => clearTimeout(timer);
  }, [records, enabled, preloadPDF]);

  return { preloadStatus, preloadPDF };
};

// Hook for viewing PDFs with cache support
export const usePDFViewer = () => {
  const [loading, setLoading] = useState(false);

  const viewPDF = useCallback(async (recordId, onError) => {
    setLoading(true);

    try {
      // CRITICAL FIX: Always fetch from server to ensure access logging
      // Clear any cached version first to force a fresh server request
      pdfCache.remove(recordId);
      
      // Always fetch from server to log access
      // This ensures every view is logged for audit trail
      // skipLog=false (default) ensures this action IS logged
      const blob = await medicalRecordsApi.getPDF(recordId, 'view', false);
      pdfCache.set(recordId, blob);

      console.log(`PDF fetched fresh from server for access logging`);

      // Create blob URL
      const pdfUrl = URL.createObjectURL(blob);

      // Open in new tab
      const newWindow = window.open(pdfUrl, '_blank');

      if (!newWindow) {
        throw new Error('Please allow popups for this site to view PDFs');
      }

      // Clean up blob URL after PDF is loaded
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 30000);

      return { success: true };
    } catch (error) {
      console.error('Error viewing PDF:', error);
      if (onError) {
        onError(error);
      }
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  return { viewPDF, loading };
};
