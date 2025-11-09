import React, { useState } from 'react';
import { generateReport } from '../../api';
import { FaDownload, FaCalendar } from 'react-icons/fa';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState('6months');
  const [customDates, setCustomDates] = useState({
    start_date: '',
    end_date: ''
  });

  const handleGenerate = async () => {
    setLoading(true);

    try {
      const data = {
        range: selectedRange,
        ...(selectedRange === 'custom' && customDates)
      };

      const response = await generateReport(data);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `admin-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      alert('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Admin Reports</h1>
      </div>

      <div className="card">
        <h3 className="card-title">Generate Comprehensive Report</h3>

        <div className="form-group">
          <label className="form-label">Report Range</label>
          <select
            className="form-select"
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            disabled={loading}
          >
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {selectedRange === 'custom' && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={customDates.start_date}
                onChange={(e) => setCustomDates(prev => ({ ...prev, start_date: e.target.value }))}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={customDates.end_date}
                onChange={(e) => setCustomDates(prev => ({ ...prev, end_date: e.target.value }))}
                disabled={loading}
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px' }}>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={loading || (selectedRange === 'custom' && (!customDates.start_date || !customDates.end_date))}
          >
            <FaDownload /> {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>

        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Report Includes:</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
            <li>Financial summary (income, expenses, net income)</li>
            <li>Building summaries with occupancy rates</li>
            <li>Complete tenant details with payment history</li>
            <li>Detailed payment records</li>
            <li>Approved expense records</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Reports;
