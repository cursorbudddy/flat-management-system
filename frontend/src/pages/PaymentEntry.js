import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBuildings, getFlatsByBuilding, createPayment, createInvoice } from '../api';
import { FaSave, FaTimes, FaDownload, FaSearch } from 'react-icons/fa';

const PaymentEntry = () => {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [tenantDetails, setTenantDetails] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentSchedules, setPaymentSchedules] = useState([]);
  const [generatedInvoice, setGeneratedInvoice] = useState(null);

  const [searchData, setSearchData] = useState({
    building_id: '',
    flat_number: ''
  });

  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'Cash',
    fine_amount: '',
    fine_description: '',
    additional_charges: '',
    additional_charges_description: '',
    remarks: ''
  });

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (searchData.building_id) {
      fetchFlats(searchData.building_id);
    }
  }, [searchData.building_id]);

  const fetchBuildings = async () => {
    try {
      const response = await getBuildings();
      setBuildings(response.data);
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchFlats = async (buildingId) => {
    try {
      const response = await getFlatsByBuilding(buildingId);
      setFlats(response.data);
    } catch (error) {
      console.error('Error fetching flats:', error);
    }
  };

  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = async () => {
    if (!searchData.building_id || !searchData.flat_number) {
      alert('Please select building and enter flat number');
      return;
    }

    try {
      setLoading(true);
      setSearchPerformed(true);

      // Find the flat
      const flat = flats.find(f => f.flat_number === searchData.flat_number);

      if (!flat) {
        alert('Flat not found');
        setTenantDetails(null);
        return;
      }

      if (!flat.is_occupied) {
        alert('This flat is currently vacant');
        setTenantDetails(null);
        return;
      }

      // Flat has active rental - get full details
      const response = await fetch(`/api/flats/${flat.id}`);
      const flatData = await response.json();

      // Get payment history
      const paymentsResponse = await fetch(`/api/payments?rental_agreement_id=${flatData.rental_agreement_id}&limit=5`);
      const paymentsData = await paymentsResponse.json();

      // Get payment schedules
      const schedulesResponse = await fetch(`/api/payment-schedules/${flatData.rental_agreement_id}`);
      const schedulesData = await schedulesResponse.json();

      setTenantDetails(flatData);
      setPaymentHistory(paymentsData);
      setPaymentSchedules(schedulesData);

    } catch (error) {
      console.error('Error searching:', error);
      alert('Failed to fetch tenant details');
    } finally {
      setLoading(false);
    }
  };

  const calculateOutstanding = () => {
    if (!paymentSchedules || paymentSchedules.length === 0) return 0;
    return paymentSchedules
      .filter(s => s.status !== 'paid')
      .reduce((sum, s) => sum + parseFloat(s.balance || 0), 0);
  };

  const calculateOverdue = () => {
    if (!paymentSchedules || paymentSchedules.length === 0) return 0;
    return paymentSchedules
      .filter(s => s.is_overdue)
      .reduce((sum, s) => sum + parseFloat(s.balance || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tenantDetails) {
      alert('Please search for a tenant first');
      return;
    }

    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      setLoading(true);

      // Calculate total payment including fines and charges
      const baseAmount = parseFloat(paymentData.amount);
      const fineAmount = parseFloat(paymentData.fine_amount) || 0;
      const additionalCharges = parseFloat(paymentData.additional_charges) || 0;

      // Step 1: Record payment
      const paymentPayload = {
        rental_agreement_id: tenantDetails.rental_agreement_id,
        tenant_id: tenantDetails.tenant_id,
        building_id: searchData.building_id,
        payment_date: new Date().toISOString().split('T')[0],
        amount: baseAmount,
        payment_type: 'rent',
        payment_method: paymentData.payment_method,
        remarks: paymentData.remarks
      };

      const paymentResponse = await createPayment(paymentPayload);

      // Step 2: Find next due schedule for billing period
      const nextDue = paymentSchedules.find(s => s.status !== 'paid');

      // Step 3: Create invoice with fines and charges
      const invoicePayload = {
        rental_agreement_id: tenantDetails.rental_agreement_id,
        tenant_id: tenantDetails.tenant_id,
        building_id: searchData.building_id,
        flat_id: tenantDetails.flat_id,
        billing_period_start: nextDue?.billing_period_start || new Date().toISOString().split('T')[0],
        billing_period_end: nextDue?.billing_period_end || new Date().toISOString().split('T')[0],
        rental_amount: tenantDetails.rental_amount,
        previous_balance: 0,
        late_fee: 0,
        fine_amount: fineAmount,
        fine_description: paymentData.fine_description,
        additional_charges: additionalCharges,
        additional_charges_description: paymentData.additional_charges_description,
        discount: 0,
        notes: paymentData.remarks
      };

      const invoiceResponse = await createInvoice(invoicePayload);

      // Step 4: Update invoice with payment
      await fetch(`/api/invoices/${invoiceResponse.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_received: baseAmount + fineAmount + additionalCharges,
          payment_status: 'paid'
        })
      });

      setGeneratedInvoice(invoiceResponse.data);
      alert('Payment recorded successfully!');

      // Reset payment form
      setPaymentData({
        amount: '',
        payment_method: 'Cash',
        fine_amount: '',
        fine_description: '',
        additional_charges: '',
        additional_charges_description: '',
        remarks: ''
      });

      // Refresh data
      handleSearch();

    } catch (error) {
      console.error('Error recording payment:', error);
      alert(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!generatedInvoice) return;

    try {
      const response = await fetch(`/api/invoices/${generatedInvoice.id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedInvoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice');
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

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Payment Entry - Existing Tenants</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          <FaTimes /> Cancel
        </button>
      </div>

      {/* Search Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 className="card-title">Search by Flat Number</h3>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label required">Building</label>
            <select
              name="building_id"
              className="form-select"
              value={searchData.building_id}
              onChange={handleSearchChange}
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

          <div className="form-group">
            <label className="form-label required">Flat Number</label>
            <input
              type="text"
              name="flat_number"
              className="form-input"
              value={searchData.flat_number}
              onChange={handleSearchChange}
              placeholder="Enter flat number"
              required
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={loading}
            >
              <FaSearch /> Search
            </button>
          </div>
        </div>
      </div>

      {/* Tenant Details Section */}
      {searchPerformed && tenantDetails && (
        <>
          {/* Tenant Information */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 className="card-title">Tenant Information</h3>

            <div className="form-row">
              <div>
                <strong>Name:</strong>
                <p>{tenantDetails.tenant_name}</p>
              </div>
              <div>
                <strong>ID Number:</strong>
                <p>{tenantDetails.tenant_id_number || 'N/A'}</p>
              </div>
              <div>
                <strong>Contact:</strong>
                <p>{tenantDetails.tenant_contact || 'N/A'}</p>
              </div>
            </div>

            <div className="form-row" style={{ marginTop: '16px' }}>
              <div>
                <strong>Contract Number:</strong>
                <p style={{ color: '#007bff', fontWeight: '600' }}>
                  {tenantDetails.contract_number || 'N/A'}
                </p>
              </div>
              <div>
                <strong>Rental Amount:</strong>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#28a745' }}>
                  {formatCurrency(tenantDetails.rental_amount)} / {tenantDetails.rental_period}
                </p>
              </div>
              <div>
                <strong>Lease Period:</strong>
                <p>
                  {formatDate(tenantDetails.start_date)} - {tenantDetails.end_date ? formatDate(tenantDetails.end_date) : 'Ongoing'}
                </p>
              </div>
            </div>
          </div>

          {/* Outstanding Summary */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-label">Total Outstanding</div>
              <div className="stat-value">{formatCurrency(calculateOutstanding())}</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-label">Overdue Amount</div>
              <div className="stat-value">{formatCurrency(calculateOverdue())}</div>
            </div>
          </div>

          {/* Payment History */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 className="card-title">Last 5 Payments</h3>

            {paymentHistory.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Period</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td style={{ fontWeight: '600', color: '#28a745' }}>
                          {formatCurrency(payment.amount)}
                        </td>
                        <td>{payment.payment_method || '-'}</td>
                        <td>
                          {payment.billing_period_start && payment.billing_period_end
                            ? `${formatDate(payment.billing_period_start)} - ${formatDate(payment.billing_period_end)}`
                            : '-'}
                        </td>
                        <td>{payment.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#666' }}>No payment history available</p>
            )}
          </div>

          {/* Payment Entry Form */}
          <form onSubmit={handleSubmit}>
            <div className="card" style={{ marginBottom: '24px' }}>
              <h3 className="card-title">Record New Payment</h3>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Payment Amount</label>
                  <input
                    type="number"
                    name="amount"
                    className="form-input"
                    value={paymentData.amount}
                    onChange={handlePaymentChange}
                    min="0"
                    step="0.01"
                    required
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Payment Method</label>
                  <select
                    name="payment_method"
                    className="form-select"
                    value={paymentData.payment_method}
                    onChange={handlePaymentChange}
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Check">Check</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Online Payment">Online Payment</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fine Amount</label>
                  <input
                    type="number"
                    name="fine_amount"
                    className="form-input"
                    value={paymentData.fine_amount}
                    onChange={handlePaymentChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fine Description</label>
                  <input
                    type="text"
                    name="fine_description"
                    className="form-input"
                    value={paymentData.fine_description}
                    onChange={handlePaymentChange}
                    placeholder="e.g., Late payment fine, Damage penalty"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Additional Charges</label>
                  <input
                    type="number"
                    name="additional_charges"
                    className="form-input"
                    value={paymentData.additional_charges}
                    onChange={handlePaymentChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Additional Charges Description</label>
                  <input
                    type="text"
                    name="additional_charges_description"
                    className="form-input"
                    value={paymentData.additional_charges_description}
                    onChange={handlePaymentChange}
                    placeholder="e.g., Utilities, Cleaning, Parking"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Remarks</label>
                <textarea
                  name="remarks"
                  className="form-textarea"
                  value={paymentData.remarks}
                  onChange={handlePaymentChange}
                  rows="2"
                  placeholder="Additional notes"
                />
              </div>

              {/* Total Summary */}
              {(paymentData.amount || paymentData.fine_amount || paymentData.additional_charges) && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  marginTop: '16px',
                  borderLeft: '4px solid #007bff'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Base Payment:</span>
                    <strong>{formatCurrency(parseFloat(paymentData.amount) || 0)}</strong>
                  </div>
                  {paymentData.fine_amount && parseFloat(paymentData.fine_amount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Fine:</span>
                      <strong style={{ color: '#dc3545' }}>
                        {formatCurrency(parseFloat(paymentData.fine_amount))}
                      </strong>
                    </div>
                  )}
                  {paymentData.additional_charges && parseFloat(paymentData.additional_charges) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Additional Charges:</span>
                      <strong style={{ color: '#dc3545' }}>
                        {formatCurrency(parseFloat(paymentData.additional_charges))}
                      </strong>
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '2px solid #dee2e6',
                    fontSize: '18px'
                  }}>
                    <strong>Total Amount:</strong>
                    <strong style={{ color: '#28a745' }}>
                      {formatCurrency(
                        (parseFloat(paymentData.amount) || 0) +
                        (parseFloat(paymentData.fine_amount) || 0) +
                        (parseFloat(paymentData.additional_charges) || 0)
                      )}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setTenantDetails(null);
                  setSearchPerformed(false);
                  setSearchData({ building_id: '', flat_number: '' });
                }}
              >
                <FaTimes /> Clear
              </button>
              <button
                type="submit"
                className="btn btn-success"
                disabled={loading}
              >
                <FaSave /> {loading ? 'Processing...' : 'Record Payment & Generate Invoice'}
              </button>
            </div>
          </form>

          {/* Generated Invoice */}
          {generatedInvoice && (
            <div className="card" style={{ marginTop: '24px', backgroundColor: '#d4edda', borderLeft: '4px solid #28a745' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="card-title" style={{ marginBottom: '8px', color: '#155724' }}>
                    Invoice Generated Successfully!
                  </h3>
                  <p style={{ color: '#155724', marginBottom: '4px' }}>
                    <strong>Invoice Number:</strong> {generatedInvoice.invoice_number}
                  </p>
                  <p style={{ color: '#155724' }}>
                    <strong>Total Amount:</strong> {formatCurrency(generatedInvoice.total_amount)}
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleDownloadInvoice}
                >
                  <FaDownload /> Download PDF
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {searchPerformed && !tenantDetails && !loading && (
        <div className="empty-state">
          <p>No active rental found for this flat</p>
        </div>
      )}
    </div>
  );
};

export default PaymentEntry;
