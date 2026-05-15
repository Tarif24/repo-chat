# Pull the Lambda Web Adapter binary from AWS's public registry to use in the runner stage
FROM public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 AS lambda-adapter

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
# Copy the Lambda Web Adapter binary into the extensions directory so Lambda discovers and runs it as an extension on startup
COPY --from=lambda-adapter /lambda-adapter /opt/extensions/lambda-adapter
# Only copy the compiled output and prod dependencies
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/package*.json ./
# Install only prod dependencies in the runner stage to keep the image smaller
RUN npm ci --omit=dev --legacy-peer-deps
# Switch to the non-root user to run the application
USER appuser
# Expose port 8080 which Lambda Web Adapter expects the server to listen on
EXPOSE 8080
# Set the port to 8080 so Express binds to the same port Lambda Web Adapter forwards requests to
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
# Tell Lambda Web Adapter which port to forward incoming Lambda events to
ENV AWS_LWA_PORT=8080
# Tell Lambda Web Adapter which route to poll until it gets a 200 before accepting traffic
ENV AWS_LWA_READINESS_CHECK_PATH=/api/health/check
# Start the application using the command defined in the package.json
CMD ["node", "dist/index.js"]