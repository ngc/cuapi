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

# Start NGINX
nginx -g 'daemon off;'
