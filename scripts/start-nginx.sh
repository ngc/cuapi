#!/bin/bash

# Wait for the frontend service to become available
while ! nc -z frontend 3959; do
    sleep 1
done

# Wait for the backend service to become available
while ! nc -z backend 3969; do
    sleep 1
done

# Wait for the redis service to become available
while ! nc -z redis 6379; do
    sleep 1
done

# Replace environment variables in the Nginx configuration
envsubst '$$FRONTEND_URL $$BACKEND_URL $$REDIS_URL' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start Nginx in the background
nginx -g 'daemon off;' &

# if STAGING is set to 1 then print hi else print hello
if [ "$STAGING" = "1" ]; then
    echo "Skipping Certbot staging environment"
else
    certbot --nginx -m $CERTBOT_EMAIL --agree-tos --no-eff-email -d $FRONTEND_URL -d $BACKEND_URL --redirect --keep-until-expiring
fi

# Bring Nginx back to the foreground
wait
