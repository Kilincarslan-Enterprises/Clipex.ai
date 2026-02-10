# Clipex.ai — Deployment Summary

## ✅ Current Status

Your project is now **split into two deployments**:

### 1. Frontend (Cloudflare Pages)
- **Repository**: Kilincarslan-Enterprises/Clipex.ai
- **Build Command**: `npm run pages:build`
- **Output Directory**: `.vercel/output/static`
- **Routes**: `/` (Dashboard), `/editor/[id]` (Editor), `/api/health`
- **Environment Variables**:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  NEXT_PUBLIC_RENDER_API_URL=https://render.clipex.ai
  ```

### 2. Backend (VPS / Docker)
- **Location**: `render-service/` folder
- **Port**: 3001
- **Routes**: `/render`, `/upload`, `/health`
- **Container**: `clipex-render`

---

## 🚀 Deployment Steps

### Step 1 — Deploy Frontend to Cloudflare Pages

```bash
# Commit and push
git add .
git commit -m "feat: Separate render service for VPS deployment"
git push
```

In **Cloudflare Pages Dashboard**:
1. Connect GitHub repo
2. Build settings:
   - Build command: `npm run pages:build`
   - Build output: `.vercel/output/static`
3. Add environment variables (see above)
4. Deploy

Expected result: ✅ Build succeeds, frontend live at `https://clipex.pages.dev`

---

### Step 2 — Deploy Backend to VPS

SSH into your VPS and run:

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh
sudo apt-get install -y docker-compose
sudo usermod -aG docker $USER && newgrp docker

# 2. Clone repo
git clone https://github.com/Kilincarslan-Enterprises/Clipex.ai.git
cd Clipex.ai

# 3. Set CORS
echo "CORS_ORIGIN=https://clipex.pages.dev" > .env

# 4. Start service
docker-compose up -d --build

# 5. Verify
curl http://localhost:3001/health
# Should return: {"status":"ok","service":"clipex-render",...}
```

---

### Step 3 — Configure Nginx + SSL

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Create Nginx config
sudo tee /etc/nginx/sites-available/render <<'EOF'
server {
    listen 80;
    server_name render.clipex.ai;
    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
EOF

# Enable
sudo ln -sf /etc/nginx/sites-available/render /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d render.clipex.ai
```

---

### Step 4 — Update Frontend Environment

Go back to **Cloudflare Pages** → Settings → Environment variables:

Update:
```
NEXT_PUBLIC_RENDER_API_URL=https://render.clipex.ai
```

Redeploy the frontend for changes to take effect.

---

## 🧪 Testing

### Frontend
1. Visit `https://clipex.pages.dev`
2. Create a new project
3. Upload an asset (this will fail until backend is configured)

### Backend
```bash
# Health check
curl https://render.clipex.ai/health

# Test upload
curl -X POST https://render.clipex.ai/upload \
  -F "file=@sample.mp4"
# Returns: {"url":"/uploads/...","filename":"..."}
```

### Full Integration
1. In the editor, upload a video
2. Drag it to the canvas
3. Click "Render Video"
4. Check browser console — should POST to `https://render.clipex.ai/render`
5. Wait for render completion
6. Download the rendered video

---

## 📝 Architecture

```
┌─────────────────────┐
│  User's Browser     │
└──────────┬──────────┘
           │
           │ HTTPS
           ▼
┌──────────────────────┐       ┌─────────────────────┐
│  Cloudflare Pages    │       │  Supabase Cloud     │
│  clipex.pages.dev    │◄─────►│  (Database)         │
│                      │       └─────────────────────┘
│  • Dashboard         │
│  • Editor UI         │
│  • Asset Panel       │
└──────────┬───────────┘
           │
           │ POST /render
           │ (Template JSON)
           ▼
┌──────────────────────┐
│  VPS (Docker)        │
│  render.clipex.ai    │
│                      │
│  • Express API       │
│  • FFmpeg Engine     │
│  • File Storage      │
└──────────────────────┘
```

---

## 🛠 Maintenance

### Update Frontend
```bash
git pull
# Cloudflare auto-deploys on push
```

### Update Backend
```bash
cd Clipex.ai
git pull
docker-compose down
docker-compose up -d --build
```

### Monitor Logs
```bash
# Backend
docker-compose logs -f render

# View disk usage
docker exec clipex-render du -sh /app/data/*
```

### Cleanup Old Renders
```bash
# Delete renders older than 7 days
docker exec clipex-render find /app/data/renders -type f -mtime +7 -delete
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS error in browser | Update `CORS_ORIGIN` in VPS `.env` to match frontend domain |
| Upload fails with 413 | Increase `client_max_body_size` in Nginx |
| Render timeout | Increase `proxy_read_timeout` in Nginx config |
| "Cannot connect to render service" | Check VPS firewall, ensure port 80/443 open |
| SSL certificate issues | Re-run `sudo certbot --nginx -d render.clipex.ai` |

---

## 📊 Cost Breakdown

| Service | Tier | Cost |
|---------|------|------|
| Cloudflare Pages | Free | $0/month |
| Supabase | Free | $0/month (500MB DB, 1GB storage) |
| VPS (Hetzner CX11) | Paid | €4.15/month (~$4.50) |
| **Total** | | **~$5/month** |

For production with heavy usage:
- Upgrade Supabase to Pro: $25/month
- Larger VPS (CX21): €5.83/month
- **Total**: ~$30-35/month

---

## 🎉 Next Steps

1. ✅ Deploy frontend to Cloudflare Pages
2. ✅ Deploy backend to VPS
3. ✅ Configure DNS (render.clipex.ai → VPS IP)
4. ✅ Test full rendering pipeline
5. 🔄 Add authentication (Supabase Auth)
6. 🔄 Migrate assets to Supabase Storage
7. 🔄 Add render queue system (Bull, Redis)
8. 🔄 Implement progress tracking

---

**You're all set! 🚀**
