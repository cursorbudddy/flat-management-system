import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTenant, getTenantPayments, getTenantRentals } from '../api';
import { FaArrowLeft, FaUser, FaBuilding, FaMoneyBillWave, FaCalendar } from 'react-icons/fa';

const TenantDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [payments, setPayments] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchTenantData();
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchPayments();
    }
  }, [id, dateRange]);

  const fetchTenantData = async () => {
    try {
      setLoading(true);
      const [tenantRes, rentalsRes] = await Promise.all([
        getTenant(id),
        getTenantRentals(id)
      ]);

      setTenant(tenantRes.data);
      setRentals(rentalsRes.data);
    } catch (error) {
      console.error('Error fetching tenant data:', error);
      alert('Failed to fetch tenant details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const params = {};
      if (dateRange.start_date) params.start_date = dateRange.start_date;
      if (dateRange.end_date) params.end_date = dateRange.end_date;

      const paymentsRes = await getTenantPayments(id, params);
      setPayments(paymentsRes.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading tenant details...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="page-container">
        <h2>Tenant not found</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/tenants')}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Tenant Details</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/tenants')}>
          <FaArrowLeft /> Back to Tenants
        </button>
      </div>

      {/* Tenant Information */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 className="card-title">Personal Information</h3>
        <div className="form-row">
          <div>
            <strong>Full Name:</strong>
            <p style={{ marginTop: '4px' }}>{tenant.name}</p>
          </div>
          <div>
            <strong>ID Number:</strong>
            <p style={{ marginTop: '4px' }}>{tenant.id_number}</p>
          </div>
        </div>

        <div className="form-row" style={{ marginTop: '16px' }}>
          <div>
            <strong>Nationality:</strong>
            <p style={{ marginTop: '4px' }}>{tenant.nationality || 'Not specified'}</p>
          </div>
          <div>
            <strong>Contact Number:</strong>
            <p style={{ marginTop: '4px' }}>{tenant.contact_number || 'Not specified'}</p>
          </div>
        </div>

        {tenant.email && (
          <div style={{ marginTop: '16px' }}>
            <strong>Email:</strong>
            <p style={{ marginTop: '4px' }}>{tenant.email}</p>
          </div>
        )}

        {tenant.id_document_path && (
          <div style={{ marginTop: '16px' }}>
            <strong>ID Document:</strong>
            <p style={{ marginTop: '4px' }}>
              <a
                href={`http://localhost:5000${tenant.id_document_path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-small btn-primary"
              >
                View Document
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Current Rental */}
      {tenant.is_currently_renting && tenant.building_name && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 className="card-title">Current Rental</h3>
          <div className="form-row">
            <div>
              <strong>Building:</strong>
              <p style={{ marginTop: '4px' }}>{tenant.building_name}</p>
            </div>
            <div>
              <strong>Flat Number:</strong>
              <p style={{ marginTop: '4px' }}>Flat {tenant.flat_number}</p>
            </div>
          </div>

          <div className="form-row" style={{ marginTop: '16px' }}>
            <div>
              <strong>Rental Amount:</strong>
              <p style={{ marginTop: '4px', fontSize: '18px', fontWeight: '600', color: '#28a745' }}>
                {formatCurrency(tenant.rental_amount)} / {tenant.rental_period}
              </p>
            </div>
            <div>
              <strong>Advance Paid:</strong>
              <p style={{ marginTop: '4px', fontSize: '18px', fontWeight: '600' }}>
                {formatCurrency(tenant.advance_amount || 0)}
              </p>
            </div>
          </div>

          <div className="form-row" style={{ marginTop: '16px' }}>
            <div>
              <strong>Start Date:</strong>
              <p style={{ marginTop: '4px' }}>{formatDate(tenant.start_date)}</p>
            </div>
            <div>
              <strong>End Date:</strong>
              <p style={{ marginTop: '4px' }}>
                {tenant.end_date ? formatDate(tenant.end_date) : 'Ongoing'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="card-title" style={{ marginBottom: 0 }}>Payment History</h3>
          <div className="stat-card success" style={{ padding: '12px 16px' }}>
            <div className="stat-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Total Payments</div>
            <div className="stat-value" style={{ fontSize: '20px' }}>{formatCurrency(totalPayments)}</div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="filters" style={{ marginBottom: '16px' }}>
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
          {(dateRange.start_date || dateRange.end_date) && (
            <button
              className="btn btn-secondary btn-small"
              onClick={() => setDateRange({ start_date: '', end_date: '' })}
              style={{ marginTop: 'auto' }}
            >
              Clear Filter
            </button>
          )}
        </div>

        {payments.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>No payments found</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Building</th>
                  <th>Flat</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.payment_date)}</td>
                    <td>{payment.building_name || '-'}</td>
                    <td>{payment.flat_number ? `Flat ${payment.flat_number}` : '-'}</td>
                    <td>
                      <span className={`badge ${
                        payment.payment_type === 'rent' ? 'badge-success' :
                        payment.payment_type === 'advance' ? 'badge-info' :
                        'badge-secondary'
                      }`}>
                        {payment.payment_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600', color: '#28a745' }}>
                      {formatCurrency(payment.amount)}
                    </td>
                    <td>{payment.payment_method || '-'}</td>
                    <td>{payment.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rental History */}
      <div className="card">
        <h3 className="card-title">Rental History</h3>

        {rentals.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>No rental history</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Building</th>
                  <th>Flat</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Rental Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rentals.map((rental) => (
                  <tr key={rental.id}>
                    <td>{rental.building_name}</td>
                    <td>Flat {rental.flat_number}</td>
                    <td>{formatDate(rental.start_date)}</td>
                    <td>{rental.end_date ? formatDate(rental.end_date) : 'Ongoing'}</td>
                    <td style={{ fontWeight: '600' }}>
                      {formatCurrency(rental.rental_amount)} / {rental.rental_period}
                    </td>
                    <td>
                      <span className={`badge ${rental.is_active ? 'badge-success' : 'badge-secondary'}`}>
                        {rental.is_active ? 'Active' : 'Ended'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantDetails;
