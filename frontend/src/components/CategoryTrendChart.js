import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import './CategoryTrendChart.css';

const COLORS = [
  '#667eea',
  '#764ba2',
  '#f093fb',
  '#4facfe',
  '#43e97b',
  '#fa709a',
  '#fee140',
  '#30cfd0'
];

const CategoryTrendChart = ({ data, title = 'Expense Trends by Category' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="category-trend-chart-container">
        <h3 className="category-trend-title">{title}</h3>
        <div className="category-trend-empty">
          <p>No expense data available for the selected period</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{payload[0].payload.category}</p>
          <p className="tooltip-value">
            Amount: <strong>OMR {payload[0].value.toFixed(2)}</strong>
          </p>
          <p className="tooltip-count">
            Count: <strong>{payload[0].payload.count} expenses</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="category-trend-chart-container">
      <h3 className="category-trend-title">{title}</h3>
      <div className="category-trend-chart">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="category"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 12, fill: '#666' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#666' }}
              label={{ value: 'Amount (OMR)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#666' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            <Bar
              dataKey="total_amount"
              name="Total Amount (OMR)"
              radius={[8, 8, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="category-trend-summary">
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-label">Total Categories</div>
            <div className="summary-value">{data.length}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Amount</div>
            <div className="summary-value">
              OMR {data.reduce((sum, item) => sum + parseFloat(item.total_amount), 0).toFixed(2)}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Expenses</div>
            <div className="summary-value">
              {data.reduce((sum, item) => sum + parseInt(item.count), 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryTrendChart;
