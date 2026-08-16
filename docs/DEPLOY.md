# NaviDash Deployment Guide

This document is intended for long-term self-hosted use. The recommended setup is Docker Compose, with runtime data mounted outside the repository.

## Prerequisites

You will need:

- Docker Engine
- Docker Compose v2
- A writable host data directory

Verify that Compose is available:

```bash
docker compose version
```

If your system only provides legacy `docker-compose`, you can use it in place of `docker compose` in the commands below.

## Recommended: Docker Compose

### 1. Clone the Project

```bash
git clone https://github.com/wtfllix/navidash.git
cd navidash
```

### 2. Prepare the Persistence Directory

Default path is `/opt/navidash-data`:

```bash
sudo mkdir -p /opt/navidash-data
```

Container startup will adjust mount directory permissions. Do not keep important runtime data solely inside the container.

If you need a different location, set it in `.env`:

```env
NAVIDASH_DATA_DIR=/your/data/path
```

### 3. Create Environment Configuration

```bash
cp .env.example .env
```

For personal deployments, all optional variables can remain empty. Common variables are listed below:

| Variable | Default Value | Description |
| --- | --- | --- |
| `NAVIDASH_DATA_DIR` | `/opt/navidash-data` | Host data directory |
| `NAVIDASH_ACCESS_PASSWORD` | Empty | Enables single-user access protection |
| `QWEATHER_API_KEY` | Empty | QWeather API Key or JWT |
| `QWEATHER_API_HOST` | Empty | Custom QWeather-compatible Host |
| `QWEATHER_AUTH_TYPE` | `apikey` | `apikey` or `jwt` |

#### Optional: Single-User Access Protection

```env
NAVIDASH_ACCESS_PASSWORD=replace-with-a-long-private-password
```

Leave empty to disable. The password resides only in server environment variables and will not be written to widgets, runtime data, or exported backups.

This provides a lightweight layer of protection for private instances and does not replace HTTPS, rate limiting, or a full authentication system in public network environments.

#### Optional: Today Weather

API Key mode:

```env
QWEATHER_API_KEY=your_qweather_key
QWEATHER_API_HOST=your-project-host.re.qweatherapi.com
QWEATHER_AUTH_TYPE=apikey
```

JWT mode:

```env
QWEATHER_API_KEY=your_qweather_jwt
QWEATHER_API_HOST=your-project-host.re.qweatherapi.com
QWEATHER_AUTH_TYPE=jwt
```

`QWEATHER_API_HOST` can include or omit `https://`. The container must be restarted after modifying weather configuration.

### 4. Start the Application

```bash
docker compose pull
docker compose up -d
```

Check status and logs:

```bash
docker compose ps
docker compose logs --tail=100 navidash
```

Open in browser:

```text
http://localhost:3000
```

### 5. LAN Access

Devices on the same local network use the host IP:

```text
http://192.168.x.x:3000
```

If unable to access, check the following in order:

1. Check whether `docker compose ps` shows `0.0.0.0:3000->3000/tcp`.
2. Ensure your mobile device and server are on the same LAN without guest network isolation enabled.
3. Verify that the host firewall allows TCP port `3000`.
4. Check whether router or system firewalls are blocking inter-device communication.

## HTTPS & Reverse Proxy

If your instance is accessed over the public internet or via a domain, using a reverse proxy such as Caddy, Nginx, or Traefik to provide HTTPS is recommended.

Minimal Nginx example:

```nginx
server {
    listen 443 ssl http2;
    server_name start.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

When the reverse proxy and NaviDash reside on the same machine, you can tighten the Compose port mapping to:

```yaml
ports:
  - "127.0.0.1:3000:3000"
```

After modification, run `docker compose up -d` to apply changes.

## Upgrades

It is recommended to back up your data before upgrading:

```bash
git pull --ff-only
docker compose pull
docker compose up -d --remove-orphans
docker compose ps
```

Upgrades will not automatically clear the mount directory. Legacy `widgets.json`, `widget-layouts.json`, and
`widget-configs.json` can still be read as migration sources; new data is written to `widget-snapshot.json`.

`0.7.3` marks the starting point where NaviDash officially commits to forward compatibility for persistent data. Subsequent versions verify migration of Snapshot, Settings, and in-app backups using fixed test fixtures. Earlier versions will still make best-effort attempts to read recognized data, but legacy widgets and canvas layouts are not guaranteed to be fully preserved; when upgrading from `0.6.x` or earlier, please back up the entire data directory first and expect to reconfigure the homepage layout.

## Backup and Restore

### In-App Backup

Export JSON under "Settings → Data Tools", which is suitable for migrating homepage layouts, configurations, bookmarks, and settings.

### Data Directory Backup

To ensure consistent file state, pause the container first:

```bash
docker compose stop navidash
sudo tar -C /opt -czf "navidash-data-$(date +%F).tar.gz" navidash-data
docker compose start navidash
```

If using a custom `NAVIDASH_DATA_DIR`, replace the path accordingly.

When restoring, it is recommended to keep the current directory first, then extract the backup into a new empty directory:

```bash
docker compose down
sudo mv /opt/navidash-data /opt/navidash-data.before-restore
sudo tar -C /opt -xzf navidash-data-YYYY-MM-DD.tar.gz
docker compose up -d
```

After confirming the restore succeeded, dispose of the `.before-restore` directory as needed.

## Runtime Data

The container data directory is `/app/data`, and primary files include:

- `settings.json`
- `widget-snapshot.json`

Widget layouts, configurations, and bookmarks are saved together via atomic snapshots with revisions. Weather keys, access passwords, and launcher local learning history are not included in this snapshot:

- Weather keys and access passwords come from server environment variables.
- Launcher learning history is saved by default in the browser accessing it.

## Alternative Running Methods

### Docker Run

```bash
docker run -d \
  --name navidash \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /opt/navidash-data:/app/data \
  -e DATA_DIR=/app/data \
  -e NAVIDASH_ACCESS_PASSWORD= \
  -e QWEATHER_API_KEY= \
  -e QWEATHER_API_HOST= \
  -e QWEATHER_AUTH_TYPE=apikey \
  ghcr.io/wtfllix/navidash:latest
```

### Local Image Build

```bash
docker build -t navidash:local .
docker run -d \
  --name navidash \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /opt/navidash-data:/app/data \
  -e DATA_DIR=/app/data \
  navidash:local
```

### Running Directly with Node.js

Requires Node.js 18+, recommended Node.js 20:

```bash
npm ci
cp .env.example .env.local
npm run build
DATA_DIR=/absolute/path/to/navidash-data npm start
```

Ensure the running user has read/write permissions for `DATA_DIR`. In production environments, using systemd, PM2, or another process manager is recommended.

## Frequently Asked Questions (FAQ)

### Page loads, but changes disappear after refreshing

- Ensure `DEMO_MODE` is not enabled.
- Check whether Compose has actually mounted `/app/data`.
- Check `docker compose logs navidash` for permission or write errors.

### Today widget does not show weather

- Check Key, Host, and auth type in `.env`.
- Run `docker compose up -d` to recreate the container.
- Refresh status and test connection under "Weather Service" in the settings page.
- Confirm that the host machine can access the weather service address.

### Cannot access via LAN on mobile devices

- Do not use `localhost` on mobile devices; use the IP address of the computer or server running NaviDash.
- Confirm that port mapping is `0.0.0.0:3000` rather than binding only to `127.0.0.1`.
- Check firewall settings and Wi-Fi client isolation.

### Container fails to start

```bash
docker compose ps
docker compose logs --tail=200 navidash
```

Focus on checking data directory permissions, whether port `3000` is occupied, and if environment variable syntax is correct.

### Port 3000 is already in use

Modify the host port in `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"
```

Then access `http://localhost:8080`.

## Image Publishing

The [Docker Publish Workflow](../.github/workflows/docker-publish.yml) in the repository builds GHCR images on updates to `master`, `main`, and version tags. Compose uses by default:

```text
ghcr.io/wtfllix/navidash:latest
```
