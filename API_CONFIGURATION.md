# API Configuration Guide

## Overview

The Flat Management System frontend is now configured to use **dynamic API URLs**, allowing you to easily switch between development, staging, and production environments without changing code.

## How It Works

All API calls are centralized through `/frontend/src/api.js`, which reads the API URL from an environment variable:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
```

## Configuration

### Development (Default)

By default, the frontend connects to `http://localhost:5000/api`

No configuration needed for local development.

### Custom Development

To use a different backend during development:

1. Edit `frontend/.env`:
   ```bash
   REACT_APP_API_URL=http://localhost:3000/api
   ```

2. Restart the development server:
   ```bash
   npm start
   ```

### Production Deployment

#### Option 1: Environment Variable

Set the environment variable before building:

```bash
export REACT_APP_API_URL=https://your-domain.com/api
npm run build
```

#### Option 2: .env.production File

Create `frontend/.env.production`:

```bash
REACT_APP_API_URL=https://your-domain.com/api
```

Then build:
```bash
npm run build
```

#### Option 3: Tailscale Funnel

For Tailscale Funnel deployment:

```bash
# frontend/.env.production
REACT_APP_API_URL=https://vmi2736951-2.tailc7190b.ts.net/api
```

## Files Updated

All hardcoded `http://localhost:5000` references have been replaced:

### ✅ Updated Files:
1. **`frontend/src/api.js`** - Central API configuration with helpers
   - `API_BASE_URL` - API endpoint base URL
   - `API_SERVER_URL` - Server base URL (without /api)
   - `getFileUrl(path)` - Helper for file URLs (uploads, documents)

2. **`frontend/src/context/AuthContext.js`** - Authentication context
   - Uses `api` instance for all auth calls
   - No hardcoded URLs

3. **`frontend/src/pages/Rentals.js`** - Rentals page
   - Uses `getCurrentMonthRentals` from api.js
   - No hardcoded URLs

4. **`frontend/src/pages/TenantDetails.js`** - Tenant details
   - Uses `getFileUrl()` helper for ID documents
   - No hardcoded URLs

5. **`frontend/src/components/IdCheckModal.js`** - ID check modal
   - Uses `getFileUrl()` helper for document previews
   - No hardcoded URLs

## Usage Examples

### Using API Functions

```javascript
import { getBuildings, createTenant, getFileUrl } from '../api';

// Fetch data
const response = await getBuildings();

// Create resource
await createTenant(formData);

// Get file URL
const imageUrl = getFileUrl('/uploads/id-documents/123.jpg');
```

### Direct API Instance Usage

```javascript
import api from '../api';

// GET request
const response = await api.get('/custom-endpoint');

// POST request
await api.post('/custom-endpoint', data);
```

## Testing Different Environments

### Test Local Backend (Port 5000)
```bash
# frontend/.env
REACT_APP_API_URL=http://localhost:5000/api
```

### Test Local Backend (Different Port)
```bash
# frontend/.env
REACT_APP_API_URL=http://localhost:3001/api
```

### Test Remote Backend
```bash
# frontend/.env
REACT_APP_API_URL=https://api.example.com/api
```

### Test Tailscale Funnel
```bash
# frontend/.env
REACT_APP_API_URL=https://vmi2736951-2.tailc7190b.ts.net/api
```

## Deployment Scenarios

### Scenario 1: Separate Frontend & Backend Servers

**Backend**: `https://api.example.com`
**Frontend**: `https://app.example.com`

```bash
# frontend/.env.production
REACT_APP_API_URL=https://api.example.com/api
```

### Scenario 2: Same Server with Nginx Proxy

**Server**: `https://example.com`
- Frontend: `https://example.com/`
- Backend: `https://example.com/api/`

```bash
# frontend/.env.production
REACT_APP_API_URL=/api
```

Or use relative paths:
```bash
# frontend/.env.production
REACT_APP_API_URL=https://example.com/api
```

### Scenario 3: Tailscale Funnel

**Funnel URL**: `https://vmi2736951-2.tailc7190b.ts.net`

```bash
# Configure funnel to proxy both frontend and backend
tailscale serve https / http://127.0.0.1:3002
tailscale serve https /api http://127.0.0.1:5000

# frontend/.env.production
REACT_APP_API_URL=https://vmi2736951-2.tailc7190b.ts.net/api
```

## Important Notes

1. **Restart Required**: After changing `.env`, you must restart the development server (`npm start`)

2. **Build Time Variable**: `REACT_APP_*` variables are embedded at build time, not runtime

3. **Must Start with REACT_APP_**: Only environment variables starting with `REACT_APP_` are accessible in React apps

4. **File URLs**: Use `getFileUrl()` helper for all file paths (uploads, documents, reports, invoices)

5. **CORS Configuration**: Ensure your backend CORS settings allow requests from your frontend domain

## Troubleshooting

### Issue: API calls return 404

**Solution**: Verify the API URL is correct
```bash
# Check current configuration
echo $REACT_APP_API_URL

# Test API endpoint
curl https://your-domain.com/api/health
```

### Issue: CORS errors

**Solution**: Update backend CORS configuration in `backend/server.js`:
```javascript
app.use(cors({
  origin: ['https://your-frontend-domain.com'],
  credentials: true
}));
```

### Issue: File uploads/downloads not working

**Solution**: Ensure backend serves static files:
```javascript
// backend/server.js
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/invoices', express.static(path.join(__dirname, 'invoices')));
```

### Issue: Changes not reflecting

**Solution**:
1. Stop development server
2. Clear `.env` cache: `rm -rf node_modules/.cache`
3. Restart: `npm start`

Or for production:
```bash
rm -rf build
npm run build
```

## Security Considerations

1. **Don't commit sensitive URLs**: Add `.env.production` to `.gitignore`

2. **Use HTTPS in production**: Always use `https://` URLs for production

3. **Environment-specific files**: Use `.env.local`, `.env.development`, `.env.production`

4. **API Keys**: Never put API keys in environment variables that go to the frontend

## Summary

✅ All API calls now use dynamic configuration
✅ No hardcoded URLs in source code
✅ Easy to switch between environments
✅ Production-ready configuration
✅ Works with any deployment scenario

For more information, see:
- React Environment Variables: https://create-react-app.dev/docs/adding-custom-environment-variables/
- Deployment Guide: `DEPLOYMENT.md`
