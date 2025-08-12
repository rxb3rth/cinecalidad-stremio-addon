// lib/logger.js

/**
 * Simple logging utility with configurable levels
 */
class Logger {
  constructor() {
    // Log levels: 0=silent, 1=error, 2=warn, 3=info, 4=debug
    this.level = this.getLogLevel();
    this.levels = {
      ERROR: 1,
      WARN: 2,
      INFO: 3,
      DEBUG: 4,
    };
  }

  getLogLevel() {
    const envLevel = process.env.LOG_LEVEL || process.env.NODE_ENV;

    switch (envLevel) {
      case "silent":
        return 0;
      case "error":
        return 1;
      case "warn":
        return 2;
      case "production":
        return 2; // Only errors and warnings in production
      case "info":
        return 3;
      case "debug":
      case "development":
        return 4;
      default:
        return 3; // Default to info level
    }
  }

  error(...args) {
    if (this.level >= this.levels.ERROR) {
      console.error("[ERROR]", ...args);
    }
  }

  warn(...args) {
    if (this.level >= this.levels.WARN) {
      console.warn("[WARN]", ...args);
    }
  }

  info(...args) {
    if (this.level >= this.levels.INFO) {
      console.log("[INFO]", ...args);
    }
  }

  debug(...args) {
    if (this.level >= this.levels.DEBUG) {
      console.log("[DEBUG]", ...args);
    }
  }

  // Convenience method for startup/important messages
  startup(...args) {
    console.log("🎬", ...args);
  }
}

// Export singleton instance
module.exports = new Logger();
