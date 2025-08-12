/**
 * Enterprise-grade input validation system
 * Provides comprehensive validation for all user inputs
 */

const { ValidationError } = require("./errors");

/**
 * Validate movie ID format and structure
 * @param {string} id - Movie ID to validate
 * @returns {boolean} True if valid
 */
function validateMovieId(id) {
  if (!id || typeof id !== "string") {
    return false;
  }

  // IMDB ID format: tt followed by 7+ digits
  if (id.startsWith("tt")) {
    return /^tt\d{7,}$/.test(id);
  }

  // Cinecalidad ID format: cc_ followed by movie slug
  if (id.startsWith("cc_")) {
    const movieId = id.substring(3);
    return /^[a-z0-9-]+$/.test(movieId) && movieId.length > 0;
  }

  return false;
}

/**
 * Sanitize ID by removing potentially dangerous characters
 * @param {string} id - ID to sanitize
 * @returns {string} Sanitized ID
 */
function sanitizeId(id) {
  if (!id || typeof id !== "string") {
    throw new ValidationError("ID must be a non-empty string");
  }

  // Remove any characters that could be used for injection
  const sanitized = id
    .trim()
    .replace(/[<>'"&]/g, "") // Remove HTML/XML dangerous chars
    .replace(/[^\x20-\x7E]/g, "") // Keep only printable ASCII characters
    .substring(0, 100); // Limit length

  if (!sanitized) {
    throw new ValidationError("ID becomes empty after sanitization");
  }

  return sanitized;
}

/**
 * Validate search query parameters
 * @param {object} query - Query object to validate
 * @returns {object} Validated and sanitized query
 */
function validateSearchQuery(query) {
  const validated = {};

  if (query.search !== undefined) {
    if (typeof query.search !== "string") {
      throw new ValidationError("Search term must be a string");
    }

    const sanitizedSearch = query.search
      .trim()
      .replace(/[<>'"&]/g, "")
      .substring(0, 200);

    if (sanitizedSearch.length < 2) {
      throw new ValidationError(
        "Search term must be at least 2 characters long",
      );
    }

    validated.search = sanitizedSearch;
  }

  if (query.skip !== undefined) {
    const skip = parseInt(query.skip, 10);
    if (isNaN(skip) || skip < 0 || skip > 10000) {
      throw new ValidationError("Skip must be a number between 0 and 10000");
    }
    validated.skip = skip;
  } else {
    validated.skip = 0;
  }

  if (query.limit !== undefined) {
    const limit = parseInt(query.limit, 10);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new ValidationError("Limit must be a number between 1 and 100");
    }
    validated.limit = limit;
  } else {
    validated.limit = 20;
  }

  return validated;
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function validateUrl(url) {
  if (!url || typeof url !== "string") {
    return false;
  }

  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate magnet URI format
 * @param {string} magnetUri - Magnet URI to validate
 * @returns {boolean} True if valid
 */
function validateMagnetUri(magnetUri) {
  if (!magnetUri || typeof magnetUri !== "string") {
    return false;
  }

  // Must start with magnet: and contain btih hash
  return (
    magnetUri.startsWith("magnet:") &&
    /xt=urn:btih:[a-fA-F0-9]{32,40}/.test(magnetUri)
  );
}

/**
 * Validate request arguments for handlers
 * @param {object} args - Request arguments
 * @param {Array} requiredFields - Required field names
 * @returns {object} Validated arguments
 */
function validateRequestArgs(args, requiredFields = []) {
  if (!args || typeof args !== "object") {
    throw new ValidationError("Request arguments must be an object");
  }

  const validated = {};

  // Check required fields
  for (const field of requiredFields) {
    if (args[field] === undefined || args[field] === null) {
      throw new ValidationError(`Required field '${field}' is missing`, field);
    }
    validated[field] = args[field];
  }

  // Validate common fields
  if (args.type !== undefined) {
    if (
      typeof args.type !== "string" ||
      !["movie", "series"].includes(args.type)
    ) {
      throw new ValidationError('Type must be either "movie" or "series"');
    }
    validated.type = args.type;
  }

  if (args.id !== undefined) {
    validated.id = sanitizeId(args.id);
    if (!validateMovieId(validated.id)) {
      throw new ValidationError("Invalid ID format");
    }
  }

  if (args.extra !== undefined && typeof args.extra === "object") {
    validated.extra = validateSearchQuery(args.extra);
  }

  return validated;
}

/**
 * Validate configuration object
 * @param {object} config - Configuration to validate
 * @returns {object} Validated configuration
 */
function validateConfig(config) {
  if (!config || typeof config !== "object") {
    throw new ValidationError("Configuration must be an object");
  }

  const validated = {};

  // Validate server config
  if (config.server) {
    if (
      !config.server.port ||
      !Number.isInteger(config.server.port) ||
      config.server.port < 1 ||
      config.server.port > 65535
    ) {
      throw new ValidationError(
        "Server port must be a number between 1 and 65535",
      );
    }

    if (!config.server.host || typeof config.server.host !== "string") {
      throw new ValidationError("Server host must be a non-empty string");
    }

    validated.server = {
      port: config.server.port,
      host: config.server.host,
    };
  }

  // Validate Cinecalidad config
  if (config.cinecalidad) {
    const cc = config.cinecalidad;

    if (!validateUrl(cc.siteLink)) {
      throw new ValidationError("Cinecalidad siteLink must be a valid URL");
    }

    validated.cinecalidad = {
      siteLink: cc.siteLink,
      maxLatestPageLimit: Math.max(1, Math.min(10, cc.maxLatestPageLimit || 3)),
      maxSearchPageLimit: Math.max(1, Math.min(20, cc.maxSearchPageLimit || 6)),
      requestDelay: Math.max(100, Math.min(5000, cc.requestDelay || 1000)),
      detailsDelay: Math.max(100, Math.min(5000, cc.detailsDelay || 1500)),
      cacheTimeout: Math.max(
        60000,
        Math.min(86400000, cc.cacheTimeout || 1800000),
      ),
    };
  }

  return validated;
}

/**
 * Validate file path for security
 * @param {string} filePath - File path to validate
 * @returns {boolean} True if safe
 */
function validateFilePath(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return false;
  }

  // Prevent path traversal attacks
  if (
    filePath.includes("..") ||
    filePath.includes("~") ||
    filePath.startsWith("/etc") ||
    filePath.startsWith("/proc")
  ) {
    return false;
  }

  // Must be absolute path on Windows or Unix
  return /^[a-zA-Z]:\\/.test(filePath) || filePath.startsWith("/");
}

/**
 * Create validation middleware for Express-like frameworks
 * @param {Function} validator - Validation function
 * @returns {Function} Middleware function
 */
function createValidationMiddleware(validator) {
  return (req, res, next) => {
    try {
      req.validated = validator(req.body || req.query || req.params);
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.message,
          field: error.field,
        });
      }
      next(error);
    }
    return undefined;
  };
}

module.exports = {
  validateMovieId,
  sanitizeId,
  validateSearchQuery,
  validateUrl,
  validateMagnetUri,
  validateRequestArgs,
  validateConfig,
  validateFilePath,
  createValidationMiddleware,
  ValidationError,
};
