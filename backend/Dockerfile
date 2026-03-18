# Use a slim Node.js base image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy and apply patches
#COPY patches/ ./patches/
#RUN npx patch-package

# Copy the rest of your app
COPY . .

RUN npm run build

# Optional:
EXPOSE 5000

# Start the app
CMD ["node", "dist/index.js"]