# ms-media-media-service

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

## Instalación

```bash
npm install
cp .env.example .env
npm run start:dev
```

## Docker

```bash
docker build -t ms-media-media-service .
docker run -p 3000:3000 --env-file .env -v $(pwd)/uploads:/app/uploads ms-media-media-service
```

## Swagger UI

Disponible en: `http://localhost:3000/api/docs`
