# drones-frontend — Guía para agentes

Frontend del sistema AeroLuferan (drones autónomos, UAQ): React 19 + Vite +
react-router-dom 7 + react-leaflet. Consume el backend FastAPI en
`http://localhost:8000/api/v1` (ver `../drones-backend/docs/API.md`).

## Comandos

```bash
npm run dev      # Vite en http://localhost:5173
npm run build    # build de producción (vite build)
npm run lint     # eslint sobre src/
```

Verificación mínima tras cambios: `npm run lint && npm run build`.

El stack completo (DB + API + SITL + frontend) se levanta con
`../scripts/dev-stack.sh`; el flujo demo E2E está en `../docs/E2E_DEMO.md`.

## Arquitectura de servicios (`src/services/`)

Toda la comunicación con el backend pasa por estos módulos — **nunca llamar
`fetch` directo desde páginas/componentes**:

| Servicio | Responsabilidad |
|---|---|
| `apiClient.js` | Wrapper fetch: `apiClient.get/post/put/patch/delete`, inyecta `Authorization: Bearer`, parsea `detail` de errores, 401 → purga sesión + dispatch `aeroluferan_unauthorized` + redirect login. `ApiError` con `.status`, `.isOffline`. `buildApiUrl`/`buildWsUrl`. Opción `skipAuthRedirect: true` para llamadas best-effort. |
| `missionService.js` | CRUD `/missions`, start/cancel/confirm-landed, mapper `MisionResponse`→shape de tarjeta UI. Emite `MISSIONS_UPDATED_EVENT` (`aeroluferan_missions_updated`). |
| `droneControlService.js` | `/drone/connect`, `/takeoff`, `/rtl`, `/charging-base`. Equivalencias: `pauseFlight` = cancelar misión EN_CURSO; `emergencyStop`/`returnToBase` = RTL; **no existe resume** en el backend. |
| `telemetryService.js` | Estado global de telemetría con suscriptores. WS `/video/ws/telemetry` (petición `"status"` cada 2 s — el servidor cierra si hay >5 s sin mensajes) con backoff 1 s→30 s; polling REST `/telemetry/current` (5 s), `/missions` EN_CURSO (15 s), `/drone/charging-base` (20 s). Mapea ambos dialectos de payload al shape `{drone, flight, preview, cards, heliport, link, position, raw}`. |
| `alertService.js` | `/alerts` + `/events` + WS `/alerts/ws/notifications`; contadores por rol, descarte local. |
| `geofenceService.js` | CRUD `/geofences`, `syncGeofences`, `validatePointAgainstGeofences(lat, lon, alt)` → `{permitido, motivo}`. Zonas con `source: 'backend'\|'local'`. |
| `videoService.js` + `hooks/useLiveVideoStream.js` | `/video/live` (MJPEG), `/snapshot`, `/stream-info`. |
| `flightLogService.js` | `/telemetry/log`, `/recordings`; `refreshFlightLog()` y export de auditoría. |
| `settingsService.js` | `/settings/operating-window`. |

Autenticación: `src/pages/Admin/authSession.js` (login real → JWT → `/auth/me`;
`normalizeRole`: `ADMIN`→`'admin'`, `GUARDIA`→`'guard'`). Ruta protegida en
`App.jsx` con `ProtectedRoute` por rol.

## Convención de degradación offline

- Si el backend no responde (`ApiError.isOffline` o WS caído): mostrar
  **"Sin conexión"** / campos `"—"` / badge `"Sin Señal"` — **nunca inventar
  datos ni crashear**.
- Los servicios que cachean en localStorage solo devuelven datos demo si
  **nunca** se sincronizó con el backend (flag `aeroluferan_*_synced`).

## Bus interno: localStorage + CustomEvents

Los servicios persisten en claves `aeroluferan_*` y notifican a la UI con
`CustomEvent` (mismas pestaña) + evento `storage` (entre pestañas):

| Clave / Evento | Emisor |
|---|---|
| `aeroluferan_session` / `aeroluferan_session_changed` | authSession |
| `aeroluferan_unauthorized` | apiClient (401 → login) |
| `aeroluferan_missions` / `aeroluferan_missions_updated` | missionService |
| `aeroluferan_geofences` / `aeroluferan_geofences_updated` | geofenceService / GeofenceManager |
| `aeroluferan_alerts_*` (data, overlay, changed) | alertService |
| `aeroluferan_bitacora_flights` / `aeroluferan_bitacora_updated` / `aeroluferan_bitacora_synced` | flightLogService |
| `aeroluferan_autonomous_flight` / `aeroluferan_autonomous_updated` | misión en curso |
| `aeroluferan_settings` / `aeroluferan_settings_updated` | settingsService |
| `aeroluferan_registered_users` / `aeroluferan_users_changed` | gestión de usuarios |

Las páginas se suscriben con `addEventListener(clave, handler)` +
`addEventListener('storage', handler)`.

## Reglas y convenciones

- **Roles**: crear/iniciar misión, conectar, despegar, `dock-recharge` = solo
  ADMIN. Listar/cancelar misión, RTL, ver telemetría/video/alertas = ADMIN y
  GUARDIA. El botón prohibido se omite o se muestra el 403 del backend.
- **Lint**: la regla `react-hooks/set-state-in-effect` prohíbe `setState`
  síncrono dentro de `useEffect` — el patrón usado es
  `window.setTimeout(() => load(), 0)` para la carga inicial.
- UI en español, CSS por página (no CSS-in-JS), sin librerías nuevas sin
  necesidad (el stack: leaflet, react-leaflet, react-router-dom).
- Waypoints de misión: mínimo 2, `orden_waypoint` consecutivo desde 1,
  altitud 2–200 m, dentro de una geocerca activa, en ventana 06:00–23:00.
- Endpoints de ingesta (`/detections/ingest`, `/video/frame`,
  `/recordings/upload`, `POST /telemetry/log`) son del pipeline
  dron→backend — **no** crear UI para ellos.
