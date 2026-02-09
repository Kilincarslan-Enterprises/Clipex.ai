# Clipex.ai VPS Deployment

## Quick VPS Setup

### 1. Prerequisites
```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose -y

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone Repository
```bash
git clone https://github.com/your-username/clipix.ai-new.git
cd clipix.ai-new
```

### 3. Configure Environment
```bash
# Create .env file
nano .env
```

Add your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Build and Start
```bash
# Build the Docker image
docker-compose build

# Start the service
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 5. Verify
```bash
# Check if container is running
docker ps

# Test the endpoint
curl http://localhost:3000
```

## Nginx Reverse Proxy

### Install Nginx
```bash
sudo apt-get install nginx -y
```

### Configure
```bash
sudo nano /etc/nginx/sites-available/clipex-render
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name render.clipex.ai;  # Replace with your domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for video rendering
        proxy_read_timeout 600s;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
    }

    # Increase max body size for video uploads
    client_max_body_size 500M;
}
```

### Enable and Start
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/clipex-render /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d render.clipex.ai

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

## Maintenance Commands

### View Logs
```bash
# Application logs
docker-compose logs -f clipex-render

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Service
```bash
docker-compose restart
```

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

### Cleanup
```bash
# Remove old images
docker image prune -a

# Remove old renders (optional)
find public/renders -type f -mtime +7 -delete
```

## Monitoring

### Check Resource Usage
```bash
# Docker stats
docker stats clipex-render

# System resources
htop
```

### Disk Space
```bash
# Check disk usage
df -h

# Check uploads/renders size
du -sh public/uploads
du -sh public/renders
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs clipex-render

# Check if port is in use
sudo lsof -i :3000
```

### FFmpeg not found
```bash
# Enter container
docker exec -it clipex-render sh

# Check FFmpeg
ffmpeg -version
```

### Out of disk space
```bash
# Clean old renders
rm -rf public/renders/*

# Clean Docker
docker system prune -a
```

## Security Hardening

### Firewall
```bash
# Install UFW
sudo apt-get install ufw -y

# Allow SSH, HTTP, HTTPS
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443

# Enable firewall
sudo ufw enable
```

### Fail2Ban
```bash
# Install
sudo apt-get install fail2ban -y

# Start service
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

## Backup Strategy

### Database
- Supabase handles automatic backups
- Export manually if needed

### Uploaded Assets
```bash
# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
tar -czf /backups/uploads-$DATE.tar.gz public/uploads/
tar -czf /backups/renders-$DATE.tar.gz public/renders/

# Keep only last 7 days
find /backups -type f -mtime +7 -delete
```

### Cron Job
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh
```

## Performance Tuning

### Increase Node.js Memory
Edit `docker-compose.yml`:
```yaml
environment:
  - NODE_OPTIONS=--max-old-space-size=4096
```

### FFmpeg Optimization
- Use hardware acceleration if available
- Optimize filter chains
- Consider render queue system

## Cost Optimization

### Recommended VPS Specs
- **Development**: 1 CPU, 2GB RAM ($5-10/month)
- **Production**: 2 CPU, 4GB RAM ($20-40/month)
- **High Traffic**: 4 CPU, 8GB RAM ($40-80/month)

### Providers
- DigitalOcean
- Hetzner (cheaper)
- Linode
- Vultr

## Next Steps

1. Point your domain to VPS IP
2. Configure DNS records
3. Set up SSL certificate
4. Update `NEXT_PUBLIC_RENDER_API_URL` in Cloudflare Pages
5. Test end-to-end rendering

---

**Your VPS rendering service is now ready! 🚀**
