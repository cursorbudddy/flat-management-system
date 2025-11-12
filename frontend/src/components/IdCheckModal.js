import React from 'react';
import { getFileUrl } from '../api';
import './IdCheckModal.css';
import { FaTimes, FaUser, FaHome, FaCalendar, FaDollarSign, FaIdCard } from 'react-icons/fa';

const IdCheckModal = ({ isOpen, onClose, tenantData, onConfirm, onCancel }) => {
  if (!isOpen || !tenantData) return null;

  const { tenant, lastRental } = tenantData;

  const handleBackdropClick = (e) => {
    if (e.target.className === 'id-check-modal-backdrop') {
      onCancel();
    }
  };

  return (
    <div className="id-check-modal-backdrop" onClick={handleBackdropClick}>
      <div className="id-check-modal">
        <div className="id-check-modal-header">
          <h2>
            <FaUser /> Tenant ID Already Exists
          </h2>
          <button className="id-check-modal-close" onClick={onCancel}>
            <FaTimes />
          </button>
        </div>

        <div className="id-check-modal-body">
          <div className="id-check-warning">
            <p>This ID number is already registered in the system. Here are the details:</p>
          </div>

          <div className="id-check-section">
            <h3>Tenant Information</h3>
            <div className="id-check-info-grid">
              <div className="id-check-info-item">
                <FaUser className="id-check-icon" />
                <div>
                  <label>Name</label>
                  <p>{tenant.name}</p>
                </div>
              </div>
              <div className="id-check-info-item">
                <FaIdCard className="id-check-icon" />
                <div>
                  <label>ID Number</label>
                  <p>{tenant.id_number}</p>
                </div>
              </div>
              <div className="id-check-info-item">
                <FaUser className="id-check-icon" />
                <div>
                  <label>Nationality</label>
                  <p>{tenant.nationality}</p>
                </div>
              </div>
              <div className="id-check-info-item">
                <FaUser className="id-check-icon" />
                <div>
                  <label>Contact</label>
                  <p>{tenant.contact_number}</p>
                </div>
              </div>
            </div>
          </div>

          {lastRental && (
            <div className="id-check-section">
              <h3>Last Rental Information</h3>
              <div className="id-check-info-grid">
                <div className="id-check-info-item">
                  <FaHome className="id-check-icon" />
                  <div>
                    <label>Building & Flat</label>
                    <p>{lastRental.building_name} - Flat {lastRental.flat_number}</p>
                  </div>
                </div>
                <div className="id-check-info-item">
                  <FaDollarSign className="id-check-icon" />
                  <div>
                    <label>Rental Amount</label>
                    <p>OMR {lastRental.rental_amount}</p>
                  </div>
                </div>
                <div className="id-check-info-item">
                  <FaCalendar className="id-check-icon" />
                  <div>
                    <label>Start Date</label>
                    <p>{new Date(lastRental.start_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="id-check-info-item">
                  <FaCalendar className="id-check-icon" />
                  <div>
                    <label>End Date</label>
                    <p>{new Date(lastRental.end_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tenant.id_document_path && (
            <div className="id-check-section">
              <h3>ID Document</h3>
              <div className="id-check-document-preview">
                <img
                  src={getFileUrl(tenant.id_document_path)}
                  alt="Tenant ID Document"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<p>ID document available but preview not accessible</p>';
                  }}
                />
              </div>
            </div>
          )}

          <div className="id-check-question">
            <p>Would you like to pre-fill the form with this tenant's information?</p>
          </div>
        </div>

        <div className="id-check-modal-footer">
          <button className="id-check-btn id-check-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="id-check-btn id-check-btn-confirm" onClick={() => onConfirm(tenant)}>
            Yes, Pre-fill Form
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdCheckModal;
