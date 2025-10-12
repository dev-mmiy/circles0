# Multi-stage build for Next.js optimization
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
# Remove package-lock.json to avoid version conflicts
RUN rm -f package-lock.json
# Install dependencies with legacy peer deps to resolve conflicts
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Development stage
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public directory exists
RUN mkdir -p ./public

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy public directory (create empty if not exists)
RUN mkdir -p ./public
# Copy public directory if it exists, otherwise create empty directory
COPY --from=builder /app/public ./public

USER nextjs

# Expose port (Cloud Run will set PORT environment variable)
EXPOSE 8080

ENV HOSTNAME="0.0.0.0"

# Cloud Run compatible command
# Use environment variable PORT if set, otherwise default to 8080
CMD ["sh", "-c", "PORT=${PORT:-8080} node server.js"]
