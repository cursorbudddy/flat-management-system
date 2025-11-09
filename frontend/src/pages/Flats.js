import React, { useState, useEffect } from 'react';
import { getFlats, getBuildings } from '../api';
import { FaDoorOpen, FaUser, FaFilter } from 'react-icons/fa';

const Flats = () => {
  const [flats, setFlats] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    building_id: '',
    status: 'all'
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchFlats();
  }, [filters]);

  const fetchData = async () => {
    try {
      const buildingsRes = await getBuildings();
      setBuildings(buildingsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchFlats = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status !== 'all') {
        params.status = filters.status;
      }

      const response = await getFlats(params);
      let filteredFlats = response.data;

      // Filter by building if selected
      if (filters.building_id) {
        filteredFlats = filteredFlats.filter(
          flat => flat.building_id === parseInt(filters.building_id)
        );
      }

      setFlats(filteredFlats);
    } catch (error) {
      console.error('Error fetching flats:', error);
      alert('Failed to fetch flats');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
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
        <p>Loading flats...</p>
      </div>
    );
  }

  const occupiedFlats = flats.filter(f => f.is_occupied).length;
  const vacantFlats = flats.filter(f => !f.is_occupied).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Flats Overview</h1>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-label">Total Flats</div>
          <div className="stat-value">{flats.length}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Occupied</div>
          <div className="stat-value">{occupiedFlats}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Vacant</div>
          <div className="stat-value">{vacantFlats}</div>
        </div>
        <div className="stat-card info">
          <div className="stat-label">Occupancy Rate</div>
          <div className="stat-value">
            {flats.length > 0 ? ((occupiedFlats / flats.length) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label className="filter-label">Building</label>
          <select
            className="form-select"
            value={filters.building_id}
            onChange={(e) => handleFilterChange('building_id', e.target.value)}
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
          <label className="filter-label">Status</label>
          <select
            className="form-select"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="all">All</option>
            <option value="occupied">Occupied</option>
            <option value="vacant">Vacant</option>
          </select>
        </div>
      </div>

      {/* Flats Grid */}
      {flats.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><FaDoorOpen /></div>
          <h3 className="empty-state-title">No Flats Found</h3>
          <p className="empty-state-text">
            {filters.building_id || filters.status !== 'all'
              ? 'Try adjusting your filters'
              : 'Add buildings to see flats here'}
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {flats.map((flat) => (
            <div key={flat.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 className="card-title" style={{ marginBottom: 0 }}>
                  Flat {flat.flat_number}
                </h3>
                <span className={`badge ${flat.is_occupied ? 'badge-success' : 'badge-warning'}`}>
                  {flat.is_occupied ? 'Occupied' : 'Vacant'}
                </span>
              </div>

              <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <FaDoorOpen />
                  <span>{flat.building_name}</span>
                </div>
                {flat.floor_number && (
                  <div style={{ marginLeft: '22px', fontSize: '13px' }}>
                    Floor: {flat.floor_number}
                  </div>
                )}
              </div>

              {flat.is_occupied && flat.tenant_name && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  borderLeft: '3px solid #28a745'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <FaUser style={{ color: '#666' }} />
                    <strong>{flat.tenant_name}</strong>
                  </div>

                  {flat.rental_amount && (
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      Rent: <strong>{formatCurrency(flat.rental_amount)}</strong>
                      {flat.rental_period && ` / ${flat.rental_period}`}
                    </div>
                  )}

                  {flat.start_date && (
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      Start: {new Date(flat.start_date).toLocaleDateString()}
                    </div>
                  )}

                  {flat.end_date && (
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      End: {new Date(flat.end_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}

              {!flat.is_occupied && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#fff3cd',
                  borderRadius: '4px',
                  textAlign: 'center',
                  color: '#856404'
                }}>
                  Available for Rent
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Flats;
