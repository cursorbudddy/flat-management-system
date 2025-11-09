import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column'
      }}>
        <div className="spinner" style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #667eea',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '20px', color: '#666' }}>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin()) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '500px',
          textAlign: 'center',
          backgroundColor: '#fff3cd',
          padding: '30px',
          borderRadius: '12px',
          border: '2px solid #ffc107'
        }}>
          <h2 style={{ color: '#856404', marginTop: 0 }}>Access Denied</h2>
          <p style={{ color: '#856404', marginBottom: '20px' }}>
            You don't have permission to access this page. This page is restricted to administrators only.
          </p>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '10px 24px',
              backgroundColor: '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
