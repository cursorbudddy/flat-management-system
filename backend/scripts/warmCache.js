/**
 * Cache Warming Script
 *
 * This script populates Redis cache with available data from the database.
 * Since the system is new, it caches all available data (not just last 3 months).
 */

const db = require('../database/db');
const { cacheHelper } = require('../database/redis');

async function warmCache() {
  console.log('🔥 Starting cache warming process...\n');

  try {
    // 1. Warm Dashboard Stats
    console.log('📊 Caching dashboard stats...');
    const dashboardStats = await db.query(`
      SELECT
        COUNT(DISTINCT b.id) as total_buildings,
        COUNT(DISTINCT f.id) as total_flats,
        COUNT(DISTINCT CASE WHEN f.is_occupied THEN f.id END) as occupied_flats,
        COUNT(DISTINCT CASE WHEN NOT f.is_occupied THEN f.id END) as vacant_flats,
        COUNT(DISTINCT CASE WHEN ra.is_active THEN t.id END) as active_tenants,
        COALESCE(SUM(CASE WHEN p.payment_date::date = CURRENT_DATE THEN p.amount ELSE 0 END), 0) as today_income,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month', p.payment_date) = DATE_TRUNC('month', CURRENT_DATE) THEN p.amount ELSE 0 END), 0) as month_income
      FROM buildings b
      LEFT JOIN flats f ON b.id = f.building_id
      LEFT JOIN rental_agreements ra ON f.id = ra.flat_id
      LEFT JOIN tenants t ON ra.tenant_id = t.id
      LEFT JOIN payments p ON p.building_id = b.id
    `);

    await cacheHelper.setDashboardStats(dashboardStats.rows[0]);
    console.log('✅ Dashboard stats cached');

    // 2. Warm Recent Payments Cache (all available data)
    console.log('\n💰 Caching recent payments...');
    const payments = await db.query(`
      SELECT p.*,
        t.name as tenant_name,
        b.name as building_name,
        f.flat_number
      FROM payments p
      LEFT JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN buildings b ON p.building_id = b.id
      LEFT JOIN rental_agreements ra ON p.rental_agreement_id = ra.id
      LEFT JOIN flats f ON ra.flat_id = f.id
      ORDER BY p.payment_date DESC
      LIMIT 100
    `);

    await cacheHelper.setRecentPayments(payments.rows);
    console.log(`✅ Cached ${payments.rows.length} recent payments`);

    // 3. Warm Tenant Cache
    console.log('\n👥 Caching tenant details...');
    const tenants = await db.query(`
      SELECT t.id, t.name, t.id_number, t.contact_number, t.email,
        ra.id as rental_id,
        b.name as building_name,
        f.flat_number
      FROM tenants t
      LEFT JOIN rental_agreements ra ON t.id = ra.tenant_id AND ra.is_active = true
      LEFT JOIN flats f ON ra.flat_id = f.id
      LEFT JOIN buildings b ON f.building_id = b.id
    `);

    for (const tenant of tenants.rows) {
      await cacheHelper.setTenant(tenant.id, tenant);
    }
    console.log(`✅ Cached ${tenants.rows.length} tenants`);

    // 4. Warm Contract Cache
    console.log('\n📝 Caching rental contracts...');
    const contracts = await db.query(`
      SELECT ra.*,
        t.name as tenant_name,
        b.name as building_name,
        f.flat_number
      FROM rental_agreements ra
      JOIN tenants t ON ra.tenant_id = t.id
      JOIN flats f ON ra.flat_id = f.id
      JOIN buildings b ON f.building_id = b.id
    `);

    for (const contract of contracts.rows) {
      await cacheHelper.setContract(contract.contract_number, contract);
    }
    console.log(`✅ Cached ${contracts.rows.length} rental contracts`);

    // 5. Warm Overdue Payments Cache
    console.log('\n⏰ Caching overdue payment schedules...');
    const overdueSchedules = await db.query(`
      SELECT ps.*,
        ra.contract_number,
        t.name as tenant_name,
        b.name as building_name,
        f.flat_number
      FROM payment_schedules ps
      JOIN rental_agreements ra ON ps.rental_agreement_id = ra.id
      JOIN tenants t ON ra.tenant_id = t.id
      JOIN flats f ON ra.flat_id = f.id
      JOIN buildings b ON f.building_id = b.id
      WHERE ps.status = 'overdue'
      ORDER BY ps.due_date ASC
    `);

    await cacheHelper.setOverduePayments(overdueSchedules.rows);
    console.log(`✅ Cached ${overdueSchedules.rows.length} overdue payment schedules`);

    // 6. Get cache statistics
    console.log('\n📈 Cache Statistics:');
    console.log('-------------------');
    const cacheKeys = await db.query(`
      SELECT
        COUNT(*) as total_payments,
        COUNT(CASE WHEN payment_date >= CURRENT_DATE - INTERVAL '3 months' THEN 1 END) as last_3_months_payments,
        COUNT(CASE WHEN payment_date >= CURRENT_DATE - INTERVAL '1 month' THEN 1 END) as last_month_payments,
        MIN(payment_date) as oldest_payment,
        MAX(payment_date) as newest_payment
      FROM payments
    `);

    const stats = cacheKeys.rows[0];
    console.log(`Total payments in DB: ${stats.total_payments}`);
    console.log(`Last 3 months: ${stats.last_3_months_payments}`);
    console.log(`Last month: ${stats.last_month_payments}`);
    if (stats.oldest_payment) {
      console.log(`Date range: ${new Date(stats.oldest_payment).toLocaleDateString()} to ${new Date(stats.newest_payment).toLocaleDateString()}`);
    }

    console.log('\n✨ Cache warming completed successfully!');
    console.log('-------------------');
    console.log('Cache will be automatically updated when data changes.');

  } catch (error) {
    console.error('❌ Error warming cache:', error);
    throw error;
  } finally {
    // Close connections
    await db.pool.end();
    process.exit(0);
  }
}

// Run the cache warming
warmCache().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
