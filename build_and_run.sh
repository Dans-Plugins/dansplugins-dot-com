#!/bin/bash

# clear old nextjs build
echo "Clearing old build..."
rm -rf .next

# build
echo "Building..."
npm run build

# run
echo "Starting..."
npm run start
