import React, { useState, useEffect } from 'react';
import { getPendingExpenses, approveExpense, rejectExpense } from '../../api';
import { FaCheck, FaTimes, FaClock } from 'react-icons/fa';

const ExpenseApproval = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [notes, setNotes] = useState('');
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'

  useEffect(() => {
    fetchPendingExpenses();
  }, []);

  const fetchPendingExpenses = async () => {
    try {
      setLoading(true);
      const response = await getPendingExpenses();
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching pending expenses:', error);
      alert('Failed to fetch pending expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (expense, type) => {
    setSelectedExpense(expense);
    setActionType(type);
    setNotes('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (actionType === 'approve') {
        await approveExpense(selectedExpense.id, notes);
        alert('Expense approved successfully');
      } else {
        if (!notes) {
          alert('Rejection reason is required');
          return;
        }
        await rejectExpense(selectedExpense.id, notes);
        alert('Expense rejected successfully');
      }

      fetchPendingExpenses();
      setShowModal(false);
    } catch (error) {
      console.error('Error processing expense:', error);
      alert('Failed to process expense');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading pending expenses...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Expense Approval</h1>
        <span className="badge badge-warning">{expenses.length} Pending</span>
      </div>

      {expenses.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#666', padding: '40px 20px' }}>
            No pending expenses to approve
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Building</th>
                  <th>Amount</th>
                  <th>Submitted By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{new Date(expense.expense_date).toLocaleDateString()}</td>
                    <td>{expense.category}</td>
                    <td>{expense.description || 'N/A'}</td>
                    <td>{expense.building_name || 'General'}</td>
                    <td style={{ fontWeight: '600' }}>{formatCurrency(expense.amount)}</td>
                    <td>{expense.submitted_by_name || 'N/A'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleOpenModal(expense, 'approve')}
                        >
                          <FaCheck /> Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleOpenModal(expense, 'reject')}
                        >
                          <FaTimes /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{actionType === 'approve' ? 'Approve Expense' : 'Reject Expense'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <p><strong>Category:</strong> {selectedExpense.category}</p>
                <p><strong>Amount:</strong> {formatCurrency(selectedExpense.amount)}</p>
                <p><strong>Description:</strong> {selectedExpense.description || 'N/A'}</p>
                <p><strong>Submitted By:</strong> {selectedExpense.submitted_by_name}</p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {actionType === 'approve' ? 'Notes (optional)' : 'Rejection Reason (required)'}
                </label>
                <textarea
                  className="form-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="4"
                  placeholder={actionType === 'approve' ? 'Add any notes...' : 'Enter reason for rejection...'}
                  required={actionType === 'reject'}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button
                  className={`btn ${actionType === 'approve' ? 'btn-success' : 'btn-danger'}`}
                  onClick={handleSubmit}
                >
                  {actionType === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseApproval;
