import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - token expired or invalid
      localStorage.removeItem('token');
      // Redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      // Forbidden - insufficient permissions
      console.error('Access denied:', error.response.data);
    }
    return Promise.reject(error);
  }
);

// Buildings
export const getBuildings = () => api.get('/buildings');
export const getBuilding = (id) => api.get(`/buildings/${id}`);
export const createBuilding = (data) => api.post('/buildings', data);
export const updateBuilding = (id, data) => api.put(`/buildings/${id}`, data);
export const deleteBuilding = (id) => api.delete(`/buildings/${id}`);

// Flats
export const getFlats = (params) => api.get('/flats', { params });
export const getFlatsByBuilding = (buildingId) => api.get(`/flats/building/${buildingId}`);
export const getFlat = (id) => api.get(`/flats/${id}`);
export const getFlatHistory = (id) => api.get(`/flats/${id}/history`);
export const updateFlat = (id, data) => api.put(`/flats/${id}`, data);

// Tenants
export const getTenants = () => api.get('/tenants');
export const getTenant = (id) => api.get(`/tenants/${id}`);
export const checkTenantId = (idNumber) => api.get(`/tenants/check-id/${idNumber}`);
export const getTenantPayments = (id, params) => api.get(`/tenants/${id}/payments`, { params });
export const getTenantRentals = (id) => api.get(`/tenants/${id}/rentals`);
export const createTenant = (formData) => api.post('/tenants', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateTenant = (id, formData) => api.put(`/tenants/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteTenant = (id) => api.delete(`/tenants/${id}`);

// Rental Agreements
export const getRentals = (params) => api.get('/rentals', { params });
export const getRental = (id) => api.get(`/rentals/${id}`);
export const getCurrentMonthRentals = (params) => api.get('/rentals/current-month', { params });
export const getLatestRental = () => api.get('/rentals/latest');
export const createRental = (data) => api.post('/rentals', data);
export const updateRental = (id, data) => api.put(`/rentals/${id}`, data);
export const endRental = (id, data) => api.post(`/rentals/${id}/end`, data);
export const deleteRental = (id) => api.delete(`/rentals/${id}`);

// Payments
export const getPayments = (params) => api.get('/payments', { params });
export const getPayment = (id) => api.get(`/payments/${id}`);
export const getPendingPayments = (params) => api.get('/payments/pending', { params });
export const getPaymentStats = (params) => api.get('/payments/stats', { params });
export const createPayment = (data) => api.post('/payments', data);
export const updatePayment = (id, data) => api.put(`/payments/${id}`, data);
export const deletePayment = (id) => api.delete(`/payments/${id}`);

// Expenses
export const getExpenses = (params) => api.get('/expenses', { params });
export const getExpense = (id) => api.get(`/expenses/${id}`);
export const getExpenseCategories = () => api.get('/expenses/categories');
export const getExpenseStats = (params) => api.get('/expenses/stats', { params });
export const getExpenseTrendsByCategory = (params) => api.get('/expenses/trends/category', { params });
export const createExpense = (data) => api.post('/expenses', data);
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);

// Dashboard
export const getDashboardStats = (params) => api.get('/dashboard/stats', { params });
export const getDashboardTrends = (params) => api.get('/dashboard/trends', { params });

// Invoices
export const getInvoices = (params) => api.get('/invoices', { params });
export const getInvoice = (id) => api.get(`/invoices/${id}`);
export const createInvoice = (data) => api.post('/invoices', data);
export const updateInvoice = (id, data) => api.put(`/invoices/${id}`, data);
export const downloadInvoice = (id) => api.get(`/invoices/${id}/download`, {
  responseType: 'blob'
});
export const deleteInvoice = (id) => api.delete(`/invoices/${id}`);

// Payment Schedules
export const getPaymentSchedules = (rentalId) => api.get(`/payment-schedules/${rentalId}`);
export const getOverdueSchedules = (params) => api.get('/payment-schedules/overdue/all', { params });
export const getOverduePayments = (params) => api.get('/payment-schedules/overdue', { params });
export const getUpcomingPayments = (params) => api.get('/payment-schedules/upcoming', { params });
export const getPendingSchedules = (params) => api.get('/payment-schedules/pending/all', { params });
export const generateSchedules = (rentalId) => api.post(`/payment-schedules/${rentalId}/generate`);
export const updateSchedule = (id, data) => api.put(`/payment-schedules/${id}`, data);
export const recordSchedulePayment = (id, data) => api.post(`/payment-schedules/${id}/payment`, data);
export const getNextDuePayment = (rentalId) => api.get(`/payment-schedules/${rentalId}/next-due`);

// Authentication
export const login = (credentials) => api.post('/auth/login', credentials);
export const logout = () => api.post('/auth/logout');
export const getCurrentUser = () => api.get('/auth/me');
export const changePassword = (data) => api.post('/auth/change-password', data);
export const register = (data) => api.post('/auth/register', data);

// Users (Admin only)
export const getUsers = () => api.get('/users');
export const getUser = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const resetUserPassword = (id, newPassword) => api.post(`/users/${id}/reset-password`, { newPassword });
export const getUserStats = () => api.get('/users/stats/overview');

// Expense Approval (Admin only)
export const getPendingExpenses = () => api.get('/expenses/approval/pending');
export const approveExpense = (id, notes) => api.post(`/expenses/${id}/approve`, { approval_notes: notes });
export const rejectExpense = (id, reason) => api.post(`/expenses/${id}/reject`, { approval_notes: reason });

// Reports (Admin only)
export const generateReport = (data) => api.post('/reports/generate', data, { responseType: 'blob' });
export const previewReport = (params) => api.get('/reports/preview', { params });

export default api;
