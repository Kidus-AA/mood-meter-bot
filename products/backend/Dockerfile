FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package.json and lockfile
COPY package.json ../package-lock.json* ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Expose backend port
EXPOSE 4000

# Start the server
CMD ["node", "src/server.js"]