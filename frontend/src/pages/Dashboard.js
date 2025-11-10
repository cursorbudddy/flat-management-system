import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getDashboardTrends, getBuildings, getOverdueSchedules } from '../api';
import { FaBuilding, FaDoorOpen, FaUsers, FaMoneyBillWave, FaExclamationTriangle, FaPlus, FaList, FaSearch } from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_buildings: 0,
    total_flats: 0,
    occupied_flats: 0,
    vacant_flats: 0,
    active_tenants: 0,
    today_income: 0,
    month_income: 0,
    today_expense: 0,
    month_expense: 0,
    pending_payments: 0,
    today_net: 0,
    month_net: 0,
    recent_payments: [],
    recent_expenses: []
  });
  const [trends, setTrends] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [overduePayments, setOverduePayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedBuilding]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = selectedBuilding ? { building_id: selectedBuilding } : {};

      const [statsRes, trendsRes, buildingsRes, overdueRes] = await Promise.all([
        getDashboardStats(params),
        getDashboardTrends(params),
        getBuildings(),
        getOverdueSchedules(params)
      ]);

      setStats(statsRes.data);
      setTrends(trendsRes.data);
      setBuildings(buildingsRes.data);
      setOverduePayments(overdueRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
          <button className="btn btn-primary" onClick={() => navigate('/new-entry')}>
            <FaPlus /> New Entry
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card info">
          <div className="stat-label">Total Buildings</div>
          <div className="stat-value">{stats.total_buildings}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Flats</div>
          <div className="stat-value">{stats.total_flats}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Occupied Flats</div>
          <div className="stat-value">{stats.occupied_flats}</div>
          <div className="stat-subtext">
            {stats.total_flats > 0 ? ((stats.occupied_flats / stats.total_flats) * 100).toFixed(1) : 0}% occupancy
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Vacant Flats</div>
          <div className="stat-value">{stats.vacant_flats}</div>
        </div>
        <div className="stat-card info">
          <div className="stat-label">Active Tenants</div>
          <div className="stat-value">{stats.active_tenants}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">Pending Payments</div>
          <div className="stat-value">{stats.pending_payments}</div>
        </div>
      </div>

      {/* Income and Expenses Today */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="card">
          <h3 className="card-title">Today's Summary</h3>
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#666' }}>Income:</span>
              <span style={{ fontWeight: '600', color: '#28a745' }}>{formatCurrency(stats.today_income)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#666' }}>Expenses:</span>
              <span style={{ fontWeight: '600', color: '#dc3545' }}>{formatCurrency(stats.today_expense)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #ddd' }}>
              <span style={{ fontWeight: '600' }}>Net:</span>
              <span style={{ fontWeight: '700', color: stats.today_net >= 0 ? '#28a745' : '#dc3545' }}>
                {formatCurrency(stats.today_net)}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">This Month's Summary</h3>
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#666' }}>Income:</span>
              <span style={{ fontWeight: '600', color: '#28a745' }}>{formatCurrency(stats.month_income)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#666' }}>Expenses:</span>
              <span style={{ fontWeight: '600', color: '#dc3545' }}>{formatCurrency(stats.month_expense)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #ddd' }}>
              <span style={{ fontWeight: '600' }}>Net:</span>
              <span style={{ fontWeight: '700', color: stats.month_net >= 0 ? '#28a745' : '#dc3545' }}>
                {formatCurrency(stats.month_net)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="card-title">Quick Actions</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/new-entry')}>
            <FaPlus /> New Tenant Entry
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/flats')}>
            <FaList /> View All Flats
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/tenants')}>
            <FaUsers /> View Tenants
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/payments')}>
            <FaMoneyBillWave /> Record Payment
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/expenses')}>
            <FaMoneyBillWave /> Record Expense
          </button>
        </div>
      </div>

      {/* Trends Chart */}
      {trends.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h3 className="card-title">Income & Expense Trends (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDate} />
              <YAxis />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                labelFormatter={formatDate}
              />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#28a745" strokeWidth={2} name="Income" />
              <Line type="monotone" dataKey="expense" stroke="#dc3545" strokeWidth={2} name="Expense" />
              <Line type="monotone" dataKey="net" stroke="#007bff" strokeWidth={2} name="Net" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Overdue Payments */}
      {overduePayments.length > 0 && (
        <div className="card" style={{ marginTop: '24px', borderLeft: '4px solid #dc3545' }}>
          <h3 className="card-title" style={{ color: '#dc3545' }}>
            <FaExclamationTriangle /> Overdue Payments ({overduePayments.length})
          </h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Building</th>
                  <th>Flat</th>
                  <th>Due Date</th>
                  <th>Days Overdue</th>
                  <th>Amount</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {overduePayments.slice(0, 10).map((payment) => (
                  <tr key={payment.id}>
                    <td style={{ fontWeight: '600' }}>{payment.tenant_name}</td>
                    <td>{payment.building_name}</td>
                    <td>Flat {payment.flat_number}</td>
                    <td>{new Date(payment.due_date).toLocaleDateString()}</td>
                    <td>
                      <span className="badge badge-danger">
                        {payment.days_overdue} days
                      </span>
                    </td>
                    <td style={{ fontWeight: '600', color: '#dc3545' }}>
                      {formatCurrency(payment.balance)}
                    </td>
                    <td>{payment.tenant_contact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Activities */}
      <div className="card-grid" style={{ marginTop: '24px' }}>
        <div className="card">
          <h3 className="card-title">Recent Payments</h3>
          {stats.recent_payments.length > 0 ? (
            <div style={{ marginTop: '16px' }}>
              {stats.recent_payments.map((payment) => (
                <div
                  key={payment.id}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600' }}>{payment.tenant_name}</div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {payment.building_name} - Flat {payment.flat_number}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ fontWeight: '600', color: '#28a745' }}>
                    {formatCurrency(payment.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', marginTop: '16px' }}>No recent payments</p>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">Recent Expenses</h3>
          {stats.recent_expenses.length > 0 ? (
            <div style={{ marginTop: '16px' }}>
              {stats.recent_expenses.map((expense) => (
                <div
                  key={expense.id}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600' }}>{expense.category}</div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {expense.description || expense.building_name || 'General'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {new Date(expense.expense_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ fontWeight: '600', color: '#dc3545' }}>
                    {formatCurrency(expense.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', marginTop: '16px' }}>No recent expenses</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
