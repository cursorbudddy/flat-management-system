const express = require('express');
const router = express.Router();
const moment = require('moment');
const adminReportGenerator = require('../utils/adminReportGenerator');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * POST /api/reports/generate
 * Generate comprehensive admin report
 * Admin only - with date range options
 */
router.post('/generate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { range, start_date, end_date, building_id } = req.body;

    let startDate, endDate;

    // Calculate date range
    if (range === '6months') {
      startDate = moment().subtract(6, 'months').format('YYYY-MM-DD');
      endDate = moment().format('YYYY-MM-DD');
    } else if (range === '12months') {
      startDate = moment().subtract(12, 'months').format('YYYY-MM-DD');
      endDate = moment().format('YYYY-MM-DD');
    } else if (range === 'custom') {
      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'Start date and end date are required for custom range' });
      }
      startDate = moment(start_date).format('YYYY-MM-DD');
      endDate = moment(end_date).format('YYYY-MM-DD');
    } else {
      return res.status(400).json({ error: 'Invalid range. Use: 6months, 12months, or custom' });
    }

    // Validate dates
    if (!moment(startDate).isValid() || !moment(endDate).isValid()) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (moment(startDate).isAfter(moment(endDate))) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    // Generate report
    const filepath = await adminReportGenerator.generateReport(
      startDate,
      endDate,
      building_id || null
    );

    // Return file for download
    res.download(filepath, (err) => {
      if (err) {
        console.error('Download error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download report' });
        }
      }
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * GET /api/reports/preview
 * Get report data without generating PDF (for preview)
 * Admin only
 */
router.get('/preview', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { range, start_date, end_date, building_id } = req.query;

    let startDate, endDate;

    // Calculate date range
    if (range === '6months') {
      startDate = moment().subtract(6, 'months').format('YYYY-MM-DD');
      endDate = moment().format('YYYY-MM-DD');
    } else if (range === '12months') {
      startDate = moment().subtract(12, 'months').format('YYYY-MM-DD');
      endDate = moment().format('YYYY-MM-DD');
    } else if (range === 'custom') {
      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'Start date and end date are required for custom range' });
      }
      startDate = moment(start_date).format('YYYY-MM-DD');
      endDate = moment(end_date).format('YYYY-MM-DD');
    } else {
      // Default to last month
      startDate = moment().subtract(1, 'month').format('YYYY-MM-DD');
      endDate = moment().format('YYYY-MM-DD');
    }

    // Get report data for preview
    const data = await adminReportGenerator._fetchReportData(
      startDate,
      endDate,
      building_id || null
    );

    res.json({
      date_range: {
        start: startDate,
        end: endDate
      },
      ...data
    });
  } catch (error) {
    console.error('Report preview error:', error);
    res.status(500).json({ error: 'Failed to generate report preview' });
  }
});

module.exports = router;
