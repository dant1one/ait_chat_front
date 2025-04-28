# Use the official Nginx image from Docker Hub
FROM nginx:stable-alpine

# Remove the default Nginx welcome page.
RUN rm -rf /usr/share/nginx/html/*

# Copy your static website files to the Nginx web root directory
# The '.' refers to the build context (your ait_chat_front directory)
COPY . /usr/share/nginx/html

# Optional: Copy a custom Nginx configuration file if needed
# If you create nginx.conf (see step 2), uncomment the next line
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (Nginx default)
# Cloud Run will map its external port to this port ($PORT env variable is not strictly needed by Nginx itself here,
# but Cloud Run manages the external routing to this container's port 80)
EXPOSE 80

# Nginx will automatically start when the container launches
# The base image already has the correct CMD configured
