# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files & install dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source & build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:20-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files & install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create data directories
RUN mkdir -p data/uploads data/renders

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "dist/index.js"]
