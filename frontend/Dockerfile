# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package.json ./
COPY yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile || yarn install

# Set environment variable for build (MUST be before copying source)
ENV REACT_APP_BACKEND_URL=https://finanzas-app-backend.d2a2d0.easypanel.host

# Copy source code
COPY . .

# Verify environment variable
RUN echo "Building with REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL"

# Build the app
RUN yarn build

# Production stage
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
