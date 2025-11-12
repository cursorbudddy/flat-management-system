import React, { useState } from 'react';
import './NationalityDropdown.css';

const NATIONALITIES = [
  'Omani',
  'Indian',
  'Bangladeshi',
  'Pakistani',
  'Yemeni',
  'Emirati',
  'Egyptian',
  'Thai',
  'Vietnamese',
  'Filipino',
  'Sudanese',
  'Saudi Arabian',
  'Kuwaiti',
  'Qatari',
  'Other'
];

const NationalityDropdown = ({ value, onChange, className = '' }) => {
  const [showOtherInput, setShowOtherInput] = useState(
    value && !NATIONALITIES.includes(value)
  );
  const [selectedValue, setSelectedValue] = useState(
    value && NATIONALITIES.includes(value) ? value : (value ? 'Other' : '')
  );
  const [otherValue, setOtherValue] = useState(
    value && !NATIONALITIES.includes(value) ? value : ''
  );

  const handleDropdownChange = (e) => {
    const newValue = e.target.value;
    setSelectedValue(newValue);

    if (newValue === 'Other') {
      setShowOtherInput(true);
      onChange(''); // Clear value when "Other" is selected
    } else {
      setShowOtherInput(false);
      setOtherValue('');
      onChange(newValue);
    }
  };

  const handleOtherInputChange = (e) => {
    const newValue = e.target.value;
    setOtherValue(newValue);
    onChange(newValue);
  };

  return (
    <div className={`nationality-dropdown-wrapper ${className}`}>
      <select
        className="nationality-dropdown"
        value={selectedValue}
        onChange={handleDropdownChange}
        required
      >
        <option value="">Select Nationality</option>
        {NATIONALITIES.map((nationality) => (
          <option key={nationality} value={nationality}>
            {nationality}
          </option>
        ))}
      </select>

      {showOtherInput && (
        <input
          type="text"
          className="nationality-other-input"
          placeholder="Please specify nationality"
          value={otherValue}
          onChange={handleOtherInputChange}
          required
        />
      )}
    </div>
  );
};

export default NationalityDropdown;
