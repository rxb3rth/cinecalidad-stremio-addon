#!/bin/bash

# Script to make the GitHub Container Registry package public
# Usage: ./make-package-public.sh [GITHUB_TOKEN]

PACKAGE_NAME="cinecalidad-stremio-addon"
OWNER="rxb3rth"

# Use provided token or prompt for it
if [ -n "$1" ]; then
    GITHUB_TOKEN="$1"
elif [ -n "$GITHUB_TOKEN" ]; then
    echo "Using GITHUB_TOKEN from environment"
else
    echo "Please provide GitHub token as argument or set GITHUB_TOKEN environment variable"
    echo "Usage: $0 [GITHUB_TOKEN]"
    echo ""
    echo "To create a token:"
    echo "1. Go to https://github.com/settings/tokens"
    echo "2. Create a Personal Access Token with 'packages:write' scope"
    echo "3. Run: $0 your_token_here"
    exit 1
fi

echo "Making package $PACKAGE_NAME public..."

# Make the package public
response=$(curl -s -X PATCH \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/user/packages/container/$PACKAGE_NAME" \
    -d '{"visibility":"public"}')

if echo "$response" | grep -q '"visibility":"public"'; then
    echo "✅ Package successfully made public!"
    echo "Your image is now available at:"
    echo "   docker pull ghcr.io/$OWNER/$PACKAGE_NAME:latest"
    echo ""
    echo "Anyone can now pull and use your Docker image without authentication."
elif echo "$response" | grep -q '"message"'; then
    echo "❌ Error making package public:"
    echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4
    echo ""
    echo "Common issues:"
    echo "- Token needs 'packages:write' scope"
    echo "- Package might not exist yet"
    echo "- You might not have permissions"
else
    echo "❌ Unexpected response:"
    echo "$response"
fi

echo ""
echo "You can also make it public manually:"
echo "1. Go to https://github.com/$OWNER/$PACKAGE_NAME/packages"
echo "2. Click on the package"
echo "3. Go to Package settings"
echo "4. Change visibility to Public"
