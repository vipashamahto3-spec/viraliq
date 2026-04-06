import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Signup from './pages/Signup';
import Signin from './pages/Signin';
import Generator from './pages/Generator';
import Analyzer from './pages/Analyzer';
import Pricing from './pages/Pricing';
import PaymentSuccess from './pages/PaymentSuccess';
import AdminTesting from './pages/AdminTesting';
import '@/App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App bg-[#0A0A0A] min-h-screen">
          <Navigation />
          <Toaster position="top-right" theme="dark" />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/signin" element={<Signin />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/admin-testing" element={<AdminTesting />} />
            <Route
              path="/generator"
              element={
                <ProtectedRoute>
                  <Generator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analyzer"
              element={
                <ProtectedRoute>
                  <Analyzer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-success"
              element={
                <ProtectedRoute>
                  <PaymentSuccess />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
