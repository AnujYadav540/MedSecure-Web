import React, { useState, useEffect } from 'react';
import pdfCache from '../utils/pdfCache';
import { TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function PDFCacheStats() {
  const [stats, setStats] = useState(pdfCache.getStats());
  const [showConfirm, setShowConfirm] = useState(false);

  const refreshStats = () => {
    setStats(pdfCache.getStats());
  };

  useEffect(() => {
    // Refresh stats every 5 seconds
    const interval = setInterval(refreshStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = () => {
    pdfCache.clear();
    refreshStats();
    setShowConfirm(false);
  };

  const getCachePercentage = () => {
    return ((stats.size / stats.maxSize) * 100).toFixed(1);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">PDF Cache</h3>
        <button
          onClick={refreshStats}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          title="Refresh stats"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Cache size indicator */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Storage Used</span>
            <span className="font-medium text-gray-900">
              {stats.sizeFormatted} / {stats.maxSizeFormatted}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                getCachePercentage() > 80
                  ? 'bg-red-600'
                  : getCachePercentage() > 50
                  ? 'bg-yellow-600'
                  : 'bg-green-600'
              }`}
              style={{ width: `${Math.min(getCachePercentage(), 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {getCachePercentage()}% used
          </p>
        </div>

        {/* Cached PDFs count */}
        <div className="flex items-center justify-between py-3 border-t border-gray-200">
          <span className="text-sm text-gray-600">Cached PDFs</span>
          <span className="text-sm font-medium text-gray-900">{stats.count}</span>
        </div>

        {/* Cache benefits */}
        {stats.count > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-800">
              ⚡ {stats.count} PDF{stats.count > 1 ? 's' : ''} ready for instant viewing
            </p>
          </div>
        )}

        {/* Clear cache button */}
        {stats.count > 0 && (
          <div className="pt-2">
            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Clear Cache
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 text-center">
                  Clear all cached PDFs?
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearCache}
                    className="flex-1 px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info text */}
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            PDFs are cached for 24 hours to improve loading speed. Cache is automatically managed.
          </p>
        </div>
      </div>
    </div>
  );
}
