import React from 'react';
import './BuildingSelector.css';
import { FaBuilding } from 'react-icons/fa';

const BuildingSelector = ({
  buildings,
  selectedBuilding,
  onSelectBuilding,
  showAllInDropdown = false,
  maxCards = 3
}) => {
  // Show first N buildings as cards
  const cardBuildings = buildings.slice(0, maxCards);
  const dropdownBuildings = showAllInDropdown ? buildings : buildings.slice(maxCards);

  const handleCardClick = (building) => {
    onSelectBuilding(building);
  };

  const handleDropdownChange = (e) => {
    const buildingId = parseInt(e.target.value);
    const building = buildings.find(b => b.id === buildingId);
    if (building) {
      onSelectBuilding(building);
    }
  };

  return (
    <div className="building-selector">
      <div className="building-cards-container">
        {cardBuildings.map((building) => (
          <div
            key={building.id}
            className={`building-card ${selectedBuilding?.id === building.id ? 'selected' : ''}`}
            onClick={() => handleCardClick(building)}
          >
            <div className="building-card-icon">
              <FaBuilding />
            </div>
            <div className="building-card-content">
              <h3 className="building-card-name">{building.name}</h3>
              <p className="building-card-info">
                <span className="building-card-flats">{building.total_flats} flats</span>
                <span className="building-card-separator">•</span>
                <span className="building-card-occupied">{building.occupied_flats} occupied</span>
              </p>
            </div>
            {selectedBuilding?.id === building.id && (
              <div className="building-card-selected-indicator">
                <span>✓</span>
              </div>
            )}
          </div>
        ))}

        {dropdownBuildings.length > 0 && (
          <div className="building-dropdown-wrapper">
            <label htmlFor="building-dropdown">
              <FaBuilding /> More Buildings
            </label>
            <select
              id="building-dropdown"
              className="building-dropdown"
              value={selectedBuilding?.id || ''}
              onChange={handleDropdownChange}
            >
              <option value="">Select a building...</option>
              {dropdownBuildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name} ({building.occupied_flats}/{building.total_flats} occupied)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedBuilding && (
        <div className="selected-building-info">
          <p>
            <strong>Selected:</strong> {selectedBuilding.name} - {selectedBuilding.address}
          </p>
        </div>
      )}
    </div>
  );
};

export default BuildingSelector;
