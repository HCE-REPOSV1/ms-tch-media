# Dockerfile — ms-media-media-service
# Multi-stage build generado por Jarvis Platform

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]
EXPOSE 3000
CMD ["sh", "entrypoint.sh"]
