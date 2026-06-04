# GameServer Frontend

Ein React/Vite-Frontend zur Verwaltung deines GameServer-Backends über eine API mit API-Key-Authentifizierung.

## Features

- Login mit API-Key und Backend-URL
- Proxmox-ähnliches Layout mit Sidebar und Dashboard
- Verwaltung mehrerer Backend-Server
- Anzeige von API-Info und Systemübersicht
- Integration mit `/api/servers` und `/api/info`

## Installation

```bash
npm install
```

## Entwicklung

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Hinweise

- Das Frontend erwartet ein Backend unter der eingegebenen Base-URL.
- Alle geschützten API-Aufrufe verwenden den Header `Authorization: Bearer YOUR_API_KEY`.
- Für den produktiven Einsatz kann das gebaute `dist`-Verzeichnis von Apache oder einem anderen Webserver ausgeliefert werden.
