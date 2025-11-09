import React, { useState } from 'react';
import './CountryCodeSelector.css';

const COUNTRY_CODES = [
  { country: 'Oman', code: '+968', flag: '🇴🇲' },
  { country: 'UAE', code: '+971', flag: '🇦🇪' },
  { country: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
  { country: 'Yemen', code: '+967', flag: '🇾🇪' },
  { country: 'Kuwait', code: '+965', flag: '🇰🇼' },
  { country: 'Qatar', code: '+974', flag: '🇶🇦' },
  { country: 'Egypt', code: '+20', flag: '🇪🇬' },
  { country: 'India', code: '+91', flag: '🇮🇳' },
  { country: 'Bangladesh', code: '+880', flag: '🇧🇩' },
  { country: 'Pakistan', code: '+92', flag: '🇵🇰' },
  { country: 'Sri Lanka', code: '+94', flag: '🇱🇰' },
];

const CountryCodeSelector = ({ value = '+968', onChange, name = 'country_code' }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleSelect = (code) => {
    onChange({ target: { name, value: code } });
    setShowDropdown(false);
    setShowCustomInput(false);
  };

  const handleCustomCode = () => {
    setShowCustomInput(true);
    setShowDropdown(false);
  };

  const handleCustomCodeSubmit = () => {
    if (customCode && customCode.startsWith('+')) {
      onChange({ target: { name, value: customCode } });
      setShowCustomInput(false);
      setCustomCode('');
    } else {
      alert('Please enter a valid country code starting with +');
    }
  };

  const getCurrentCountry = () => {
    const country = COUNTRY_CODES.find(c => c.code === value);
    return country || { country: 'Custom', code: value, flag: '🌍' };
  };

  const currentCountry = getCurrentCountry();

  return (
    <div className="country-code-selector">
      <button
        type="button"
        className="country-code-button"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <span className="flag">{currentCountry.flag}</span>
        <span className="code">{currentCountry.code}</span>
        <span className="arrow">▼</span>
      </button>

      {showDropdown && (
        <div className="country-code-dropdown">
          <div className="dropdown-header">Select Country Code</div>
          <div className="dropdown-list">
            {COUNTRY_CODES.map((country) => (
              <div
                key={country.code}
                className={`dropdown-item ${value === country.code ? 'active' : ''}`}
                onClick={() => handleSelect(country.code)}
              >
                <span className="flag">{country.flag}</span>
                <span className="country-name">{country.country}</span>
                <span className="code">{country.code}</span>
              </div>
            ))}
            <div className="dropdown-divider"></div>
            <div
              className="dropdown-item custom"
              onClick={handleCustomCode}
            >
              <span className="flag">🌍</span>
              <span className="country-name">Custom Country Code</span>
            </div>
          </div>
        </div>
      )}

      {showCustomInput && (
        <div className="custom-code-input-overlay">
          <div className="custom-code-input-box">
            <h3>Enter Custom Country Code</h3>
            <input
              type="text"
              className="form-input"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              placeholder="+XXX"
              maxLength="6"
            />
            <div className="custom-code-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomCode('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCustomCodeSubmit}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryCodeSelector;
