#!/bin/bash

# Build script for Render deployment
echo "🚀 Starting SmrutiMap build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the application
echo "🔨 Building application..."
npm run build

echo "✅ Build completed successfully!" 