import React, { useState, useEffect } from 'react';
import { getPayments, createPayment, getBuildings, getRentals, getTenants } from '../api';
import { FaPlus, FaMoneyBillWave, FaFilter } from 'react-icons/fa';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    building_id: '',
    start_date: '',
    end_date: ''
  });
  const [formData, setFormData] = useState({
    rental_agreement_id: '',
    tenant_id: '',
    building_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_type: 'rent',
    payment_method: '',
    remarks: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const [buildingsRes, tenantsRes, rentalsRes] = await Promise.all([
        getBuildings(),
        getTenants(),
        getRentals({ is_active: 'true' })
      ]);

      setBuildings(buildingsRes.data);
      setTenants(tenantsRes.data);
      setRentals(rentalsRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.building_id) params.building_id = filters.building_id;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const response = await getPayments(params);
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      alert('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      rental_agreement_id: '',
      tenant_id: '',
      building_id: '',
      payment_date: new Date().toISOString().split('T')[0],
      amount: '',
      payment_type: 'rent',
      payment_method: '',
      remarks: ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRentalChange = (e) => {
    const rentalId = e.target.value;
    const rental = rentals.find(r => r.id === parseInt(rentalId));

    if (rental) {
      setFormData(prev => ({
        ...prev,
        rental_agreement_id: rentalId,
        tenant_id: rental.tenant_id,
        building_id: rental.building_id,
        amount: rental.rental_amount
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        rental_agreement_id: rentalId,
        tenant_id: '',
        building_id: '',
        amount: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.tenant_id || !formData.building_id || !formData.amount) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const paymentData = {
        rental_agreement_id: formData.rental_agreement_id || null,
        tenant_id: parseInt(formData.tenant_id),
        building_id: parseInt(formData.building_id),
        payment_date: formData.payment_date,
        amount: parseFloat(formData.amount),
        payment_type: formData.payment_type,
        payment_method: formData.payment_method,
        remarks: formData.remarks
      };

      await createPayment(paymentData);
      alert('Payment recorded successfully');
      handleCloseModal();
      fetchPayments();
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Failed to record payment');
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

  const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading payments...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Payment Records</h1>
        <button className="btn btn-success" onClick={handleOpenModal}>
          <FaPlus /> Record Payment
        </button>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-label">Total Payments</div>
          <div className="stat-value">{payments.length}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Total Amount</div>
          <div className="stat-value" style={{ fontSize: '22px' }}>{formatCurrency(totalAmount)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label className="filter-label">Building</label>
          <select
            className="form-select"
            value={filters.building_id}
            onChange={(e) => setFilters(prev => ({ ...prev, building_id: e.target.value }))}
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
            value={filters.start_date}
            onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
            style={{ width: '160px' }}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">To Date</label>
          <input
            type="date"
            className="form-input"
            value={filters.end_date}
            onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
            style={{ width: '160px' }}
          />
        </div>

        {(filters.building_id || filters.start_date || filters.end_date) && (
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setFilters({ building_id: '', start_date: '', end_date: '' })}
            style={{ marginTop: 'auto' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Payments Table */}
      {payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><FaMoneyBillWave /></div>
          <h3 className="empty-state-title">No Payments Found</h3>
          <p className="empty-state-text">
            {filters.building_id || filters.start_date || filters.end_date
              ? 'Try adjusting your filters'
              : 'Start by recording a payment'}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Tenant</th>
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
                  <td>{payment.tenant_name}</td>
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Record Payment</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Active Rental (Optional)</label>
                <select
                  name="rental_agreement_id"
                  className="form-select"
                  value={formData.rental_agreement_id}
                  onChange={handleRentalChange}
                >
                  <option value="">Select Rental (or enter manually below)</option>
                  {rentals.map((rental) => (
                    <option key={rental.id} value={rental.id}>
                      {rental.tenant_name} - {rental.building_name} - Flat {rental.flat_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Tenant</label>
                  <select
                    name="tenant_id"
                    className="form-select"
                    value={formData.tenant_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Tenant</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label required">Building</label>
                  <select
                    name="building_id"
                    className="form-select"
                    value={formData.building_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Building</option>
                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Payment Date</label>
                  <input
                    type="date"
                    name="payment_date"
                    className="form-input"
                    value={formData.payment_date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    className="form-input"
                    value={formData.amount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Payment Type</label>
                  <select
                    name="payment_type"
                    className="form-select"
                    value={formData.payment_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="rent">Rent</option>
                    <option value="advance">Advance</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <input
                    type="text"
                    name="payment_method"
                    className="form-input"
                    value={formData.payment_method}
                    onChange={handleChange}
                    placeholder="e.g., Cash, Bank Transfer, Check"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Remarks</label>
                <textarea
                  name="remarks"
                  className="form-textarea"
                  value={formData.remarks}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
