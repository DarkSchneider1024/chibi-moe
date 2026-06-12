FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose WebSocket port
EXPOSE 3001

# Run the server using ts-node
CMD ["npx", "ts-node", "index.ts"]
