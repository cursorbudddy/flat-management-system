import React, { useState, useEffect } from 'react';
import { getPayments, createPayment, getBuildings, getRentals, getTenants, getOverduePayments, getUpcomingPayments, getFlatsByBuilding } from '../api';
import { useBuilding } from '../context/BuildingContext';
import BuildingSelector from '../components/BuildingSelector';
import { FaPlus, FaMoneyBillWave, FaFilter, FaExclamationTriangle, FaClock } from 'react-icons/fa';

const Payments = () => {
  const { buildings, getEffectiveBuilding, setTabBuilding } = useBuilding();
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [flats, setFlats] = useState([]);
  const [overduePayments, setOverduePayments] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [filters, setFilters] = useState({
    flat_id: '',
    start_date: '',
    end_date: ''
  });

  const [formData, setFormData] = useState({
    rental_agreement_id: '',
    tenant_id: '',
    building_id: '',
    flat_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_type: 'rent',
    payment_method: '',
    remarks: ''
  });

  // Initialize with effective building
  useEffect(() => {
    const effectiveBuilding = getEffectiveBuilding('payments');
    if (effectiveBuilding) {
      setSelectedBuilding(effectiveBuilding);
    } else if (buildings.length > 0) {
      setSelectedBuilding(buildings[0]);
    }
  }, [buildings, getEffectiveBuilding]);

  useEffect(() => {
    if (selectedBuilding) {
      fetchInitialData();
      fetchQuickSelectData();
    }
  }, [selectedBuilding]);

  useEffect(() => {
    if (selectedBuilding) {
      fetchPayments();
    }
  }, [selectedBuilding, filters]);

  const handleBuildingSelect = (building) => {
    setSelectedBuilding(building);
    setTabBuilding('payments', building);
    setFilters({ flat_id: '', start_date: '', end_date: '' }); // Reset filters
  };

  const fetchInitialData = async () => {
    try {
      const params = selectedBuilding ? { building_id: selectedBuilding.id } : {};

      const [tenantsRes, rentalsRes, flatsRes] = await Promise.all([
        getTenants(),
        getRentals({ ...params, is_active: 'true' }),
        selectedBuilding ? getFlatsByBuilding(selectedBuilding.id) : Promise.resolve({ data: [] })
      ]);

      setTenants(tenantsRes.data);
      setRentals(rentalsRes.data);
      setFlats(flatsRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchQuickSelectData = async () => {
    try {
      const params = selectedBuilding ? { building_id: selectedBuilding.id, limit: 5 } : { limit: 5 };

      const [overdueRes, upcomingRes] = await Promise.all([
        getOverduePayments(params).catch(() => ({ data: [] })),
        getUpcomingPayments(params).catch(() => ({ data: [] }))
      ]);

      setOverduePayments(overdueRes.data || []);
      setUpcomingPayments(upcomingRes.data || []);
    } catch (error) {
      console.error('Error fetching quick-select data:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedBuilding) params.building_id = selectedBuilding.id;
      if (filters.flat_id) params.flat_id = filters.flat_id;
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

  const handleQuickSelect = (payment) => {
    setFormData({
      rental_agreement_id: payment.rental_id || '',
      tenant_id: payment.tenant_id || '',
      building_id: payment.building_id || selectedBuilding?.id || '',
      flat_id: payment.flat_id || '',
      payment_date: new Date().toISOString().split('T')[0],
      amount: payment.amount || payment.balance || '',
      payment_type: 'rent',
      payment_method: '',
      remarks: payment.due_date ? `Payment for due date: ${payment.due_date}` : ''
    });
    setShowModal(true);
  };

  const handleOpenModal = () => {
    setFormData({
      rental_agreement_id: '',
      tenant_id: '',
      building_id: selectedBuilding?.id || '',
      flat_id: '',
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
        flat_id: rental.flat_id,
        amount: rental.rental_amount
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        rental_agreement_id: rentalId,
        tenant_id: '',
        building_id: selectedBuilding?.id || '',
        flat_id: '',
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
        flat_id: formData.flat_id ? parseInt(formData.flat_id) : null,
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
      fetchQuickSelectData(); // Refresh quick-select data
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Failed to record payment');
    }
  };

  const formatCurrency = (amount) => {
    return `OMR ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  if (loading && payments.length === 0) {
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

      {/* Building Selector */}
      <BuildingSelector
        buildings={buildings}
        selectedBuilding={selectedBuilding}
        onSelectBuilding={handleBuildingSelect}
      />

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

      {/* Quick Select Sections */}
      <div className="card-grid" style={{ marginTop: '24px' }}>
        {/* Overdue Payments Quick Select */}
        {overduePayments.length > 0 && (
          <div className="card" style={{ borderLeft: '4px solid #dc3545' }}>
            <h3 className="card-title" style={{ color: '#dc3545', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaExclamationTriangle /> Overdue Payments
            </h3>
            <div style={{ marginTop: '16px' }}>
              {overduePayments.slice(0, 5).map((payment) => (
                <div
                  key={payment.id}
                  onClick={() => handleQuickSelect(payment)}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    background: '#fee',
                    borderLeft: '4px solid #dc3545',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fdd'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#fee'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{payment.tenant_name}</div>
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        {payment.building_name} - Flat {payment.flat_number}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                        Due: {formatDate(payment.due_date)} ({payment.days_overdue} days overdue)
                      </div>
                    </div>
                    <div style={{ fontWeight: '600', color: '#dc3545', fontSize: '16px' }}>
                      {formatCurrency(payment.balance || payment.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Payments Quick Select */}
        {upcomingPayments.length > 0 && (
          <div className="card" style={{ borderLeft: '4px solid #ffc107' }}>
            <h3 className="card-title" style={{ color: '#f57c00', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaClock /> Upcoming Payments
            </h3>
            <div style={{ marginTop: '16px' }}>
              {upcomingPayments.slice(0, 5).map((payment) => (
                <div
                  key={payment.id}
                  onClick={() => handleQuickSelect(payment)}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    background: '#fff8e1',
                    borderLeft: '4px solid #ffc107',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fff3cd'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#fff8e1'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{payment.tenant_name}</div>
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        {payment.building_name} - Flat {payment.flat_number}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                        Due: {formatDate(payment.due_date)}
                      </div>
                    </div>
                    <div style={{ fontWeight: '600', color: '#f57c00', fontSize: '16px' }}>
                      {formatCurrency(payment.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters" style={{ marginTop: '24px' }}>
        <div className="filter-group">
          <label className="filter-label">Flat Number</label>
          <select
            className="form-select"
            value={filters.flat_id}
            onChange={(e) => setFilters(prev => ({ ...prev, flat_id: e.target.value }))}
            style={{ width: '200px' }}
            disabled={!selectedBuilding}
          >
            <option value="">All Flats</option>
            {flats.map((flat) => (
              <option key={flat.id} value={flat.id}>
                Flat {flat.flat_number}
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

        {(filters.flat_id || filters.start_date || filters.end_date) && (
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setFilters({ flat_id: '', start_date: '', end_date: '' })}
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
            {filters.flat_id || filters.start_date || filters.end_date
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
                  <label className="form-label">Payment Date</label>
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
                  <label className="form-label">Payment Type</label>
                  <select
                    name="payment_type"
                    className="form-select"
                    value={formData.payment_type}
                    onChange={handleChange}
                  >
                    <option value="rent">Rent</option>
                    <option value="advance">Advance</option>
                    <option value="deposit">Deposit</option>
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
                    placeholder="e.g., Cash, Bank Transfer"
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
                  placeholder="Optional notes about this payment"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  <FaMoneyBillWave /> Record Payment
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
