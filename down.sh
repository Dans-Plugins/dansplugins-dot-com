#!/bin/bash

# Run docker compose
echo "Stopping container..."
docker compose down --remove-orphans
