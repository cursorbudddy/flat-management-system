import React, { useState, useEffect } from 'react';
import { getExpenses, createExpense, getExpenseCategories, getBuildings, getFlatsByBuilding, getExpenseTrendsByCategory } from '../api';
import { FaPlus, FaFileInvoiceDollar } from 'react-icons/fa';
import { useBuilding } from '../context/BuildingContext';
import BuildingSelector from '../components/BuildingSelector';
import CategoryTrendChart from '../components/CategoryTrendChart';

const Expenses = () => {
  // BuildingContext integration
  const { buildings: contextBuildings, getEffectiveBuilding, setTabBuilding } = useBuilding();
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  const [expenses, setExpenses] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [flats, setFlats] = useState([]);
  const [categories, setCategories] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    building_id: '',
    flat_id: '',
    category: '',
    start_date: '',
    end_date: ''
  });
  const [formData, setFormData] = useState({
    building_id: '',
    flat_id: '',
    expense_date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
    payment_method: '',
    remarks: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Initialize with effective building from context
  useEffect(() => {
    if (contextBuildings.length > 0) {
      const effectiveBuilding = getEffectiveBuilding('expenses');
      if (effectiveBuilding) {
        setSelectedBuilding(effectiveBuilding);
      }
    }
  }, [contextBuildings, getEffectiveBuilding]);

  // Fetch flats when building changes
  useEffect(() => {
    if (selectedBuilding) {
      fetchFlats(selectedBuilding.id);
      fetchTrends();
    } else {
      setFlats([]);
    }
  }, [selectedBuilding]);

  useEffect(() => {
    fetchExpenses();
  }, [filters]);

  // Fetch trends when filters change
  useEffect(() => {
    if (filters.start_date && filters.end_date) {
      fetchTrends();
    }
  }, [filters.start_date, filters.end_date, filters.building_id]);

  const fetchInitialData = async () => {
    try {
      const [buildingsRes, categoriesRes] = await Promise.all([
        getBuildings(),
        getExpenseCategories()
      ]);

      setBuildings(buildingsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchFlats = async (buildingId) => {
    try {
      const response = await getFlatsByBuilding(buildingId);
      setFlats(response.data || []);
    } catch (error) {
      console.error('Error fetching flats:', error);
      setFlats([]);
    }
  };

  const fetchTrends = async () => {
    try {
      const params = {};
      if (selectedBuilding) params.building_id = selectedBuilding.id;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      // Only fetch if we have date range
      if (params.start_date && params.end_date) {
        const response = await getExpenseTrendsByCategory(params);
        setTrendData(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching expense trends:', error);
      setTrendData([]);
    }
  };

  const handleBuildingSelect = (building) => {
    setSelectedBuilding(building);
    setTabBuilding('expenses', building);

    // Update filters
    setFilters(prev => ({
      ...prev,
      building_id: building ? building.id : '',
      flat_id: '' // Reset flat when building changes
    }));
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.building_id) params.building_id = filters.building_id;
      if (filters.flat_id) params.flat_id = filters.flat_id;
      if (filters.category) params.category = filters.category;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const response = await getExpenses(params);
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      alert('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      building_id: '',
      flat_id: '',
      expense_date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      amount: '',
      payment_method: '',
      remarks: ''
    });
    setShowModal(true);
  };

  const handleFormBuildingChange = (e) => {
    const buildingId = e.target.value;
    setFormData(prev => ({
      ...prev,
      building_id: buildingId,
      flat_id: '' // Reset flat when building changes
    }));

    // Fetch flats for the selected building
    if (buildingId) {
      fetchFlats(buildingId);
    } else {
      setFlats([]);
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category || !formData.amount) {
      alert('Please fill in category and amount');
      return;
    }

    try {
      const expenseData = {
        building_id: formData.building_id || null,
        flat_id: formData.flat_id || null,
        expense_date: formData.expense_date,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        remarks: formData.remarks
      };

      await createExpense(expenseData);
      alert('Expense recorded successfully');
      handleCloseModal();
      fetchExpenses();
      fetchInitialData(); // Refresh categories
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Failed to record expense');
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

  const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Expense Tracking</h1>
        <button className="btn btn-danger" onClick={handleOpenModal}>
          <FaPlus /> Record Expense
        </button>
      </div>

      {/* Building Selector */}
      <BuildingSelector
        buildings={contextBuildings}
        selectedBuilding={selectedBuilding}
        onSelectBuilding={handleBuildingSelect}
      />

      {/* Summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value">{expenses.length}</div>
        </div>
        <div className="stat-card danger">
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
            onChange={(e) => setFilters(prev => ({ ...prev, building_id: e.target.value, flat_id: '' }))}
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
          <label className="filter-label">Flat</label>
          <select
            className="form-select"
            value={filters.flat_id}
            onChange={(e) => setFilters(prev => ({ ...prev, flat_id: e.target.value }))}
            style={{ width: '180px' }}
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
          <label className="filter-label">Category</label>
          <select
            className="form-select"
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            style={{ width: '180px' }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
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

        {(filters.building_id || filters.flat_id || filters.category || filters.start_date || filters.end_date) && (
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setFilters({ building_id: '', flat_id: '', category: '', start_date: '', end_date: '' })}
            style={{ marginTop: 'auto' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Category Trend Chart */}
      {trendData.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <CategoryTrendChart
            data={trendData}
            title="Expense Trends by Category"
          />
        </div>
      )}

      {/* Expenses Table */}
      {expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><FaFileInvoiceDollar /></div>
          <h3 className="empty-state-title">No Expenses Found</h3>
          <p className="empty-state-text">
            {filters.building_id || filters.category || filters.start_date || filters.end_date
              ? 'Try adjusting your filters'
              : 'Start by recording an expense'}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Building</th>
                <th>Flat</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{formatDate(expense.expense_date)}</td>
                  <td>
                    <span className="badge badge-info">{expense.category}</span>
                  </td>
                  <td>{expense.description || '-'}</td>
                  <td>{expense.building_name || 'General'}</td>
                  <td>{expense.flat_number ? `Flat ${expense.flat_number}` : '-'}</td>
                  <td style={{ fontWeight: '600', color: '#dc3545' }}>
                    {formatCurrency(expense.amount)}
                  </td>
                  <td>{expense.payment_method || '-'}</td>
                  <td>{expense.remarks || '-'}</td>
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
              <h2 className="modal-title">Record Expense</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Expense Date</label>
                  <input
                    type="date"
                    name="expense_date"
                    className="form-input"
                    value={formData.expense_date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Building</label>
                  <select
                    name="building_id"
                    className="form-select"
                    value={formData.building_id}
                    onChange={handleFormBuildingChange}
                  >
                    <option value="">General (Not building-specific)</option>
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
                  <label className="form-label">Flat</label>
                  <select
                    name="flat_id"
                    className="form-select"
                    value={formData.flat_id}
                    onChange={handleChange}
                    disabled={!formData.building_id}
                  >
                    <option value="">Not flat-specific</option>
                    {flats.map((flat) => (
                      <option key={flat.id} value={flat.id}>
                        Flat {flat.flat_number}
                      </option>
                    ))}
                  </select>
                  {formData.building_id && flats.length === 0 && (
                    <small style={{ color: '#666', fontSize: '12px' }}>
                      No flats available in this building
                    </small>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Category</label>
                  <input
                    type="text"
                    name="category"
                    className="form-input"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="e.g., Maintenance, Utilities, Repairs"
                    list="category-list"
                    required
                  />
                  <datalist id="category-list">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                    <option value="Maintenance" />
                    <option value="Utilities" />
                    <option value="Repairs" />
                    <option value="Cleaning" />
                    <option value="Security" />
                    <option value="Insurance" />
                    <option value="Taxes" />
                    <option value="Other" />
                  </datalist>
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

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="form-textarea"
                  value={formData.description}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Brief description of the expense"
                />
              </div>

              <div className="form-row">
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

                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <input
                    type="text"
                    name="remarks"
                    className="form-input"
                    value={formData.remarks}
                    onChange={handleChange}
                    placeholder="Additional notes"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
