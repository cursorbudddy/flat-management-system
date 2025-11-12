import React, { useState, useEffect } from 'react';
import { getCurrentMonthRentals } from '../api';
import { useBuilding } from '../context/BuildingContext';
import BuildingSelector from '../components/BuildingSelector';
import { FaFileContract, FaDollarSign, FaCheckCircle, FaClock } from 'react-icons/fa';
import './Rentals.css';

const Rentals = () => {
  const { buildings, getEffectiveBuilding, setTabBuilding } = useBuilding();
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [rentals, setRentals] = useState([]);
  const [summary, setSummary] = useState({
    totalRentals: 0,
    totalAmount: 0,
    collectedAmount: 0,
    balanceAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize with effective building for this tab
    const effectiveBuilding = getEffectiveBuilding('rentals');
    if (effectiveBuilding) {
      setSelectedBuilding(effectiveBuilding);
    } else if (buildings.length > 0) {
      setSelectedBuilding(buildings[0]);
    }
  }, [buildings, getEffectiveBuilding]);

  useEffect(() => {
    if (selectedBuilding) {
      fetchCurrentMonthRentals();
    }
  }, [selectedBuilding]);

  const handleBuildingSelect = (building) => {
    setSelectedBuilding(building);
    setTabBuilding('rentals', building);
  };

  const fetchCurrentMonthRentals = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = selectedBuilding ? { building_id: selectedBuilding.id } : {};
      const response = await getCurrentMonthRentals(params);

      setRentals(response.data);

      // Calculate summary
      const totalAmount = response.data.reduce((sum, r) => sum + parseFloat(r.rental_amount || 0), 0);
      const collectedAmount = response.data.reduce((sum, r) => sum + parseFloat(r.advance_payment || 0), 0);
      const balanceAmount = totalAmount - collectedAmount;

      setSummary({
        totalRentals: response.data.length,
        totalAmount: totalAmount.toFixed(2),
        collectedAmount: collectedAmount.toFixed(2),
        balanceAmount: balanceAmount.toFixed(2)
      });

    } catch (err) {
      console.error('Error fetching rentals:', err);
      setError('Failed to fetch rental data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && rentals.length === 0) {
    return <div className="rentals-loading">Loading rental data...</div>;
  }

  return (
    <div className="rentals-container">
      <div className="rentals-header">
        <h1><FaFileContract /> Current Month Rentals</h1>
        <p className="rentals-subtitle">Active rental agreements for the current month</p>
      </div>

      <BuildingSelector
        buildings={buildings}
        selectedBuilding={selectedBuilding}
        onSelectBuilding={handleBuildingSelect}
      />

      {error && (
        <div className="rentals-error">
          <p>{error}</p>
        </div>
      )}

      <div className="rentals-summary-cards">
        <div className="summary-card-rental">
          <div className="summary-icon">
            <FaFileContract />
          </div>
          <div className="summary-content">
            <div className="summary-label">Total Rentals</div>
            <div className="summary-value">{summary.totalRentals}</div>
          </div>
        </div>

        <div className="summary-card-rental">
          <div className="summary-icon">
            <FaDollarSign />
          </div>
          <div className="summary-content">
            <div className="summary-label">Total Amount</div>
            <div className="summary-value">OMR {summary.totalAmount}</div>
          </div>
        </div>

        <div className="summary-card-rental success">
          <div className="summary-icon">
            <FaCheckCircle />
          </div>
          <div className="summary-content">
            <div className="summary-label">Collected</div>
            <div className="summary-value">OMR {summary.collectedAmount}</div>
          </div>
        </div>

        <div className="summary-card-rental warning">
          <div className="summary-icon">
            <FaClock />
          </div>
          <div className="summary-content">
            <div className="summary-label">Balance</div>
            <div className="summary-value">OMR {summary.balanceAmount}</div>
          </div>
        </div>
      </div>

      <div className="rentals-table-container">
        <table className="rentals-table">
          <thead>
            <tr>
              <th>Contract Number</th>
              <th>Tenant Name</th>
              <th>Building</th>
              <th>Flat</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Duration</th>
              <th>Rental Amount</th>
              <th>Advance</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rentals.length === 0 ? (
              <tr>
                <td colSpan="10" className="no-data">
                  No rental agreements found for the current month
                </td>
              </tr>
            ) : (
              rentals.map((rental) => (
                <tr key={rental.id}>
                  <td className="contract-number">{rental.contract_number}</td>
                  <td className="tenant-name">{rental.tenant_name}</td>
                  <td>{rental.building_name}</td>
                  <td className="flat-number">Flat {rental.flat_number}</td>
                  <td>{new Date(rental.start_date).toLocaleDateString()}</td>
                  <td>{new Date(rental.end_date).toLocaleDateString()}</td>
                  <td>
                    {rental.rental_duration} {rental.rental_duration_unit === 'months' ? 'months' : 'days'}
                  </td>
                  <td className="amount">OMR {parseFloat(rental.rental_amount).toFixed(2)}</td>
                  <td className="amount success">OMR {parseFloat(rental.advance_payment || 0).toFixed(2)}</td>
                  <td className="amount warning">
                    OMR {(parseFloat(rental.rental_amount) - parseFloat(rental.advance_payment || 0)).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Rentals;
