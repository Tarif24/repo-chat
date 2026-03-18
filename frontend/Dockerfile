# Install dependencies and build
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your app
COPY . .

# Build the app
RUN npm run build

# Production image
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files and install only production dependencies
COPY --from=builder /app ./

EXPOSE 3000
CMD ["npm", "run", "start"]