const redis = require('redis');
require('dotenv').config();

// Create Redis client
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  password: process.env.REDIS_PASSWORD || undefined
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
})();

// Cache duration constants
const CACHE_DURATION = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  DAY: 86400,      // 24 hours
  WEEK: 604800,    // 7 days
  MONTH: 2592000   // 30 days
};

// Helper functions
const cacheHelper = {
  // Get cached data
  get: async (key) => {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },

  // Set cache data with expiration
  set: async (key, value, expiration = CACHE_DURATION.MEDIUM) => {
    try {
      await redisClient.setEx(key, expiration, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  },

  // Delete cache
  del: async (key) => {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  },

  // Delete multiple keys matching pattern
  delPattern: async (pattern) => {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Redis delete pattern error:', error);
      return false;
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      return await redisClient.exists(key);
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  },

  // Get cache for last 3 months payments
  getRecentPayments: async (tenantId = null, buildingId = null) => {
    const key = `payments:recent:${tenantId || 'all'}:${buildingId || 'all'}`;
    return await cacheHelper.get(key);
  },

  // Set cache for last 3 months payments
  setRecentPayments: async (data, tenantId = null, buildingId = null) => {
    const key = `payments:recent:${tenantId || 'all'}:${buildingId || 'all'}`;
    return await cacheHelper.set(key, data, CACHE_DURATION.LONG);
  },

  // Invalidate payments cache
  invalidatePaymentsCache: async () => {
    return await cacheHelper.delPattern('payments:recent:*');
  },

  // Get dashboard stats cache
  getDashboardStats: async (buildingId = null) => {
    const key = `dashboard:stats:${buildingId || 'all'}`;
    return await cacheHelper.get(key);
  },

  // Set dashboard stats cache
  setDashboardStats: async (data, buildingId = null) => {
    const key = `dashboard:stats:${buildingId || 'all'}`;
    return await cacheHelper.set(key, data, CACHE_DURATION.SHORT);
  },

  // Invalidate dashboard cache
  invalidateDashboardCache: async () => {
    return await cacheHelper.delPattern('dashboard:*');
  },

  // Get tenant details cache
  getTenant: async (tenantId) => {
    const key = `tenant:${tenantId}`;
    return await cacheHelper.get(key);
  },

  // Set tenant details cache
  setTenant: async (tenantId, data) => {
    const key = `tenant:${tenantId}`;
    return await cacheHelper.set(key, data, CACHE_DURATION.LONG);
  },

  // Invalidate tenant cache
  invalidateTenantCache: async (tenantId = null) => {
    if (tenantId) {
      return await cacheHelper.del(`tenant:${tenantId}`);
    }
    return await cacheHelper.delPattern('tenant:*');
  },

  // Get contract details cache
  getContract: async (contractNumber) => {
    const key = `contract:${contractNumber}`;
    return await cacheHelper.get(key);
  },

  // Set contract details cache
  setContract: async (contractNumber, data) => {
    const key = `contract:${contractNumber}`;
    return await cacheHelper.set(key, data, CACHE_DURATION.LONG);
  },

  // Invalidate contract cache
  invalidateContractCache: async (contractNumber = null) => {
    if (contractNumber) {
      return await cacheHelper.del(`contract:${contractNumber}`);
    }
    return await cacheHelper.delPattern('contract:*');
  },

  // Get overdue payments cache
  getOverduePayments: async (buildingId = null) => {
    const key = `overdue:${buildingId || 'all'}`;
    return await cacheHelper.get(key);
  },

  // Set overdue payments cache
  setOverduePayments: async (data, buildingId = null) => {
    const key = `overdue:${buildingId || 'all'}`;
    return await cacheHelper.set(key, data, CACHE_DURATION.SHORT);
  },

  // Invalidate overdue cache
  invalidateOverdueCache: async () => {
    return await cacheHelper.delPattern('overdue:*');
  }
};

module.exports = {
  redisClient,
  cacheHelper,
  CACHE_DURATION
};
