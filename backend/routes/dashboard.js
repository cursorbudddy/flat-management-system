const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const { building_id } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // Build WHERE clause for building filter
    let buildingFilter = '';
    const params = [];
    if (building_id) {
      params.push(building_id);
      buildingFilter = ` AND building_id = $${params.length}`;
    }

    // Total buildings
    const buildingsResult = await db.query(
      'SELECT COUNT(*) as total_buildings FROM buildings'
    );

    // Total flats, occupied, vacant
    let flatsQuery = `
      SELECT
        COUNT(*) as total_flats,
        COUNT(CASE WHEN is_occupied THEN 1 END) as occupied_flats,
        COUNT(CASE WHEN NOT is_occupied THEN 1 END) as vacant_flats
      FROM flats
      WHERE 1=1
    `;
    if (building_id) {
      flatsQuery += ` AND building_id = $1`;
    }

    const flatsResult = await db.query(flatsQuery, building_id ? [building_id] : []);

    // Active tenants
    let activeTenantQuery = `
      SELECT COUNT(DISTINCT tenant_id) as active_tenants
      FROM rental_agreements
      WHERE is_active = true
    `;
    if (building_id) {
      activeTenantQuery += ` AND building_id = $1`;
    }

    const activeTenantsResult = await db.query(activeTenantQuery, building_id ? [building_id] : []);

    // Today's income
    let todayIncomeQuery = `
      SELECT COALESCE(SUM(amount), 0) as today_income
      FROM payments
      WHERE payment_date = $1
    `;
    const todayIncomeParams = [today];
    if (building_id) {
      todayIncomeParams.push(building_id);
      todayIncomeQuery += ` AND building_id = $${todayIncomeParams.length}`;
    }

    const todayIncomeResult = await db.query(todayIncomeQuery, todayIncomeParams);

    // This month's income
    let monthIncomeQuery = `
      SELECT COALESCE(SUM(amount), 0) as month_income
      FROM payments
      WHERE payment_date >= $1
    `;
    const monthIncomeParams = [firstDayOfMonth];
    if (building_id) {
      monthIncomeParams.push(building_id);
      monthIncomeQuery += ` AND building_id = $${monthIncomeParams.length}`;
    }

    const monthIncomeResult = await db.query(monthIncomeQuery, monthIncomeParams);

    // Today's expenses
    let todayExpenseQuery = `
      SELECT COALESCE(SUM(amount), 0) as today_expense
      FROM expenses
      WHERE expense_date = $1
    `;
    const todayExpenseParams = [today];
    if (building_id) {
      todayExpenseParams.push(building_id);
      todayExpenseQuery += ` AND building_id = $${todayExpenseParams.length}`;
    }

    const todayExpenseResult = await db.query(todayExpenseQuery, todayExpenseParams);

    // This month's expenses
    let monthExpenseQuery = `
      SELECT COALESCE(SUM(amount), 0) as month_expense
      FROM expenses
      WHERE expense_date >= $1
    `;
    const monthExpenseParams = [firstDayOfMonth];
    if (building_id) {
      monthExpenseParams.push(building_id);
      monthExpenseQuery += ` AND building_id = $${monthExpenseParams.length}`;
    }

    const monthExpenseResult = await db.query(monthExpenseQuery, monthExpenseParams);

    // Pending payments count
    let pendingPaymentsQuery = `
      SELECT COUNT(*) as pending_payments
      FROM rental_agreements ra
      WHERE ra.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM payments p
        WHERE p.rental_agreement_id = ra.id
        AND p.payment_type = 'rent'
        AND DATE_TRUNC('month', p.payment_date) = DATE_TRUNC('month', CURRENT_DATE)
        AND p.amount >= ra.rental_amount
      )
    `;
    if (building_id) {
      pendingPaymentsQuery += ` AND ra.building_id = $1`;
    }

    const pendingPaymentsResult = await db.query(pendingPaymentsQuery, building_id ? [building_id] : []);

    // Recent payments (last 5)
    let recentPaymentsQuery = `
      SELECT p.*,
        t.name as tenant_name,
        b.name as building_name,
        f.flat_number
      FROM payments p
      LEFT JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN buildings b ON p.building_id = b.id
      LEFT JOIN rental_agreements ra ON p.rental_agreement_id = ra.id
      LEFT JOIN flats f ON ra.flat_id = f.id
      WHERE 1=1
    `;
    if (building_id) {
      recentPaymentsQuery += ` AND p.building_id = $1`;
    }
    recentPaymentsQuery += ' ORDER BY p.payment_date DESC, p.created_at DESC LIMIT 5';

    const recentPaymentsResult = await db.query(recentPaymentsQuery, building_id ? [building_id] : []);

    // Recent expenses (last 5)
    let recentExpensesQuery = `
      SELECT e.*,
        b.name as building_name
      FROM expenses e
      LEFT JOIN buildings b ON e.building_id = b.id
      WHERE 1=1
    `;
    if (building_id) {
      recentExpensesQuery += ` AND e.building_id = $1`;
    }
    recentExpensesQuery += ' ORDER BY e.expense_date DESC, e.created_at DESC LIMIT 5';

    const recentExpensesResult = await db.query(recentExpensesQuery, building_id ? [building_id] : []);

    // Compile statistics
    const stats = {
      total_buildings: parseInt(buildingsResult.rows[0].total_buildings),
      total_flats: parseInt(flatsResult.rows[0].total_flats),
      occupied_flats: parseInt(flatsResult.rows[0].occupied_flats),
      vacant_flats: parseInt(flatsResult.rows[0].vacant_flats),
      active_tenants: parseInt(activeTenantsResult.rows[0].active_tenants),
      today_income: parseFloat(todayIncomeResult.rows[0].today_income),
      month_income: parseFloat(monthIncomeResult.rows[0].month_income),
      today_expense: parseFloat(todayExpenseResult.rows[0].today_expense),
      month_expense: parseFloat(monthExpenseResult.rows[0].month_expense),
      pending_payments: parseInt(pendingPaymentsResult.rows[0].pending_payments),
      today_net: parseFloat(todayIncomeResult.rows[0].today_income) - parseFloat(todayExpenseResult.rows[0].today_expense),
      month_net: parseFloat(monthIncomeResult.rows[0].month_income) - parseFloat(monthExpenseResult.rows[0].month_expense),
      recent_payments: recentPaymentsResult.rows,
      recent_expenses: recentExpensesResult.rows
    };

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get income/expense trends (last 7 days)
router.get('/trends', async (req, res) => {
  try {
    const { building_id } = req.query;

    let incomeQuery = `
      SELECT
        payment_date as date,
        SUM(amount) as amount
      FROM payments
      WHERE payment_date >= CURRENT_DATE - INTERVAL '7 days'
    `;

    const incomeParams = [];
    if (building_id) {
      incomeParams.push(building_id);
      incomeQuery += ` AND building_id = $${incomeParams.length}`;
    }

    incomeQuery += ' GROUP BY payment_date ORDER BY payment_date';

    let expenseQuery = `
      SELECT
        expense_date as date,
        SUM(amount) as amount
      FROM expenses
      WHERE expense_date >= CURRENT_DATE - INTERVAL '7 days'
    `;

    const expenseParams = [];
    if (building_id) {
      expenseParams.push(building_id);
      expenseQuery += ` AND building_id = $${expenseParams.length}`;
    }

    expenseQuery += ' GROUP BY expense_date ORDER BY expense_date';

    const incomeResult = await db.query(incomeQuery, incomeParams);
    const expenseResult = await db.query(expenseQuery, expenseParams);

    // Create a map for last 7 days
    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const income = incomeResult.rows.find(r => r.date.toISOString().split('T')[0] === dateStr);
      const expense = expenseResult.rows.find(r => r.date.toISOString().split('T')[0] === dateStr);

      trends.push({
        date: dateStr,
        income: income ? parseFloat(income.amount) : 0,
        expense: expense ? parseFloat(expense.amount) : 0,
        net: (income ? parseFloat(income.amount) : 0) - (expense ? parseFloat(expense.amount) : 0)
      });
    }

    res.json(trends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

module.exports = router;
