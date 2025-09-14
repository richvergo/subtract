# vergo - AI Agent Automation Platform Deployment Infrastructure

This directory contains all the configuration files and scripts needed to deploy the vergo AI agent automation platform to production with enhanced recording processing, LLM integration, and self-healing automation capabilities.

## Quick Start

### Local Development
```bash
# Make deployment script executable
chmod +x deploy.sh

# Deploy locally with Docker Compose
./deploy.sh local
```

### Production Deployment
```bash
# Run tests first
./deploy.sh test

# Build Docker images
./deploy.sh build

# Follow deployment guide
open DEPLOYMENT_GUIDE.md
```

## File Structure

```
infra/
├── Dockerfile                 # Main application container
├── Dockerfile.worker          # Puppeteer worker container
├── docker-compose.yml         # Local development setup
├── render.yaml               # Render deployment configuration
├── Procfile                  # Render process configuration
├── deploy.sh                 # Deployment automation script
├── env.example               # Environment variables template
├── init.sql                  # Database initialization
├── DEPLOYMENT_GUIDE.md       # Step-by-step deployment guide
├── PRE_DEPLOYMENT_CHECKLIST.md # Pre-deployment verification
└── README.md                 # This file
```

## Architecture

### Production Stack
- **Frontend**: Vercel (Next.js with AI agents UI)
- **Backend**: Render (Node.js + Puppeteer automation)
- **Worker**: Render (Background Worker for recording processing)
- **Database**: PostgreSQL (Render managed with enriched metadata)
- **Queue**: Redis (Render managed for job processing)
- **Storage**: Local volumes (recordings, outputs, screenshots)
- **LLM**: OpenAI API (intent generation and selector repair)

### Local Development
- **All Services**: Docker Compose
- **Database**: PostgreSQL container
- **Queue**: Redis container
- **Storage**: Docker volumes

## Services

### Web Service (vergo-backend)
- **Runtime**: Node.js 20
- **Framework**: Next.js with AI agents API
- **Port**: 3000
- **Health Check**: `/api/health`
- **Features**: Recording upload, agent management, execution
- **Environment**: Production

### Worker Service (vergo-worker)
- **Runtime**: Node.js 20
- **Purpose**: Recording processing, LLM integration, Puppeteer automation
- **Dependencies**: Chrome browser, OpenAI API
- **Features**: Metadata extraction, intent generation, selector repair
- **Environment**: Production

### Database (vergo-db)
- **Type**: PostgreSQL 15
- **Storage**: 1GB (starter plan)
- **Backup**: Automated
- **Features**: Enriched metadata storage, agent configurations, intent annotations
- **Access**: Private network

### Cache (vergo-redis)
- **Type**: Redis 7
- **Memory**: 25MB (starter plan)
- **Persistence**: Enabled
- **Features**: Background job queuing, recording processing
- **Access**: Private network

## Environment Variables

### Required Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://host:6379/0

# Security
ENCRYPTION_KEY_BASE64=<32-byte-base64-key>
INTERNAL_RUNNER_TOKEN=<random-hex-token>
NEXTAUTH_SECRET=<random-hex-secret>

# LLM Integration
OPENAI_API_KEY=<your-openai-api-key>

# Storage
FILE_STORAGE_DIR=/data/agent_outputs
RECORDING_STORAGE_DIR=/data/recordings

# URLs
NEXTAUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_API_BASE_URL=https://vergo-backend.onrender.com/api
```

### Generation Commands
```bash
# Generate encryption key
openssl rand -base64 32

# Generate internal token
openssl rand -hex 32

# Generate NextAuth secret
openssl rand -hex 32
```

## Deployment Commands

### Local Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Production Deployment
```bash
# Test everything
./deploy.sh test

# Build images
./deploy.sh build

# Deploy to Render
./deploy.sh render

# Deploy to Vercel
./deploy.sh vercel
```

## Health Checks

### Application Health
```bash
# Check backend health
curl https://vergo-backend.onrender.com/api/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "connected",
    "api": "running",
    "llm": "available",
    "queue": "processing"
  }
}
```

### Service Dependencies
- Web service depends on database, Redis, and OpenAI API
- Worker service depends on database, Redis, and OpenAI API
- Frontend depends on backend API
- Recording processing requires file storage and queue

## Monitoring

### Logs
- **Render**: Available in dashboard
- **Vercel**: Available in dashboard
- **Local**: `docker-compose logs -f`

### Metrics
- **Uptime**: Monitor health endpoints
- **Performance**: Response times, recording processing time
- **LLM Performance**: API response times, repair success rates
- **Errors**: Error rates, automation failures, repair attempts
- **Resources**: CPU, memory, disk usage, recording storage

## Security

### Production Security
- HTTPS enforced (automatic)
- Strong encryption keys for credentials
- Secure database access with enriched metadata
- Private network communication
- OpenAI API key security
- Recording file encryption
- Regular security updates

### Environment Security
- No secrets in code
- Environment-specific configs
- Secure key generation
- Access control

## Scaling

### Current Limits (Free Tier)
- **Render**: 750 hours/month
- **Vercel**: 100GB bandwidth/month
- **Database**: 1GB storage (enriched metadata)
- **Redis**: 25MB memory (job processing)
- **OpenAI**: API usage limits based on plan

### Upgrade Path
- **Render**: Paid plans for more resources
- **Vercel**: Pro plan for more bandwidth
- **Database**: Larger storage plans
- **Redis**: More memory plans

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check connection
psql "<DATABASE_URL>"

# Run migrations
npx prisma migrate deploy
```

#### Redis Connection
```bash
# Check connection
redis-cli -u "<REDIS_URL>" ping
```

#### Puppeteer Issues
```bash
# Check Chrome installation
which google-chrome-stable

# Check permissions
ls -la /data/agent_outputs
```

### Debug Commands
```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs <service-name>

# Execute shell in container
docker-compose exec <service-name> /bin/bash
```

## Backup and Recovery

### Database Backup
- **Automatic**: Render managed backups
- **Manual**: `pg_dump` commands
- **Recovery**: Restore from backup

### File Backup
- **Current**: Local volume storage
- **Future**: S3 integration planned
- **Recovery**: Restore from backup

## Cost Estimation

### Free Tier (Pilot)
- **Render**: $0/month
- **Vercel**: $0/month
- **Total**: $0/month

### Paid Tier (Production)
- **Render**: $21/month (web + worker + db + redis)
- **Vercel**: $20/month (Pro)
- **Total**: ~$41/month

## Support

### Documentation
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Pre-Deployment Checklist](PRE_DEPLOYMENT_CHECKLIST.md)
- [User Testing Playbook](../USER_TESTING_PLAYBOOK.md)

### Getting Help
1. Check this README
2. Review deployment guide
3. Check service logs
4. Verify environment variables
5. Contact support if needed

---

## Next Steps

### After Deployment
1. **Verify Health**: Check all endpoints including LLM integration
2. **Test Recording Pipeline**: Upload and process recordings
3. **Test Agent Execution**: Run agents with fallback repair
4. **Monitor Performance**: Watch metrics including LLM response times
5. **User Testing**: Deploy to pilot users for AI agents workflow
6. **Gather Feedback**: Use testing playbook for automation features

### Future Improvements
1. **S3 Integration**: Replace local storage for recordings
2. **CDN**: Add content delivery for UI assets
3. **Advanced LLM Models**: Better intent understanding
4. **Monitoring**: Add APM tools for automation metrics
5. **CI/CD**: Automated deployments with testing
6. **Scaling**: Handle more users and concurrent automation

---

*This infrastructure is designed for pilot testing of AI agents with LLM-powered automation. Focus on functionality over performance optimization.*
