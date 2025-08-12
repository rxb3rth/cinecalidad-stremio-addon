# Cinecalidad Stremio Addon

A Stremio addon for streaming movies from Cinecalidad.

[![CI/CD Pipeline](https://github.com/rxb3rth/cinecalidad-stremio-addon/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/rxb3rth/cinecalidad-stremio-addon/actions/workflows/ci-cd.yml)
[![Release and Deploy](https://github.com/rxb3rth/cinecalidad-stremio-addon/actions/workflows/release-deploy.yml/badge.svg)](https://github.com/rxb3rth/cinecalidad-stremio-addon/actions/workflows/release-deploy.yml)

## 🏗️ Architecture

This addon follows enterprise-grade patterns with proper separation of concerns:

```
src/
├── addon.js              # Main addon factory and DI container
├── handlers/             # Request handlers
│   ├── CatalogHandler.js # Movie catalog management
│   ├── MetaHandler.js    # Movie metadata handling
│   └── StreamHandler.js  # Stream processing
├── services/            # Business logic services
│   ├── CacheService.js  # Caching abstraction
│   ├── MetadataBuilder.js # Metadata transformation
│   └── TorrentInfoService.js # Torrent processing
└── lib/                # Utilities and errors
    ├── errors.js       # Centralized error handling
    └── validators.js   # Input validation
```

## ✨ Key Improvements

### 🔧 **Dependency Injection**

- DI container managing all services
- Proper lifecycle management
- Easy testing and mocking

### 🛡️ **Error Handling**

- Centralized error handling with proper error codes
- Structured logging with context
- Graceful degradation

### ⚡ **Performance**

- High-resolution timing for performance monitoring
- Efficient caching with TTL
- Async/await patterns throughout
- Connection pooling and cleanup

### 🧪 **Testability**

- Modular design with clear interfaces
- Dependency injection for easy mocking
- Separation of concerns
- Class structure

### 📚 **Documentation**

- Comprehensive JSDoc throughout
- Type annotations where applicable
- Clear API documentation
- README

### 🔒 **Security**

- Input validation and sanitization
- URL validation for safety
- Proper error message sanitization
- No sensitive data exposure

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/cinecalidad-stremio-addon.git
cd cinecalidad-stremio-addon

# Install dependencies
npm install

# Start the addon
npm start
```

### Configuration

The addon uses environment variables and config files:

```javascript
// config/settings.js
const config = {
  server: {
    port: Number(process.env.PORT) || 7000,
    host: "127.0.0.1",
  },
  cinecalidad: {
    siteLink: "https://www.cinecalidad.rs",
    maxLatestPageLimit: 3,
    maxSearchPageLimit: 6,
    requestDelay: 1000,
    detailsDelay: 1500,
    cacheTimeout: 30 * 60 * 1000,
  },
};
```

## 📖 API Documentation

### Endpoints

- `GET /manifest.json` - Addon manifest
- `GET /catalog/movie/{catalogId}.json` - Movie catalogs
- `GET /meta/movie/{movieId}.json` - Movie metadata
- `GET /stream/movie/{movieId}.json` - Movie streams
- `GET /health` - Health check

### Movie ID Formats

- **Cinecalidad Movies**: `cc_{movieId}`
- **IMDB Movies**: `tt{imdbId}`

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run specific handler test
npm run test:meta
```

## 📊 Monitoring

The addon includes comprehensive logging and monitoring:

```javascript
// Structured logging with context
logger.info("Request processed", {
  requestId: "req_123",
  duration: 145,
  success: true,
});

// Performance monitoring
const startTime = process.hrtime.bigint();
// ... process request ...
const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
```

## 🔧 Development

### Code Style

- Use ESLint for code consistency
- Use JSDoc for documentation
- Implement proper error handling
- Write comprehensive tests

### Architecture Principles

1. **Single Responsibility**: Each class has one clear purpose
2. **Dependency Injection**: All dependencies injected, no hard coupling
3. **Error Handling**: Centralized, structured error management
4. **Logging**: Structured logging with proper context
5. **Performance**: High-resolution timing and monitoring

### Adding New Features

1. Create handler in `src/handlers/`
2. Add business logic in `src/services/`
3. Update dependency container
4. Add comprehensive tests
5. Update documentation

## 🚀 Production Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 7000
CMD ["npm", "start"]
```

### Environment Variables

```bash
NODE_ENV=production
PORT=7000
LOG_LEVEL=info
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Follow code standards and add tests
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Stremio team for the excellent addon SDK
- Cinecalidad for the movie content
- Contributors and testers

---

**Built with ❤️**
