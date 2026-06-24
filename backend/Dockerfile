# Use the official lightweight Node.js image.
FROM node:20-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Install production dependencies.
RUN npm install --only=production

# Copy local code to the container image.
COPY . .

# Set the PORT environment variable to 8080.
# Cloud Run expects the container to listen on the port defined by this variable.
ENV PORT 8080

# Expose port 8080.
EXPOSE 8080

# Run the web service on container startup.
CMD [ "node", "index.js" ]