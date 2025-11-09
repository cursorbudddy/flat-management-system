import React, { useState, useEffect } from 'react';
import { getBuildings, createBuilding, updateBuilding, deleteBuilding } from '../api';
import { FaPlus, FaEdit, FaTrash, FaBuilding, FaDoorOpen } from 'react-icons/fa';

const Buildings = () => {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    total_flats: '',
    contact_number: '',
    other_details: ''
  });

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const response = await getBuildings();
      setBuildings(response.data);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      alert('Failed to fetch buildings');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (building = null) => {
    if (building) {
      setEditingBuilding(building);
      setFormData({
        name: building.name,
        address: building.address || '',
        total_flats: building.total_flats,
        contact_number: building.contact_number || '',
        other_details: building.other_details || ''
      });
    } else {
      setEditingBuilding(null);
      setFormData({
        name: '',
        address: '',
        total_flats: '',
        contact_number: '',
        other_details: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBuilding(null);
    setFormData({
      name: '',
      address: '',
      total_flats: '',
      contact_number: '',
      other_details: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.total_flats) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (editingBuilding) {
        await updateBuilding(editingBuilding.id, formData);
        alert('Building updated successfully');
      } else {
        await createBuilding(formData);
        alert('Building created successfully');
      }
      handleCloseModal();
      fetchBuildings();
    } catch (error) {
      console.error('Error saving building:', error);
      alert('Failed to save building');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this building? This will also delete all associated flats and data.')) {
      try {
        await deleteBuilding(id);
        alert('Building deleted successfully');
        fetchBuildings();
      } catch (error) {
        console.error('Error deleting building:', error);
        alert('Failed to delete building');
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading buildings...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Buildings Management</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <FaPlus /> Add Building
        </button>
      </div>

      {buildings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><FaBuilding /></div>
          <h3 className="empty-state-title">No Buildings Found</h3>
          <p className="empty-state-text">Start by adding your first building</p>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <FaPlus /> Add Building
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {buildings.map((building) => (
            <div key={building.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 className="card-title" style={{ marginBottom: 0 }}>{building.name}</h3>
                <div className="table-actions">
                  <button
                    className="btn btn-small btn-primary"
                    onClick={() => handleOpenModal(building)}
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => handleDelete(building.id)}
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              {building.address && (
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
                  {building.address}
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Flats</div>
                  <div style={{ fontSize: '20px', fontWeight: '600' }}>{building.total_flats_count || building.total_flats}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#d4edda', borderRadius: '4px' }}>
                  <div style={{ fontSize: '12px', color: '#155724', marginBottom: '4px' }}>Occupied</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#155724' }}>{building.occupied_flats || 0}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                  <div style={{ fontSize: '12px', color: '#856404', marginBottom: '4px' }}>Vacant</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#856404' }}>{building.vacant_flats || 0}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#d1ecf1', borderRadius: '4px' }}>
                  <div style={{ fontSize: '12px', color: '#0c5460', marginBottom: '4px' }}>Occupancy</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#0c5460' }}>
                    {building.total_flats_count > 0
                      ? ((building.occupied_flats / building.total_flats_count) * 100).toFixed(0)
                      : 0}%
                  </div>
                </div>
              </div>

              {building.contact_number && (
                <div style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
                  <strong>Contact:</strong> {building.contact_number}
                </div>
              )}

              {building.other_details && (
                <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                  {building.other_details}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingBuilding ? 'Edit Building' : 'Add New Building'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label required">Building Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  name="address"
                  className="form-textarea"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Total Number of Flats</label>
                  <input
                    type="number"
                    name="total_flats"
                    className="form-input"
                    value={formData.total_flats}
                    onChange={handleChange}
                    min="1"
                    required
                    disabled={!!editingBuilding}
                  />
                  {editingBuilding && (
                    <small style={{ color: '#666', fontSize: '12px' }}>
                      Cannot change total flats for existing building
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Number</label>
                  <input
                    type="text"
                    name="contact_number"
                    className="form-input"
                    value={formData.contact_number}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Other Details</label>
                <textarea
                  name="other_details"
                  className="form-textarea"
                  value={formData.other_details}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingBuilding ? 'Update' : 'Create'} Building
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Buildings;
