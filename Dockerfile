# ==========================================
# Multi-Stage Dockerfile for SmartFace App
# ==========================================

# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Server & Production Runner
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install Server Dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy Server Source Code
COPY server/ ./server/

# Copy Frontend Build Output to Client Dist directory
COPY --from=frontend-builder /app/client/dist ./client/dist

EXPOSE 5000

CMD ["node", "server/src/server.js"]
