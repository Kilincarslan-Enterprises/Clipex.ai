FROM node:20-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files & install
COPY package*.json ./
RUN npm ci --only=production

# Copy source & build
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# Create data directories
RUN mkdir -p data/uploads data/renders

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "dist/index.js"]
