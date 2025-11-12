import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './CustomDurationPicker.css';
import { FaCalendar } from 'react-icons/fa';
import { differenceInDays } from 'date-fns';

const CustomDurationPicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onDurationChange
}) => {
  const [localStartDate, setLocalStartDate] = useState(startDate ? new Date(startDate) : new Date());
  const [localEndDate, setLocalEndDate] = useState(endDate ? new Date(endDate) : null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (localStartDate && localEndDate) {
      const days = differenceInDays(localEndDate, localStartDate);
      setDuration(days >= 0 ? days : 0);

      if (onDurationChange) {
        onDurationChange(days >= 0 ? days : 0);
      }
    }
  }, [localStartDate, localEndDate, onDurationChange]);

  const handleStartDateChange = (date) => {
    setLocalStartDate(date);
    if (onStartDateChange) {
      onStartDateChange(date);
    }

    // If end date is before start date, clear it
    if (localEndDate && date > localEndDate) {
      setLocalEndDate(null);
      if (onEndDateChange) {
        onEndDateChange(null);
      }
    }
  };

  const handleEndDateChange = (date) => {
    setLocalEndDate(date);
    if (onEndDateChange) {
      onEndDateChange(date);
    }
  };

  return (
    <div className="custom-duration-picker">
      <div className="duration-picker-row">
        <div className="duration-picker-field">
          <label>
            <FaCalendar /> Start Date
          </label>
          <DatePicker
            selected={localStartDate}
            onChange={handleStartDateChange}
            dateFormat="dd/MM/yyyy"
            className="duration-date-input"
            placeholderText="Select start date"
            minDate={new Date()}
          />
        </div>

        <div className="duration-picker-field">
          <label>
            <FaCalendar /> End Date
          </label>
          <DatePicker
            selected={localEndDate}
            onChange={handleEndDateChange}
            dateFormat="dd/MM/yyyy"
            className="duration-date-input"
            placeholderText="Select end date"
            minDate={localStartDate || new Date()}
            disabled={!localStartDate}
          />
        </div>
      </div>

      {duration > 0 && (
        <div className="duration-display">
          <div className="duration-badge">
            <span className="duration-number">{duration}</span>
            <span className="duration-label">day{duration !== 1 ? 's' : ''}</span>
          </div>
          <p className="duration-info">
            Duration automatically calculated between selected dates
          </p>
        </div>
      )}

      {!localEndDate && localStartDate && (
        <div className="duration-hint">
          <p>Please select an end date to calculate duration</p>
        </div>
      )}
    </div>
  );
};

export default CustomDurationPicker;
