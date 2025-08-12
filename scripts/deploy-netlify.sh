#!/bin/bash

# Deploy script for Netlify
# This script prepares the application for Netlify deployment

set -e

echo "🚀 Starting Netlify deployment preparation..."

# Create deployment directory
mkdir -p netlify-deploy
cd netlify-deploy

# Copy necessary files
echo "📁 Copying application files..."
cp -r ../lib .
cp -r ../src .
cp -r ../config .
cp -r ../services .
cp -r ../data .
cp ../index.js .
cp ../package*.json .
cp ../netlify.toml .

# Install only production dependencies
echo "📦 Installing production dependencies..."
if command -v pnpm >/dev/null 2>&1; then
    pnpm install --prod --silent
else
    npm ci --production --silent
fi

# Create a simple health check endpoint
echo "🔍 Creating health check..."
cat > health.js << 'EOF'
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

app.get('/', (req, res) => {
    res.redirect('/health');
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Health check server running on port ${port}`);
});
EOF

# Create a start script for Netlify
echo "⚙️ Creating start script..."
cat > start.sh << 'EOF'
#!/bin/bash
# Start the addon
node index.js &
# Start health check
node health.js
EOF

chmod +x start.sh

# Create package.json with Netlify-specific scripts
echo "📝 Updating package.json for Netlify..."
cat > package.json << EOF
{
  "name": "cinecalidad-stremio-addon",
  "version": "1.0.0",
  "description": "Local file streaming add-on for Stremio",
  "main": "index.js",
  "scripts": {
    "start": "./start.sh",
    "health": "node health.js",
    "addon": "node index.js"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
EOF

# Copy dependencies from original package.json
echo "🔧 Merging dependencies..."
node -e "
const originalPkg = require('../package.json');
const deployPkg = require('./package.json');
deployPkg.dependencies = originalPkg.dependencies;
deployPkg.author = originalPkg.author;
deployPkg.license = originalPkg.license;
deployPkg.keywords = originalPkg.keywords;
require('fs').writeFileSync('./package.json', JSON.stringify(deployPkg, null, 2));
"

echo "✅ Netlify deployment preparation complete!"
echo "📂 Deployment files ready in: netlify-deploy/"

cd ..
echo "🎯 Ready for deployment to Netlify!"
