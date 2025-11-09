# Quick Deployment Guide for VPS

This guide provides step-by-step instructions to deploy the Flat Management Application on your Linux VPS.

## Prerequisites
- Linux VPS with root or sudo access
- Domain name (optional, can use IP address)
- SSH access to your VPS

## Step 1: Connect to Your VPS

```bash
ssh root@your-vps-ip
# or
ssh your-user@your-vps-ip
```

## Step 2: Install Required Software

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Nginx
sudo apt-get install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Install Git (if needed)
sudo apt-get install -y git
```

## Step 3: Setup PostgreSQL Database

```bash
# Switch to postgres user and open psql
sudo -u postgres psql

# In PostgreSQL console, run these commands:
CREATE DATABASE flat_management;
CREATE USER flat_admin WITH PASSWORD 'your_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE flat_management TO flat_admin;
ALTER DATABASE flat_management OWNER TO flat_admin;
\q

# Exit postgres user
exit
```

## Step 4: Upload Application Files

Option A: Using Git
```bash
cd /var/www
sudo git clone your-repository-url flat-management-app
sudo chown -R $USER:$USER /var/www/flat-management-app
```

Option B: Using SCP (from your local machine)
```bash
# From your local machine:
scp -r flat-management-app root@your-vps-ip:/var/www/
```

Option C: Using SFTP
- Use FileZilla or WinSCP to upload the entire project folder to `/var/www/flat-management-app`

## Step 5: Setup Backend

```bash
cd /var/www/flat-management-app/backend

# Install dependencies
npm install --production

# Create uploads directory
mkdir -p uploads/id-documents

# Edit .env file with your database credentials
nano .env

# Update these values:
# PORT=5000
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=flat_management
# DB_USER=flat_admin
# DB_PASSWORD=your_strong_password_here

# Save and exit (Ctrl+X, then Y, then Enter)

# Import database schema
psql -U flat_admin -d flat_management -f database/schema.sql
# When prompted, enter your database password

# Test the backend
node server.js
# You should see "Server is running on port 5000"
# Press Ctrl+C to stop

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command that PM2 outputs

# Check status
pm2 status
pm2 logs flat-management-api
```

## Step 6: Setup Frontend

```bash
cd /var/www/flat-management-app/frontend

# Install dependencies
npm install

# Create production build
npm run build

# Build files will be in the 'build' folder
ls build/
```

## Step 7: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/flat-management
```

Paste this configuration (replace `your-domain.com` with your domain or VPS IP):

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Or use your VPS IP

    root /var/www/flat-management-app/frontend/build;
    index index.html;

    # Frontend - serve React app
    location / {
        try_files $uri /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve uploaded files
    location /uploads {
        alias /var/www/flat-management-app/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Increase max upload size
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
```

Save and exit (Ctrl+X, then Y, then Enter)

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/flat-management /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test is successful, restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

## Step 8: Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 9: Setup SSL (Optional but Recommended)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts:
# - Enter your email
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)

# Certbot will automatically renew. Test renewal:
sudo certbot renew --dry-run
```

## Step 10: Verify Deployment

1. Open your browser and navigate to:
   - `http://your-domain.com` (or `http://your-vps-ip`)
   - If you setup SSL: `https://your-domain.com`

2. You should see the Flat Management Application dashboard

3. Test the application:
   - Add a building
   - Add a tenant
   - Record a payment
   - Check the dashboard

## Troubleshooting

### Application not loading

Check Nginx:
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

Check Backend:
```bash
pm2 logs flat-management-api
pm2 status
```

Check Database:
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "\l"  # List databases
```

### Database connection errors

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check if database exists
sudo -u postgres psql -l | grep flat_management

# Test connection manually
psql -U flat_admin -d flat_management -h localhost
```

### Permission errors

```bash
# Fix file permissions
sudo chown -R www-data:www-data /var/www/flat-management-app/backend/uploads
sudo chmod -R 755 /var/www/flat-management-app/backend/uploads
```

### Port already in use

```bash
# Check what's using port 5000
sudo lsof -i :5000

# Check what's using port 80
sudo lsof -i :80
```

## Maintenance Commands

### View logs
```bash
# PM2 logs
pm2 logs flat-management-api

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Restart services
```bash
# Restart backend
pm2 restart flat-management-api

# Restart Nginx
sudo systemctl restart nginx

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Backup database
```bash
# Create backup
pg_dump -U flat_admin flat_management > ~/backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql -U flat_admin flat_management < ~/backup_20231201_120000.sql
```

### Update application
```bash
# Pull latest changes (if using git)
cd /var/www/flat-management-app
git pull

# Update backend
cd backend
npm install --production
pm2 restart flat-management-api

# Update frontend
cd ../frontend
npm install
npm run build
sudo systemctl reload nginx
```

## Security Checklist

- [ ] Changed database password from default
- [ ] Setup SSL certificate
- [ ] Configured firewall (ufw)
- [ ] Regular database backups scheduled
- [ ] PM2 configured to start on boot
- [ ] Strong passwords for all accounts
- [ ] Limited SSH access (consider key-based auth)
- [ ] Regular system updates scheduled

## Performance Optimization

For better performance on production:

1. **Enable Nginx caching:**
```bash
sudo nano /etc/nginx/sites-available/flat-management
```
Add caching for static files:
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

2. **Setup database connection pooling:**
Already configured in `backend/database/db.js`

3. **Monitor resources:**
```bash
pm2 monit
```

## Success!

Your Flat Management Application should now be running on your VPS!

Access it at: `http://your-domain.com` or `https://your-domain.com`

For support, check the logs and error messages for detailed information.
