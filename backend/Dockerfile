# STAGE 1 - Install dependencies only when needed

FROM node:18-alpine AS deps
# Set the working directory to /app inside the container
WORKDIR /app
# Copy the package.json and package-lock.json to the working directory
COPY package*.json ./
# Install dependencies using npm ci, which is faster and more reliable for production builds and use --legacy-peer-deps to avoid issues with peer dependencies in production
RUN npm ci --legacy-peer-deps

# STAGE 2 - Build the application

FROM node:18-alpine AS builder
# Set the working directory to /app inside the container
WORKDIR /app
# Copy the node_modules from the deps stage to the builder stage
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of the application code to the working directory
COPY . .
# Run the build command to create the production build of the Node.js application
RUN npm run build

# STAGE 3 - Production image, copy all the files and run the application

FROM node:18-alpine AS runner
# Set the working directory to /app inside the container
WORKDIR /app
# Install git since it is needed for runtime to clone repositories and check SHAs
RUN apk add --no-cache git
# Sets the NODE_ENV to production for node to run in production mode
ENV NODE_ENV=production
# Create a non-root user and group to run the application for better security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser
# Only copy the compiled output and prod dependencies
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/package*.json ./
# Install only prod dependencies in the runner stage to keep the image smaller
RUN npm ci --omit=dev --legacy-peer-deps
# Switch to the non-root user to run the application
USER appuser
# Expose port 5000 for the application to listen on, and set environment variables for the port and hostname
EXPOSE 5000
ENV PORT=5000
ENV HOSTNAME="0.0.0.0"

# Start the application using the command defined in the package.json
CMD ["node", "dist/index.js"]