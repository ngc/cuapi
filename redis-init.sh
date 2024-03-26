#!/bin/sh

# Create the users.acl file with the Redis username and password
echo "user $REDIS_USERNAME on +@all ~* >$REDIS_PASSWORD" > /usr/local/bin/users.acl



# Start the Redis server with the requirepass and aclfile options
exec redis-server --requirepass "$REDIS_PASSWORD" --aclfile /usr/local/bin/users.acl
