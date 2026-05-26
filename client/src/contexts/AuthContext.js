import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useWeb3React } from '@web3-react/core';
import { injected } from '../utils/connectors';

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { activate, account, library } = useWeb3React();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await api.get('/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      localStorage.removeItem('token');
      setUser(null); // Prevent infinite loop by setting user to null
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);

      // Connect to MetaMask if not connected
      if (!account) {
        await activate(injected);
      }

      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);

      // Connect to MetaMask if not connected
      if (!account) {
        await activate(injected);
      }

      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    // Clear any stored navigation state to ensure fresh start on next login
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/');
    }
  };

  const verifyWallet = async () => {
    try {
      if (!account || !library) {
        throw new Error('Please connect your wallet first');
      }

      const message = `Verify wallet ownership for MedSecure: ${account}`;
      const signature = await library.getSigner().signMessage(message);

      const response = await api.post(
        '/auth/verify-wallet',
        {
          walletAddress: account,
          message,
          signature
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      return response.data;
    } catch (error) {
      setError(error.message || 'Wallet verification failed');
      throw error;
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    verifyWallet,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 