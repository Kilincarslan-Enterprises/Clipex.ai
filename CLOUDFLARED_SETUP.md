# Integration in bestehenden Cloudflare Tunnel

Da du bereits einen Cloudflare Tunnel in einem anderen Docker-Netzwerk laufen hast, musst du den Render-Service nur in dieses Netzwerk "einhängen".

## Schritt 1: Netzwerkname herausfinden

Finde heraus, wie das Docker-Netzwerk deines Tunnels heißt. Führe dazu auf dem VPS aus:
```bash
docker network ls
```
Meistens heißt es etwas wie `cloudflare_network` oder `tunnel_default`.

## Schritt 2: Docker Compose anpassen

Ich habe die Datei bereits nach `render-service/docker-compose.yml` verschoben und angepasst. Du musst dort nur noch den Netzwerknamen eintragen:

```yaml
# In render-service/docker-compose.yml
networks:
  DEIN_CLOUDFLARE_NETWORK: # <--- Hier den Namen aus Schritt 1 eintragen
    external: true
```

## Schritt 3: Cloudflare Dashboard konfigurieren

Damit dein bestehender Tunnel weiß, wohin er die Anfragen schicken soll:
1.  Gehe im Cloudflare Dashboard zu **Zero Trust** -> **Networks** -> **Tunnels**.
2.  Wähle deinen existierenden Tunnel aus und klicke auf **Configure**.
3.  Gehe zum Tab **Public Hostnames** und füge einen Eintrag hinzu:
    *   **Subdomain**: `api-clipex`
    *   **Domain**: `kilincarslanenterprises.com`
    *   **Service**: `http://clipex-render:3001`
        *   *Wichtig:* Da sie im gleichen Netzwerk sind, nutzt du einfach den `container_name` als Hostnamen.

## Schritt 4: Starten

Wechsle in den Ordner und starte den Service:
```bash
cd render-service
docker-compose up -d --build
```

Jetzt ist dein Render-Service über deinen bereits existierenden Tunnel sicher erreichbar.
