import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';

// Context
import { AuthProvider } from './context/AuthContext';
import { BuildingProvider } from './context/BuildingContext';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Buildings from './pages/Buildings';
import Flats from './pages/Flats';
import Tenants from './pages/Tenants';
import TenantDetails from './pages/TenantDetails';
import NewEntry from './pages/NewEntry';
import PaymentEntry from './pages/PaymentEntry';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Rentals from './pages/Rentals';

// Admin Pages
import UserManagement from './pages/admin/UserManagement';
import AdminReports from './pages/admin/Reports';
import ExpenseApproval from './pages/admin/ExpenseApproval';

const AppContent = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="App">
      {!isLoginPage && <Navbar />}
      <div className={isLoginPage ? '' : 'main-content'}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes - All Users */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/flats" element={<ProtectedRoute><Flats /></ProtectedRoute>} />
          <Route path="/rentals" element={<ProtectedRoute><Rentals /></ProtectedRoute>} />
          <Route path="/new-entry" element={<ProtectedRoute><NewEntry /></ProtectedRoute>} />
          <Route path="/payment-entry" element={<ProtectedRoute><PaymentEntry /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />

          {/* Protected Routes - Admin Only */}
          <Route path="/buildings" element={<ProtectedRoute requireAdmin><Buildings /></ProtectedRoute>} />
          <Route path="/tenants" element={<ProtectedRoute requireAdmin><Tenants /></ProtectedRoute>} />
          <Route path="/tenants/:id" element={<ProtectedRoute requireAdmin><TenantDetails /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute requireAdmin><Payments /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute requireAdmin><Reports /></ProtectedRoute>} />

          {/* Admin Panel Routes */}
          <Route path="/admin/users" element={<ProtectedRoute requireAdmin><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute requireAdmin><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/expense-approval" element={<ProtectedRoute requireAdmin><ExpenseApproval /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <BuildingProvider>
          <AppContent />
        </BuildingProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
