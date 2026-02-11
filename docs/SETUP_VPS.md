# VPS & Render Service Setup

The Render Service is a Node.js/Express application that handles video rendering using FFmpeg. It is deployed as a Docker container on a VPS.

## Prerequisites

-   A VPS (Virtual Private Server) running Ubuntu 20.04+ or Debian 11+.
-   A domain pointing to your VPS IP address (e.g., `render.clipex.ai`) OR a Cloudflare Tunnel setup.
-   Access to the VPS via SSH.

## Installation

### 1. Install Docker & Docker Compose

Connect to your VPS and install Docker:

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose (if not included in newer Docker versions)
sudo apt-get install docker-compose-plugin
# OR for older systems:
sudo apt-get install docker-compose
```

### 2. Deployment Directory Structure

On your VPS, create a directory for the service:

```bash
mkdir -p ~/clipex-render
cd ~/clipex-render
```

You need to transfer the contents of the `render-service` folder from your repository to this directory. You can use `scp`, `rsync`, or `git clone`.

**Using Git:**

```bash
git clone https://github.com/YourUsername/clipix.ai-new.git temp-repo
mv temp-repo/render-service/* .
rm -rf temp-repo
```

### 3. Configuration

Create a `.env` file in the `render-service` directory:

```bash
nano .env
# Add the following:
CORS_ORIGIN=https://clipex.ai  # Your frontend URL
PORT=3001
```

## Running the Service

Start the service using Docker Compose:

```bash
docker compose up -d --build
```

Check the logs to ensure it's running:

```bash
docker compose logs -f
```

## Exposing to the Internet

You have two main options to expose the service: **Nginx Reverse Proxy** or **Cloudflare Tunnel**.

### Option A: Cloudflare Tunnel (Recommended)

If you already have a Cloudflare Tunnel running (e.g., in a Docker network called `tunnel_default`), this is the easiest way.

1.  **Update `docker-compose.yml`**:
    Edit the file to connect the service to your tunnel network.

    ```yaml
    version: '3.8'
    services:
      clipex-render:
        build: .
        restart: unless-stopped
        networks:
          - default
          - tunnel_default # Name of your tunnel network

    networks:
      tunnel_default:
        external: true
    ```

2.  **Configure Cloudflare Dashboard**:
    -   Go to **Zero Trust** -> **Networks** -> **Tunnels**.
    -   Select your tunnel -> **Configure**.
    -   **Public Hostname**:
        -   **Subdomain**: `api-clipex` (or whatever you prefer)
        -   **Domain**: `yourdomain.com`
        -   **Service**: `http://clipex-render:3001` (Use the container name as hostname)

3.  **Restart**:
    `docker compose up -d`

### Option B: Nginx Reverse Proxy with SSL

If you prefer using a direct public IP and managing SSL yourself:

1.  **Install Nginx**:
    ```bash
    sudo apt install nginx certbot python3-certbot-nginx -y
    ```

2.  **Configure Nginx**:
    Create a config file: `/etc/nginx/sites-available/clipex-render`

    ```nginx
    server {
        listen 80;
        server_name render.clipex.ai; # Your domain

        client_max_body_size 500M; # allow large uploads

        location / {
            proxy_pass http://localhost:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            
            # Increase timeouts for long rendering jobs
            proxy_read_timeout 300s;
            proxy_send_timeout 300s;
        }
    }
    ```

3.  **Enable Site**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/clipex-render /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    ```

4.  **Setup SSL**:
    ```bash
    sudo certbot --nginx -d render.clipex.ai
    ```

## Maintenance

-   **Update**: `git pull` then `docker compose up -d --build`
-   **Clean older renders**:
    ```bash
    # Clean files older than 7 days inside the container
    docker exec clipex-render find /app/data/renders -type f -mtime +7 -delete
    ```
