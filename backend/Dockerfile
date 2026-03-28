# Use a slim Node.js base image
FROM node:18-slim

# Install git (required for simple-git)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of your app
COPY . .

RUN npm run build

# Optional:
EXPOSE 5000

# Start the app
CMD ["node", "dist/index.js"]