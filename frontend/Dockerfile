# STAGE 1 - Install dependencies only when needed

FROM node:20-alpine AS deps
# Set the working directory to /app inside the container
WORKDIR /app
# Copy the package.json and package-lock.json to the working directory
COPY package*.json ./
# Install dependencies using npm ci, which is faster and more reliable for production builds
RUN npm ci

# STAGE 2 - Build the application

FROM node:20-alpine AS builder
# Set the working directory to /app inside the container
WORKDIR /app
# Copy the node_modules from the deps stage to the builder stage
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of the application code to the working directory
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
# Run the build command to create the production build of the Next.js application (should be a standalone build since it was configured in next.config.ts)
RUN npm run build

# STAGE 3 - Production image, copy all the files and run next

FROM node:20-alpine AS runner
# Set the working directory to /app inside the container
WORKDIR /app
# Sets the NODE_ENV to production for node and next to run in production mode
ENV NODE_ENV=production
# Disable Next.js telemetry during runtime
ENV NEXT_TELEMETRY_DISABLED=1
# Create a non-root user and group to run the application for better security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
# Copy the necessary files from the builder stage to the runner stage, setting the ownership to the non-root user created above
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Switch to the non-root user to run the application
USER nextjs
# Expose port 3000 for the application to listen on, and set environment variables for the port and hostname
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# Start the application using the command defined in the package.json, which should be "node server.js" for a standalone Next.js build
CMD ["node", "server.js"]