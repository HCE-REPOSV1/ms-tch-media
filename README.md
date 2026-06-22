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

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/files/upload` | Subir archivo (multipart/form-data) |
| `GET` | `/files` | Listar todos los archivos |
| `GET` | `/files/:id` | Obtener metadata de un archivo |
| `GET` | `/files/:id/download` | Descargar archivo |
| `DELETE` | `/files/:id` | Eliminar archivo |

## Kafka — Audit Trail

Cada operación de archivo genera un evento en Kafka:

| Evento | Trigger | Payload |
|--------|---------|---------|
| `FILE_UPLOAD` | POST /files/upload | id, filename, size, mimetype |
| `FILE_DOWNLOAD` | GET /files/:id/download | id, filename, mimetype, size |
| `FILE_DELETE` | DELETE /files/:id | id, filename |

El **AuditInterceptor** registra además cada request HTTP (método, url, status, duración).

## Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servicio | `3000` |
| `UPLOADS_DIR` | Directorio de almacenamiento | `./uploads` |
| `MAX_FILE_SIZE_MB` | Tamaño máximo por archivo | `50` |
| `ALLOWED_TYPES` | MIME types permitidos (vacío=todos) | `` |
| `KAFKA_BROKER` | Broker Kafka | `localhost:9092` |
| `KAFKA_TOPIC` | Topic de auditoría | `platform.logs` |

## Cómo ejecutar

### Local sin Docker

```bash
npm install
# Copiar .env.example a .env y completar los valores
npm run start:dev
```

### Local con Docker

Usa `docker-compose.dev.yml`, que lee el `.env` local. Asegurarse de que el directorio de `FILE_SERVER_LINUX_BASE` exista en el host:

```bash
docker compose -f docker-compose.dev.yml build
docker compose -f docker-compose.dev.yml up -d

# O build + up en un solo comando:
docker compose -f docker-compose.dev.yml up -d --build

# Para bajar:
docker compose -f docker-compose.dev.yml down
```

### Producción

El `docker-compose.yml` lee los secretos desde Vault al arrancar. No se necesita `.env` en el servidor. El volumen `/proyectos/NEW_HCE/MEDIA` debe existir en el servidor antes del primer deploy.

**Requisito:** Vault corriendo en `192.168.42.44:8200` (ver [HCE-vault-config](../HCE-vault-config/README.md)).

```bash
# El token está en HCE-vault-config/.env como TOKEN_MEDIA_SERVICE
export VAULT_TOKEN=hvs.xxxx

docker compose down
docker compose build
docker compose up -d
```

Al arrancar, `entrypoint.sh` obtiene `DB_PASS`, `FILE_SERVER_LINUX_BASE`, `MAX_FILE_SIZE_MB` y el resto de Vault. El app no sabe que existe Vault.

Con GitHub Actions el token se pasa como variable de entorno desde GitHub Secrets (`TOKEN_MEDIA_SERVICE`).

---

## Scripts disponibles

```bash
npm run start:dev   # desarrollo con hot-reload
npm run build       # compilar TypeScript
npm run start:prod  # ejecutar build
npm run test        # tests unitarios
npm run test:cov    # cobertura
```

## Swagger UI

Disponible en: `http://localhost:3000/api/docs`
