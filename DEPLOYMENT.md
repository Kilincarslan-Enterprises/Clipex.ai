# Clipex.ai - Deployment Guide

## Overview

This guide covers deploying Clipex.ai with:
- **Frontend**: Cloudflare Pages
- **Rendering**: VPS with Docker + FFmpeg

## Prerequisites

- Supabase account and project
- Cloudflare account
- VPS with Docker installed (for rendering)
- GitHub repository

---

## Part 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### 1.2 Run Database Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20240209_init.sql`
4. Paste and run the SQL

This creates:
- `projects` table
- `assets` storage bucket
- Public access policies (update for production auth)

### 1.3 Configure Storage

1. Go to **Storage** in Supabase dashboard
2. Verify `assets` bucket was created
3. Set bucket to **Public** (or configure RLS policies)

---

## Part 2: Cloudflare Pages Deployment

### 2.1 Prepare Repository

1. Push your code to GitHub
2. Ensure `.env` is in `.gitignore`
3. Commit all changes

### 2.2 Connect to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Create application** → **Pages**
3. Connect your GitHub repository
4. Select the `clipix.ai-new` repository

### 2.3 Configure Build Settings

**Framework preset**: Next.js

**Build command**:
```bash
npm run pages:build
```

**Build output directory**:
```
.vercel/output/static
```

**Root directory**: `/` (leave as default)

**Node version**: `20` or higher

### 2.4 Environment Variables

Add these in Cloudflare Pages settings:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_RENDER_API_URL=https://your-vps-domain.com/api/render
```

**Important**: `NEXT_PUBLIC_RENDER_API_URL` should point to your VPS rendering service (Part 3).

### 2.5 Deploy

1. Click **Save and Deploy**
2. Wait for build to complete
3. Your site will be live at `https://your-project.pages.dev`

### 2.6 Custom Domain (Optional)

1. Go to **Custom domains** in Cloudflare Pages
2. Add your domain (e.g., `clipex.ai`)
3. Follow DNS configuration instructions

---

## Part 3: VPS Rendering Service (Docker)

### 3.1 VPS Requirements

- Ubuntu 20.04+ or Debian 11+
- 2GB RAM minimum
- Docker and Docker Compose installed
- Domain pointed to VPS (e.g., `render.clipex.ai`)

### 3.2 Install Docker

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose -y

# Add user to docker group
sudo usermod -aG docker $USER
```

### 3.3 Create Dockerfile

Create `Dockerfile.render` in your project:

```dockerfile
FROM node:20-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build Next.js
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### 3.4 Create docker-compose.yml

```yaml
version: '3.8'

services:
  clipex-render:
    build:
      context: .
      dockerfile: Dockerfile.render
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    volumes:
      - ./public/uploads:/app/public/uploads
      - ./public/renders:/app/public/renders
    restart: unless-stopped
```

### 3.5 Deploy to VPS

```bash
# Clone repository
git clone https://github.com/your-username/clipix.ai-new.git
cd clipix.ai-new

# Create .env file
nano .env
# Add your Supabase credentials

# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 3.6 Configure Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt-get install nginx -y

# Create Nginx config
sudo nano /etc/nginx/sites-available/clipex-render
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name render.clipex.ai;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for video rendering
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }

    client_max_body_size 500M;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/clipex-render /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 3.7 SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d render.clipex.ai

# Auto-renewal is configured automatically
```

---

## Part 4: Testing

### 4.1 Test Frontend

1. Visit your Cloudflare Pages URL
2. Create a new project
3. Upload assets
4. Add blocks to timeline

### 4.2 Test Rendering

1. Click "Render Video"
2. Check browser console for errors
3. Verify request goes to your VPS
4. Check VPS logs: `docker-compose logs -f`

### 4.3 Common Issues

**Render fails on Cloudflare**:
- Ensure `NEXT_PUBLIC_RENDER_API_URL` is set correctly
- Check VPS is accessible from internet

**CORS errors**:
- Add CORS headers in VPS Nginx config or Next.js API route

**Upload fails**:
- Check file size limits in Nginx (`client_max_body_size`)
- Verify Supabase Storage bucket permissions

---

## Part 5: Production Optimizations

### 5.1 Supabase

- Enable Row Level Security (RLS)
- Add authentication (Supabase Auth)
- Set up database backups

### 5.2 Cloudflare

- Enable caching rules
- Configure WAF (Web Application Firewall)
- Set up analytics

### 5.3 VPS

- Set up monitoring (e.g., Prometheus + Grafana)
- Configure log rotation
- Set up automated backups
- Scale horizontally with load balancer if needed

### 5.4 Asset Storage

**Option 1**: Keep using Supabase Storage
- Update upload API to use Supabase Storage SDK
- Serve assets from Supabase CDN

**Option 2**: Use Cloudflare R2
- Cheaper for large files
- Better integration with Cloudflare Pages

---

## Part 6: Monitoring & Maintenance

### 6.1 Logs

**Cloudflare Pages**:
- View build logs in dashboard
- Use Cloudflare Analytics

**VPS**:
```bash
# View application logs
docker-compose logs -f clipex-render

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 6.2 Updates

```bash
# On VPS
cd clipix.ai-new
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

### 6.3 Backups

**Database**:
- Supabase handles automatic backups
- Export manually via dashboard if needed

**Rendered Videos**:
```bash
# Backup renders directory
tar -czf renders-backup-$(date +%Y%m%d).tar.gz public/renders/
```

---

## Cost Estimates

### Free Tier

- **Supabase**: 500MB database, 1GB storage
- **Cloudflare Pages**: Unlimited requests, 500 builds/month
- **VPS**: $5-10/month (DigitalOcean, Hetzner, etc.)

### Paid (Growing)

- **Supabase Pro**: $25/month (8GB database, 100GB storage)
- **Cloudflare Pages**: Free (or $20/month for Workers Paid)
- **VPS**: Scale up as needed ($20-50/month for better specs)

---

## Security Checklist

- [ ] Enable Supabase RLS policies
- [ ] Add authentication (Supabase Auth)
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS (SSL certificates)
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Regular security updates
- [ ] Monitor for suspicious activity

---

## Support

For issues:
1. Check logs (Cloudflare, VPS, Supabase)
2. Review GitHub issues
3. Contact support channels

---

## Next Steps

1. **Add Authentication**: Implement Supabase Auth for user-specific projects
2. **Improve Rendering**: Optimize FFmpeg commands, add progress tracking
3. **Asset Management**: Migrate to Supabase Storage or R2
4. **Templates**: Create template marketplace
5. **Collaboration**: Add real-time collaboration features

Good luck with your deployment! 🚀
