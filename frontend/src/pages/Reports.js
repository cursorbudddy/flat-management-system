import React, { useState, useEffect } from 'react';
import { getBuildings, getPaymentStats, getExpenseStats, getPendingPayments } from '../api';
import { FaChartBar, FaFileAlt } from 'react-icons/fa';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Reports = () => {
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });
  const [paymentStats, setPaymentStats] = useState(null);
  const [expenseStats, setExpenseStats] = useState(null);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6c757d', '#fd7e14', '#6f42c1'];

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [selectedBuilding, dateRange]);

  const fetchBuildings = async () => {
    try {
      const response = await getBuildings();
      setBuildings(response.data);
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const params = {
        start_date: dateRange.start_date,
        end_date: dateRange.end_date
      };

      if (selectedBuilding) {
        params.building_id = selectedBuilding;
      }

      const [paymentsRes, expensesRes, pendingRes] = await Promise.all([
        getPaymentStats(params),
        getExpenseStats(params),
        getPendingPayments(selectedBuilding ? { building_id: selectedBuilding } : {})
      ]);

      setPaymentStats(paymentsRes.data);
      setExpenseStats(expensesRes.data);
      setPendingPayments(pendingRes.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading reports...</p>
      </div>
    );
  }

  const totalPending = pendingPayments.reduce((sum, p) => sum + parseFloat(p.pending_amount), 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Reports & Analytics</h1>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="filters">
          <div className="filter-group">
            <label className="filter-label">Building</label>
            <select
              className="form-select"
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              style={{ width: '200px' }}
            >
              <option value="">All Buildings</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">From Date</label>
            <input
              type="date"
              className="form-input"
              value={dateRange.start_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
              style={{ width: '160px' }}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">To Date</label>
            <input
              type="date"
              className="form-input"
              value={dateRange.end_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
              style={{ width: '160px' }}
            />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card success">
          <div className="stat-label">Total Income</div>
          <div className="stat-value" style={{ fontSize: '22px' }}>
            {formatCurrency(paymentStats?.total_amount)}
          </div>
          <div className="stat-subtext">{paymentStats?.total_payments || 0} payments</div>
        </div>

        <div className="stat-card danger">
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value" style={{ fontSize: '22px' }}>
            {formatCurrency(expenseStats?.summary?.total_sum)}
          </div>
          <div className="stat-subtext">{expenseStats?.summary?.total_count || 0} expenses</div>
        </div>

        <div className="stat-card info">
          <div className="stat-label">Net Income</div>
          <div className="stat-value" style={{ fontSize: '22px' }}>
            {formatCurrency((paymentStats?.total_amount || 0) - (expenseStats?.summary?.total_sum || 0))}
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-label">Pending Payments</div>
          <div className="stat-value" style={{ fontSize: '22px' }}>
            {formatCurrency(totalPending)}
          </div>
          <div className="stat-subtext">{pendingPayments.length} tenants</div>
        </div>
      </div>

      {/* Charts */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', marginTop: '24px' }}>
        {/* Payment Breakdown */}
        <div className="card">
          <h3 className="card-title">Income Breakdown</h3>
          <div style={{ marginTop: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Rent Payments:</span>
                <strong style={{ color: '#28a745' }}>{formatCurrency(paymentStats?.rent_amount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Advance Payments:</span>
                <strong style={{ color: '#17a2b8' }}>{formatCurrency(paymentStats?.advance_amount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Other Payments:</span>
                <strong style={{ color: '#6c757d' }}>{formatCurrency(paymentStats?.other_amount)}</strong>
              </div>
            </div>

            {paymentStats && (paymentStats.rent_amount > 0 || paymentStats.advance_amount > 0 || paymentStats.other_amount > 0) && (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Rent', value: parseFloat(paymentStats.rent_amount || 0) },
                      { name: 'Advance', value: parseFloat(paymentStats.advance_amount || 0) },
                      { name: 'Other', value: parseFloat(paymentStats.other_amount || 0) }
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[0, 1, 2].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="card">
          <h3 className="card-title">Expense Breakdown by Category</h3>
          {expenseStats?.by_category && expenseStats.by_category.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expenseStats.by_category}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="category_amount" fill="#dc3545" name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
              No expense data for the selected period
            </p>
          )}
        </div>
      </div>

      {/* Pending Payments Table */}
      {pendingPayments.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h3 className="card-title">Pending Payments This Month</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Building</th>
                  <th>Flat</th>
                  <th>Rental Amount</th>
                  <th>Total Paid</th>
                  <th>Pending Amount</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayments.map((payment, index) => (
                  <tr key={index}>
                    <td style={{ fontWeight: '600' }}>{payment.tenant_name}</td>
                    <td>{payment.building_name}</td>
                    <td>Flat {payment.flat_number}</td>
                    <td>{formatCurrency(payment.rental_amount)}</td>
                    <td style={{ color: '#28a745' }}>{formatCurrency(payment.total_paid)}</td>
                    <td style={{ fontWeight: '600', color: '#dc3545' }}>
                      {formatCurrency(payment.pending_amount)}
                    </td>
                    <td>{payment.tenant_contact || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
