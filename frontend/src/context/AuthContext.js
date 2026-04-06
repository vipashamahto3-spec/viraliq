import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('viraliq_token'));
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API = `${BACKEND_URL}/api`;

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          console.error('Failed to load user:', error);
          localStorage.removeItem('viraliq_token');
          setToken(null);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [token, API]);

  const signup = async (email, password, fullName) => {
    const response = await axios.post(`${API}/auth/signup`, {
      email,
      password,
      full_name: fullName
    });
    setToken(response.data.access_token);
    setUser(response.data.user);
    localStorage.setItem('viraliq_token', response.data.access_token);
    return response.data;
  };

  const signin = async (email, password) => {
    const response = await axios.post(`${API}/auth/signin`, {
      email,
      password
    });
    setToken(response.data.access_token);
    setUser(response.data.user);
    localStorage.setItem('viraliq_token', response.data.access_token);
    return response.data;
  };

  const signout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('viraliq_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signup, signin, signout, API }}>
      {children}
    </AuthContext.Provider>
  );
};
