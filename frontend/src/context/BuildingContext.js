import React, { createContext, useState, useContext, useEffect } from 'react';
import { getBuildings } from '../api';

const BuildingContext = createContext();

export const useBuilding = () => {
  const context = useContext(BuildingContext);
  if (!context) {
    throw new Error('useBuilding must be used within a BuildingProvider');
  }
  return context;
};

export const BuildingProvider = ({ children }) => {
  const [buildings, setBuildings] = useState([]);
  const [globalBuilding, setGlobalBuilding] = useState(null);
  const [tabSpecificBuildings, setTabSpecificBuildings] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch buildings on mount
  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const response = await getBuildings();
      setBuildings(response.data);

      // Set first building as default global building if none selected
      if (!globalBuilding && response.data.length > 0) {
        setGlobalBuilding(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set global building (affects all tabs)
  const setGlobalBuildingSelection = (building) => {
    setGlobalBuilding(building);
    // Clear tab-specific overrides when global changes
    setTabSpecificBuildings({});
  };

  // Set building for specific tab (temporary override)
  const setTabBuilding = (tabName, building) => {
    setTabSpecificBuildings(prev => ({
      ...prev,
      [tabName]: building
    }));
  };

  // Clear tab-specific building selection
  const clearTabBuilding = (tabName) => {
    setTabSpecificBuildings(prev => {
      const updated = { ...prev };
      delete updated[tabName];
      return updated;
    });
  };

  // Get effective building for a specific tab
  const getEffectiveBuilding = (tabName) => {
    // Tab-specific building takes precedence over global
    return tabSpecificBuildings[tabName] || globalBuilding;
  };

  // Get effective building ID for API calls
  const getEffectiveBuildingId = (tabName) => {
    const building = getEffectiveBuilding(tabName);
    return building ? building.id : null;
  };

  const value = {
    buildings,
    globalBuilding,
    tabSpecificBuildings,
    loading,
    fetchBuildings,
    setGlobalBuildingSelection,
    setTabBuilding,
    clearTabBuilding,
    getEffectiveBuilding,
    getEffectiveBuildingId,
  };

  return (
    <BuildingContext.Provider value={value}>
      {children}
    </BuildingContext.Provider>
  );
};

export default BuildingContext;
