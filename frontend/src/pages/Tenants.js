import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTenants } from '../api';
import { FaUser, FaEye, FaPlus } from 'react-icons/fa';

const Tenants = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await getTenants();
      setTenants(response.data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      alert('Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.id_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tenant.building_name && tenant.building_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeTenants = filteredTenants.filter(t => t.is_currently_renting);
  const inactiveTenants = filteredTenants.filter(t => !t.is_currently_renting);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading tenants...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Tenants</h1>
        <button className="btn btn-primary" onClick={() => navigate('/new-entry')}>
          <FaPlus /> Add New Tenant
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-label">Total Tenants</div>
          <div className="stat-value">{tenants.length}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Active Rentals</div>
          <div className="stat-value">{tenants.filter(t => t.is_currently_renting).length}</div>
        </div>
        <div className="stat-card secondary">
          <div className="stat-label">Past Tenants</div>
          <div className="stat-value">{tenants.filter(t => !t.is_currently_renting).length}</div>
        </div>
      </div>

      {/* Search */}
      <div className="form-group" style={{ marginBottom: '20px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search by name, ID number, or building..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredTenants.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><FaUser /></div>
          <h3 className="empty-state-title">No Tenants Found</h3>
          <p className="empty-state-text">
            {searchTerm ? 'Try adjusting your search' : 'Start by adding a new tenant'}
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/new-entry')}>
            <FaPlus /> Add New Tenant
          </button>
        </div>
      ) : (
        <>
          {/* Active Tenants */}
          {activeTenants.length > 0 && (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginTop: '24px', marginBottom: '16px' }}>
                Active Tenants ({activeTenants.length})
              </h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>ID Number</th>
                      <th>Nationality</th>
                      <th>Contact</th>
                      <th>Building</th>
                      <th>Flat</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTenants.map((tenant) => (
                      <tr key={tenant.id}>
                        <td style={{ fontWeight: '600' }}>{tenant.name}</td>
                        <td>{tenant.id_number}</td>
                        <td>{tenant.nationality || '-'}</td>
                        <td>{tenant.contact_number || '-'}</td>
                        <td>{tenant.building_name || '-'}</td>
                        <td>{tenant.flat_number ? `Flat ${tenant.flat_number}` : '-'}</td>
                        <td>
                          <span className="badge badge-success">Active</span>
                        </td>
                        <td>
                          <button
                            className="btn btn-small btn-primary"
                            onClick={() => navigate(`/tenants/${tenant.id}`)}
                          >
                            <FaEye /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Inactive Tenants */}
          {inactiveTenants.length > 0 && (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginTop: '32px', marginBottom: '16px' }}>
                Past Tenants ({inactiveTenants.length})
              </h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>ID Number</th>
                      <th>Nationality</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveTenants.map((tenant) => (
                      <tr key={tenant.id}>
                        <td style={{ fontWeight: '600' }}>{tenant.name}</td>
                        <td>{tenant.id_number}</td>
                        <td>{tenant.nationality || '-'}</td>
                        <td>{tenant.contact_number || '-'}</td>
                        <td>
                          <span className="badge badge-secondary">Inactive</span>
                        </td>
                        <td>
                          <button
                            className="btn btn-small btn-primary"
                            onClick={() => navigate(`/tenants/${tenant.id}`)}
                          >
                            <FaEye /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Tenants;
