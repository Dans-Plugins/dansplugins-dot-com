#!/bin/bash

# Run docker compose
echo "Starting container..."
docker compose up --remove-orphans --build -d
