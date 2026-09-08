# ms-tch-media

> Generado por **Jarvis Platform** — 29/4/2026

## Descripción
Media Service para carga, descarga y gestión de archivos (documentos, imágenes, etc.).

## Stack Tecnológico
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: NestJS 10
- **Upload**: Multer (disk storage)
- **Auth**: none
- **Kafka Logger**: Sí
- **API Docs**: Swagger UI (`/api/docs`)

## Endpoints

Prefijo global `api` + versionado por URI (`app.setGlobalPrefix('api', { exclude: ['health'] })` +
`enableVersioning` en `main.ts`, `defaultVersion: '1'`); `health` queda fuera del prefijo y sin versión.
Ninguna ruta usa guard — el control de acceso se delega al gateway (`apigw-tch`).

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/media` | Listar todos los archivos subidos en la sesión |
| GET | `/api/v2/media` | Igual que v1, pero envuelve el array en `{apiVersion, count, data}` — ejemplo de ruta versionada; v1 se mantiene intacta para clientes que no migraron |
| GET | `/api/v1/media/practitioner/:practitionerUuid/photo` | Sirve la foto de perfil del practitioner (UUID FHIR) desde el file server, con soporte de `Range` para streaming de video y logging a Kafka (`MEDIA_DOWNLOAD`) |
| GET | `/api/v1/media/media/:mediaId/file` | Sirve un archivo de media por su `mediaId` (registro en `practitioner.practitioner_media`), mismo soporte de streaming/Range y logging a Kafka |
| GET | `/api/v1/media/:id` | Metadata de un archivo subido |
| POST | `/api/v1/media/upload` | Sube un archivo (`multipart/form-data`, campo `file`) y registra evento Kafka `FILE_UPLOAD` |
| GET | `/api/v1/media/:id/download` | Descarga un archivo subido y registra evento Kafka `FILE_DOWNLOAD` |
| DELETE | `/api/v1/media/:id` | Elimina un archivo subido (204) y registra evento Kafka `FILE_DELETE` |

## Kafka — Audit Trail

Cada operación de archivo genera un evento en Kafka:

| Evento | Trigger | Payload |
|--------|---------|---------|
| `FILE_UPLOAD` | POST /api/v1/media/upload | id, filename, size, mimetype |
| `FILE_DOWNLOAD` | GET /api/v1/media/:id/download | id, filename, mimetype, size |
| `FILE_DELETE` | DELETE /api/v1/media/:id | id, filename |

El **AuditInterceptor** registra además cada request HTTP (método, url, status, duración).

## Variables de entorno

| Variable | Requerida | Default | Descripción |
|----------|:---------:|---------|-------------|
| `PORT` | — | `10406` | Puerto HTTP |
| `NODE_ENV` | — | `development` | Entorno |
| `USE_SSL` | — | `true` | Activa el servidor HTTPS adicional en `SSL_PORT` |
| `SSL_PORT` | — | `20406` | Puerto HTTPS (solo si `USE_SSL=true`) |
| `CERT_PATH` | — | `/app/certs` | Ruta a los certificados SSL dentro del contenedor (o local en Windows sin Docker) |
| `CERTS_HOST_PATH` | — | `../certs-dev` | Ruta HOST montada como `CERT_PATH` (solo `docker-compose.dev.yml`) |
| `MEDIA_PATH` | — | `/dev-media` | Ruta donde el servicio accede a los archivos, dentro del contenedor (o local en Windows) |
| `MEDIA_HOST_PATH` | — | `./dev-media` | Ruta HOST montada como `/proyectos/NEW_HCE/MEDIA` (solo `docker-compose.dev.yml`) |
| `DB_HOST` | — | `host.docker.internal` | Host de SQL Server |
| `DB_PORT` | — | `1433` | Puerto de SQL Server |
| `DB_USER` | ✓ | — | Usuario de SQL Server |
| `DB_PASS` | ✓ | — | Password de SQL Server |
| `DB_NAME` | — | `HCE_CORE_V2` | Base de datos |
| `DB_INSTANCE` | — | — | Instancia nombrada de SQL Server (vacío = default) |
| `UPLOADS_DIR` | — | `./uploads` | Directorio de almacenamiento temporal (multer) |
| `MAX_FILE_SIZE_MB` | — | `50` | Tamaño máximo por archivo |
| `ALLOWED_TYPES` | — | — | MIME types permitidos, coma-separados (vacío = todos) |
| `AUDIT_LOGGER_ENABLED` | — | `true` | `false` desactiva el audit logger por completo (no-op, sin Kafka) |
| `KAFKA_BROKER` | — | `host.docker.internal:10403` | Broker Kafka |
| `KAFKA_TOPIC` | — | `platform.logs` | Topic de auditoría |

## Cómo ejecutar

### Local sin Docker

```bash
npm install
# Copiar .env.example a .env y completar DB_USER, DB_PASS
npm run start:dev
```

Swagger disponible en `http://localhost:10406/api/docs` (solo fuera de producción).

### Local con Docker

Usa `docker-compose.dev.yml`, que lee el `.env` local. Asegurarse de que el directorio de `MEDIA_HOST_PATH` exista en el host:

```bash
docker compose -f docker-compose.dev.yml build
docker compose -f docker-compose.dev.yml up -d

# O build + up en un solo comando:
docker compose -f docker-compose.dev.yml up -d --build

# Para bajar:
docker compose -f docker-compose.dev.yml down
```

### Producción (con Vault)

El `docker-compose.yml` lee los secretos directamente de Vault al arrancar. **No se necesita `.env`.**
El volumen `/proyectos/NEW_HCE/MEDIA` debe existir en el servidor antes del primer deploy.

**Requisito:** Vault corriendo (ver [HCE-vault-config](../../HCE-vault-config/README.md)).

#### Paso 1 — Obtener el token

El archivo `HCE-vault-config/.env` tiene la línea:
```
TOKEN_MEDIA_SERVICE=hvs.CAESIDsn...
```
Copia ese valor.

#### Paso 2 — Crear `.env.docker` con el token

Este archivo tiene **una sola línea** con el token de bootstrap. No contiene secretos de la app — esos vienen del vault.

**PowerShell (Windows):**
```powershell
"VAULT_TOKEN=hvs.CAESIDsn..." | Out-File -Encoding utf8 .env.docker
```

**Bash / Linux / Mac:**
```bash
echo "VAULT_TOKEN=hvs.CAESIDsn..." > .env.docker
```

> `.env.docker` está en `.gitignore` — nunca se commitea.
> Si el init regenera los tokens, actualizar este archivo con el nuevo valor de `TOKEN_MEDIA_SERVICE`.

#### Paso 3 — Levantar

```bash
docker compose down
docker compose build
docker compose up -d
```

Funciona igual en PowerShell, CMD y bash — sin exportar nada.

Al arrancar, `entrypoint.sh` se conecta al Vault (`hce/nestjs/tch-media`) con ese token, descarga
`DB_PASS`, `MEDIA_PATH`, `MAX_FILE_SIZE_MB` y el resto de los secretos, y los inyecta como variables de
entorno en el contenedor. La aplicación no sabe que existe Vault.

Con GitHub Actions el token se pasa automáticamente desde GitHub Secrets (`VAULT_TOKEN`).

---

## Scripts disponibles

```bash
npm run start:dev   # desarrollo con hot-reload
npm run build       # compilar TypeScript
npm run start:prod  # ejecutar build
```

## Swagger UI

Disponible en: `http://localhost:10406/api/docs`
