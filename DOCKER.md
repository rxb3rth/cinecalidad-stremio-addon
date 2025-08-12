# Docker Usage

This document explains how to build, run, and deploy the CineCalidad Stremio Addon using Docker.

## Quick Start

### Using Docker Hub/GitHub Container Registry

```bash
# Pull and run the latest image
docker run -p 7000:7000 ghcr.io/rxb3rth/cinecalidad-stremio-addon:latest
```

### Using Docker Compose

```bash
# Start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

## Building Locally

### Build the Docker image

```bash
# Build the image
docker build -t cinecalidad-addon .

# Run the container
docker run -p 7000:7000 cinecalidad-addon
```

### Using package.json scripts

```bash
# Build Docker image
pnpm run docker:build

# Run Docker container
pnpm run docker:run
```

## Environment Variables

The following environment variables can be configured:

- `PORT` - Server port (default: 7000)
- `NODE_ENV` - Node environment (default: production)

## GitHub Container Registry

The Docker image is automatically built and pushed to GitHub Container Registry using GitHub Actions.

### Making the Image Public

By default, GitHub Container Registry images are **private**. To make your image public so anyone can pull it without authentication:

#### Option 1: Automatic (Recommended)
The GitHub Actions workflows are configured to automatically make the package public after each build.

#### Option 2: Manual via GitHub Web Interface
1. Go to your repository on GitHub
2. Click the "Packages" tab
3. Click on your package
4. Go to "Package settings" 
5. In "Danger Zone" → "Change package visibility" → Select "Public"

#### Option 3: Using Scripts
```bash
# Using bash script
./scripts/make-package-public.sh [YOUR_GITHUB_TOKEN]

# Using PowerShell (Windows)
.\scripts\make-package-public.ps1 [YOUR_GITHUB_TOKEN]
```

### GitHub Actions Workflows

Two workflows are available:

1. **`docker.yml`** - Full workflow with build attestations and security features
2. **`docker-simple.yml`** - Simplified workflow without attestations (backup option)

Both workflows now automatically set the package visibility to public after successful builds.

### Available Tags

- `latest` - Latest stable release from main branch
- `v1.0.0` - Specific version tags
- `main` - Latest commit from main branch

### Using the Published Image

```bash
# Pull the latest image
docker pull ghcr.io/rxb3rth/cinecalidad-stremio-addon:latest

# Run with custom port
docker run -p 8080:7000 -e PORT=7000 ghcr.io/rxb3rth/cinecalidad-stremio-addon:latest
```

## Volumes and Data Persistence

To persist data between container restarts:

```bash
docker run -p 7000:7000 -v ./data:/app/data ghcr.io/rxb3rth/cinecalidad-stremio-addon:latest
```

## Health Checks

The Docker image includes a health check that verifies the application is responding correctly:

```bash
# Check container health
docker ps

# View health check logs
docker inspect --format='{{json .State.Health}}' <container-id>
```

## Production Deployment

### Docker Compose (Recommended)

1. Copy `docker-compose.yml` to your server
2. Customize environment variables as needed
3. Run `docker-compose up -d`

### Docker Swarm

```yaml
version: '3.8'
services:
  cinecalidad-addon:
    image: ghcr.io/rxb3rth/cinecalidad-stremio-addon:latest
    ports:
      - "7000:7000"
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cinecalidad-addon
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cinecalidad-addon
  template:
    metadata:
      labels:
        app: cinecalidad-addon
    spec:
      containers:
      - name: cinecalidad-addon
        image: ghcr.io/rxb3rth/cinecalidad-stremio-addon:latest
        ports:
        - containerPort: 7000
        env:
        - name: PORT
          value: "7000"
---
apiVersion: v1
kind: Service
metadata:
  name: cinecalidad-addon-service
spec:
  selector:
    app: cinecalidad-addon
  ports:
  - port: 80
    targetPort: 7000
  type: LoadBalancer
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Use a different port
   docker run -p 8080:7000 cinecalidad-addon
   ```

2. **Permission issues**
   ```bash
   # The container runs as non-root user by default
   # If you need to mount volumes, ensure proper permissions
   chown -R 1000:1000 ./data
   ```

3. **Build issues**
   ```bash
   # Clean build without cache
   docker build --no-cache -t cinecalidad-addon .
   ```

4. **pnpm lockfile compatibility issues**
   ```bash
   # If you encounter pnpm lockfile version mismatches, use the npm Dockerfile instead
   docker build -f Dockerfile.npm -t cinecalidad-addon .
   
   # Or regenerate the lockfile locally
   rm pnpm-lock.yaml
   pnpm install
   git add pnpm-lock.yaml
   git commit -m "update lockfile"
   ```

5. **GitHub Actions ID token issues**
   ```bash
   # If the main workflow fails with ID token errors, the repository may need:
   # - Actions permissions to be enabled in repository settings
   # - Attestations to be enabled in repository security settings
   # - Or use the simplified workflow without attestations
   ```

6. **Repository permissions for attestations**
   ```bash
   # To enable attestations, ensure your repository has:
   # - Settings > Actions > General > Workflow permissions set to "Read and write"
   # - Settings > Code security and analysis > Attestations enabled
   ```

### Logs

```bash
# View container logs
docker logs <container-id>

# Follow logs in real-time
docker logs -f <container-id>

# Docker Compose logs
docker-compose logs -f
```
