import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBuildings, getFlatsByBuilding, createTenant, createRental } from '../api';
import { FaUser, FaSave, FaTimes } from 'react-icons/fa';
import CountryCodeSelector from '../components/CountryCodeSelector';

const NewEntry = () => {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [availableFlats, setAvailableFlats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');

  const [formData, setFormData] = useState({
    // Tenant Details
    name: '',
    id_number: '',
    nationality: '',
    country_code: '+968',
    contact_number: '',
    email: '',
    id_document: null,

    // Rental Details
    building_id: '',
    flat_id: '',
    start_date: new Date().toISOString().split('T')[0],
    duration_value: '',
    duration_unit: 'months',
    rental_amount: '',
    rental_period: 'month',
    advance_amount: ''
  });

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (selectedBuildingId) {
      fetchAvailableFlats(selectedBuildingId);
    } else {
      setAvailableFlats([]);
    }
  }, [selectedBuildingId]);

  const fetchBuildings = async () => {
    try {
      const response = await getBuildings();
      setBuildings(response.data);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      alert('Failed to fetch buildings');
    }
  };

  const fetchAvailableFlats = async (buildingId) => {
    try {
      const response = await getFlatsByBuilding(buildingId);
      // Filter only vacant flats
      const vacant = response.data.filter(flat => !flat.is_occupied);
      setAvailableFlats(vacant);
    } catch (error) {
      console.error('Error fetching flats:', error);
      alert('Failed to fetch available flats');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleBuildingChange = (e) => {
    const buildingId = e.target.value;
    setSelectedBuildingId(buildingId);
    setFormData(prev => ({
      ...prev,
      building_id: buildingId,
      flat_id: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.id_number) {
      alert('Please fill in tenant name and ID number');
      return;
    }

    if (!formData.building_id || !formData.flat_id) {
      alert('Please select a building and flat');
      return;
    }

    if (!formData.duration_value || !formData.rental_amount) {
      alert('Please fill in rental duration and amount');
      return;
    }

    try {
      setLoading(true);

      // Step 1: Create tenant with ID document
      const tenantFormData = new FormData();
      tenantFormData.append('name', formData.name);
      tenantFormData.append('id_number', formData.id_number);
      tenantFormData.append('nationality', formData.nationality);
      tenantFormData.append('country_code', formData.country_code);
      tenantFormData.append('contact_number', formData.contact_number);
      tenantFormData.append('email', formData.email);
      if (formData.id_document) {
        tenantFormData.append('id_document', formData.id_document);
      }

      const tenantResponse = await createTenant(tenantFormData);
      const tenantId = tenantResponse.data.id;

      // Step 2: Create rental agreement
      const rentalData = {
        tenant_id: tenantId,
        flat_id: parseInt(formData.flat_id),
        building_id: parseInt(formData.building_id),
        start_date: formData.start_date,
        duration_value: parseInt(formData.duration_value),
        duration_unit: formData.duration_unit,
        rental_amount: parseFloat(formData.rental_amount),
        rental_period: formData.rental_period,
        advance_amount: formData.advance_amount ? parseFloat(formData.advance_amount) : 0
      };

      await createRental(rentalData);

      alert('Tenant and rental agreement created successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error creating entry:', error);
      alert(error.response?.data?.error || 'Failed to create entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">New Tenant Entry</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tenant Information Section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 className="card-title">Tenant Information</h3>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Full Name</label>
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
              <label className="form-label required">ID Number</label>
              <input
                type="text"
                name="id_number"
                className="form-input"
                value={formData.id_number}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nationality</label>
              <input
                type="text"
                name="nationality"
                className="form-input"
                value={formData.nationality}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <CountryCodeSelector
                  value={formData.country_code}
                  onChange={handleChange}
                  name="country_code"
                />
                <input
                  type="tel"
                  name="contact_number"
                  className="form-input"
                  value={formData.contact_number}
                  onChange={handleChange}
                  placeholder="12345678"
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Upload ID Document</label>
              <input
                type="file"
                name="id_document"
                className="form-input"
                onChange={handleChange}
                accept=".jpg,.jpeg,.png,.pdf"
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                Accepted formats: JPG, PNG, PDF (Max 5MB)
              </small>
            </div>
          </div>
        </div>

        {/* Rental Information Section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 className="card-title">Rental Information</h3>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Building</label>
              <select
                name="building_id"
                className="form-select"
                value={formData.building_id}
                onChange={handleBuildingChange}
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
              <select
                name="flat_id"
                className="form-select"
                value={formData.flat_id}
                onChange={handleChange}
                required
                disabled={!selectedBuildingId}
              >
                <option value="">Select Flat</option>
                {availableFlats.map((flat) => (
                  <option key={flat.id} value={flat.id}>
                    Flat {flat.flat_number}
                  </option>
                ))}
              </select>
              {selectedBuildingId && availableFlats.length === 0 && (
                <small style={{ color: '#dc3545', fontSize: '12px' }}>
                  No vacant flats available in this building
                </small>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Start Date</label>
              <input
                type="date"
                name="start_date"
                className="form-input"
                value={formData.start_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Duration</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  name="duration_value"
                  className="form-input"
                  value={formData.duration_value}
                  onChange={handleChange}
                  min="1"
                  required
                  style={{ flex: 2 }}
                  placeholder="Enter duration"
                />
                <select
                  name="duration_unit"
                  className="form-select"
                  value={formData.duration_unit}
                  onChange={handleChange}
                  style={{ flex: 1 }}
                >
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Rental Amount</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  name="rental_amount"
                  className="form-input"
                  value={formData.rental_amount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                  style={{ flex: 2 }}
                  placeholder="Enter amount"
                />
                <select
                  name="rental_period"
                  className="form-select"
                  value={formData.rental_period}
                  onChange={handleChange}
                  style={{ flex: 1 }}
                >
                  <option value="day">Per Day</option>
                  <option value="month">Per Month</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Advance Given</label>
              <input
                type="number"
                name="advance_amount"
                className="form-input"
                value={formData.advance_amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/')}
            disabled={loading}
          >
            <FaTimes /> Cancel
          </button>
          <button
            type="submit"
            className="btn btn-success"
            disabled={loading}
          >
            <FaSave /> {loading ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewEntry;
