import { useEffect, useState } from 'react';

const CURRENT_VERSION = '1.0.3';
const VERSION_CHECK_INTERVAL = 60000; // Check every 60 seconds

export default function VersionChecker() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Add timestamp to prevent caching of version.json
        const response = await fetch(`/version.json?t=${Date.now()}`);
        const data = await response.json();

        if (data.version !== CURRENT_VERSION) {
          setUpdateMessage(data.message || 'A new version is available');
          setShowUpdatePrompt(true);
        } else if (data.criticalUpdate && data.version === CURRENT_VERSION) {
          // Check if user has old cached files
          const lastRefresh = localStorage.getItem('lastHardRefresh');
          const buildDate = new Date(data.buildDate).getTime();
          
          if (!lastRefresh || parseInt(lastRefresh) < buildDate) {
            setUpdateMessage(data.message || 'Critical update available');
            setShowUpdatePrompt(true);
          }
        }
      } catch (error) {
        console.error('Version check failed:', error);
      }
    };

    // Check immediately on mount
    checkVersion();

    // Check periodically
    const interval = setInterval(checkVersion, VERSION_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    // Store timestamp of hard refresh
    localStorage.setItem('lastHardRefresh', Date.now().toString());
    
    // Force hard refresh
    window.location.reload(true);
  };

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900">Update Required</h3>
        </div>
        
        <p className="text-gray-700 mb-4">{updateMessage}</p>
        
        <p className="text-sm text-gray-600 mb-6">
          Please refresh the page to load the latest version. This ensures all security features are working correctly.
        </p>
        
        <button
          onClick={handleRefresh}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Refresh Now
        </button>
      </div>
    </div>
  );
}
