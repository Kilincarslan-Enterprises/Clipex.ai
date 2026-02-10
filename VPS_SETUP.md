# Clipex.ai — VPS Render Service Setup

A standalone Node.js/Express service that receives template JSON and renders videos with FFmpeg.  
Deployed via Docker on your VPS. The frontend (Cloudflare Pages) calls this service.

---

## Architecture

```
┌──────────────────────┐         POST /render
│  Cloudflare Pages    │ ──────────────────────► ┌──────────────────┐
│  (Next.js Frontend)  │                         │  VPS (Docker)    │
│  clipex.ai           │ ◄────────────────────── │  render-service  │
└──────────────────────┘      { url: "/renders/…" } │  port 3001       │
                                                 └──────────────────┘
```

---

## Step 1 — Prerequisites

```bash
# Install Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
sudo apt-get install -y docker-compose
sudo usermod -aG docker $USER && newgrp docker
```

## Step 2 — Clone & Configure

```bash
git clone https://github.com/Kilincarslan-Enterprises/Clipex.ai.git
cd Clipex.ai

# Set CORS to your Cloudflare Pages domain
echo "CORS_ORIGIN=https://clipex.ai" > .env
```

## Step 3 — Build & Start

```bash
docker-compose up -d --build

# Verify
docker ps                          # should show clipex-render
curl http://localhost:3001/health   # {"status":"ok", ...}
```

## Step 4 — Nginx Reverse Proxy + SSL

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx

sudo tee /etc/nginx/sites-available/render <<'EOF'
server {
    listen 80;
    server_name render.clipex.ai;   # ← your subdomain

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

sudo ln -sf /etc/nginx/sites-available/render /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d render.clipex.ai
```

## Step 5 — Connect Frontend

In your **Cloudflare Pages** environment variables, set:

```
NEXT_PUBLIC_RENDER_API_URL=https://render.clipex.ai
```

---

## API Reference

| Method | Path      | Body                                          | Response                |
|--------|-----------|-----------------------------------------------|-------------------------|
| POST   | `/render` | `{ template, assets, placeholders }`          | `{ url: "/renders/…" }` |
| POST   | `/upload` | `multipart/form-data` with `file` field       | `{ url, filename }`     |
| GET    | `/health` | —                                             | `{ status: "ok", … }`  |

---

## Maintenance

```bash
# View logs
docker-compose logs -f render

# Update
git pull && docker-compose up -d --build

# Clean old renders (older than 7 days)
docker exec clipex-render find /app/data/renders -type f -mtime +7 -delete
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error in browser | Set `CORS_ORIGIN` in `.env` to your frontend domain |
| Render timeout | Increase `proxy_read_timeout` in Nginx |
| FFmpeg not found | Verify: `docker exec clipex-render ffmpeg -version` |
| Port already in use | Change `PORT` in `.env` and `docker-compose.yml` |
