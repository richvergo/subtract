# Agents MVP Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Agents MVP to production for pilot testing. The deployment uses:

- **Frontend**: Vercel (Next.js native hosting)
- **Backend**: Render (Node.js + PostgreSQL + Redis)
- **Database**: PostgreSQL (Render managed)
- **Queue**: Redis (Render managed)
- **File Storage**: Local volumes (mounted to containers)

## Prerequisites

### Required Accounts
- [GitHub](https://github.com) account
- [Vercel](https://vercel.com) account (free tier available)
- [Render](https://render.com) account (free tier available)

### Required Tools
- Git
- Node.js 20+
- npm
- Docker (for local testing)

## Quick Start

### 1. Prepare Repository
```bash
# Clone your repository
git clone <your-repo-url>
cd checklist_app

# Install dependencies
npm install

# Run tests to ensure everything works
npm test
```

### 2. Deploy Backend to Render

#### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Connect your repository

#### Step 2: Create Database
1. In Render dashboard, click "New +"
2. Select "PostgreSQL"
3. Configure:
   - **Name**: `agents-db`
   - **Database**: `agents`
   - **User**: `app`
   - **Plan**: Starter (free)
4. Click "Create Database"
5. Note the connection string

#### Step 3: Create Redis Instance
1. In Render dashboard, click "New +"
2. Select "Redis"
3. Configure:
   - **Name**: `agents-redis`
   - **Plan**: Starter (free)
4. Click "Create Redis"
5. Note the connection string

#### Step 4: Deploy Web Service
1. In Render dashboard, click "New +"
2. Select "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `agents-mvp-backend`
   - **Environment**: Node
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm start`
   - **Plan**: Starter (free)

#### Step 5: Set Environment Variables
Add these environment variables in Render dashboard:

```bash
NODE_ENV=production
DATABASE_URL=<your-postgres-connection-string>
REDIS_URL=<your-redis-connection-string>
ENCRYPTION_KEY_BASE64=<generate-with-openssl-rand-base64-32>
INTERNAL_RUNNER_TOKEN=<generate-with-openssl-rand-hex-32>
FILE_STORAGE_DIR=/opt/render/project/src/data/agent_outputs
NEXTAUTH_URL=https://agents-mvp-backend.onrender.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-hex-32>
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

#### Step 6: Deploy Worker Service
1. In Render dashboard, click "New +"
2. Select "Background Worker"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `agents-mvp-worker`
   - **Environment**: Node
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm run worker`
   - **Plan**: Starter (free)

#### Step 7: Set Worker Environment Variables
Use the same environment variables as the web service.

### 3. Deploy Frontend to Vercel

#### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Import your repository

#### Step 2: Configure Deployment
1. In Vercel dashboard, click "Import Project"
2. Select your repository
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (default)

#### Step 3: Set Environment Variables
Add these environment variables in Vercel dashboard:

```bash
NEXT_PUBLIC_API_BASE_URL=https://agents-mvp-backend.onrender.com/api
NEXTAUTH_URL=https://your-vercel-app.vercel.app
NEXTAUTH_SECRET=<same-as-backend>
```

#### Step 4: Update vercel.json
Update the `vercel.json` file with your actual backend URL:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://agents-mvp-backend.onrender.com/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_BASE_URL": "https://agents-mvp-backend.onrender.com/api"
  }
}
```

#### Step 5: Deploy
1. Click "Deploy" in Vercel dashboard
2. Wait for deployment to complete
3. Note your Vercel URL

### 4. Run Database Migrations

#### Option 1: Via Render Shell
1. Go to your web service in Render dashboard
2. Click "Shell"
3. Run: `npx prisma migrate deploy`

#### Option 2: Via Local Connection
```bash
# Set your production DATABASE_URL
export DATABASE_URL="<your-render-postgres-url>"

# Run migrations
npx prisma migrate deploy
```

### 5. Verify Deployment

#### Health Check
Visit: `https://agents-mvp-backend.onrender.com/api/health`

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "connected",
    "api": "running"
  }
}
```

#### Frontend Check
Visit your Vercel URL and verify:
- Dashboard loads
- Can navigate to Logins page
- Can navigate to Agents page
- API calls work (check browser network tab)

## Local Development with Docker

### Quick Start
```bash
# Make deployment script executable
chmod +x infra/deploy.sh

# Deploy locally
./infra/deploy.sh local
```

### Manual Docker Compose
```bash
# Copy environment template
cp infra/env.example infra/.env

# Edit environment variables
nano infra/.env

# Start services
cd infra
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://host:6379/0` |
| `ENCRYPTION_KEY_BASE64` | 32-byte base64 encryption key | `openssl rand -base64 32` |
| `INTERNAL_RUNNER_TOKEN` | Internal API token | `openssl rand -hex 32` |
| `NEXTAUTH_SECRET` | NextAuth secret | `openssl rand -hex 32` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FILE_STORAGE_DIR` | Directory for file storage | `/data/agent_outputs` |
| `NODE_ENV` | Environment mode | `production` |
| `NEXTAUTH_URL` | Frontend URL | `http://localhost:3000` |

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
- Check `DATABASE_URL` format
- Ensure database is running
- Verify network connectivity

#### 2. Redis Connection Failed
- Check `REDIS_URL` format
- Ensure Redis is running
- Verify network connectivity

#### 3. Puppeteer Issues
- Ensure Chrome is installed in container
- Check `PUPPETEER_EXECUTABLE_PATH`
- Verify file permissions

#### 4. File Storage Issues
- Check `FILE_STORAGE_DIR` exists
- Verify write permissions
- Ensure volume is mounted

### Debug Commands

#### Check Service Status
```bash
# Render
curl https://agents-mvp-backend.onrender.com/api/health

# Vercel
curl https://your-app.vercel.app/api/health
```

#### Check Logs
```bash
# Render (via dashboard)
# Go to service → Logs

# Local Docker
docker-compose logs -f app
docker-compose logs -f worker
```

#### Database Connection
```bash
# Connect to production database
psql "<your-database-url>"

# Run migrations
npx prisma migrate deploy
```

## Security Considerations

### Production Security
- Use strong, unique secrets
- Enable HTTPS (automatic on Vercel/Render)
- Restrict database access
- Monitor logs for suspicious activity
- Regular security updates

### Environment Variables
- Never commit `.env` files
- Use different secrets for each environment
- Rotate secrets regularly
- Use environment-specific configurations

## Monitoring and Maintenance

### Health Checks
- Monitor `/api/health` endpoint
- Set up uptime monitoring
- Monitor error rates
- Track performance metrics

### Logs
- Monitor application logs
- Set up log aggregation
- Alert on errors
- Regular log rotation

### Database
- Monitor connection pool
- Regular backups
- Performance monitoring
- Index optimization

## Scaling Considerations

### Current Limitations (Free Tier)
- Render: 750 hours/month
- Vercel: 100GB bandwidth/month
- Database: 1GB storage
- Redis: 25MB memory

### Upgrade Path
- Render: Paid plans for more resources
- Vercel: Pro plan for more bandwidth
- Database: Larger storage plans
- Redis: More memory plans

## Cost Estimation

### Free Tier (Pilot Testing)
- **Render**: $0/month (750 hours)
- **Vercel**: $0/month (100GB bandwidth)
- **Total**: $0/month

### Paid Tier (Production)
- **Render**: $7/month (web) + $7/month (worker)
- **Vercel**: $20/month (Pro)
- **Database**: $7/month (1GB)
- **Redis**: $7/month (1GB)
- **Total**: ~$48/month

## Next Steps

### After Deployment
1. **Test End-to-End**: Verify all features work
2. **Monitor Performance**: Check response times
3. **User Testing**: Deploy to pilot users
4. **Gather Feedback**: Use testing playbook
5. **Iterate**: Fix issues and improve

### Future Improvements
1. **S3 Integration**: Replace local file storage
2. **CDN**: Add content delivery network
3. **Monitoring**: Add APM tools
4. **Backup**: Automated database backups
5. **CI/CD**: Automated deployment pipeline

---

## Support

For deployment issues:
1. Check this guide first
2. Review service logs
3. Check environment variables
4. Verify network connectivity
5. Contact support if needed

**Remember**: This is a pilot deployment. Focus on functionality over performance optimization.
