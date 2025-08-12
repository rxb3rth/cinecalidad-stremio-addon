const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const logger = require("./logger");

class DatabaseService {
  constructor() {
    this.dbPath = path.join(__dirname, "..", "data");
    this.dbFile = path.join(this.dbPath, "cinecalidad.db");

    this.initDatabase();
  }

  initDatabase() {
    try {
      // Crear directorio de datos si no existe
      if (!fs.existsSync(this.dbPath)) {
        fs.mkdirSync(this.dbPath, { recursive: true });
        logger.info("[Database] Created data directory");
      }

      // Inicializar base de datos SQLite
      this.db = new Database(this.dbFile);
      this.db.pragma("journal_mode = WAL");

      this.createTables();

      logger.info("[Database] SQLite database initialized successfully");
    } catch (error) {
      logger.error("[Database] Failed to initialize database:", error);
      throw error;
    }
  }

  createTables() {
    // Tabla para películas
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS movies (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Tabla para caché
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS cache (
                key TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Tabla para torrents
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS torrents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                info_hash TEXT UNIQUE NOT NULL,
                data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Índices para mejorar rendimiento
    this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at)",
    );
    this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_movies_updated ON movies(updated_at)",
    );
    this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_torrents_updated ON torrents(updated_at)",
    );
  }

  // Métodos para películas
  saveMovie(movieId, movieData) {
    try {
      const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO movies (id, data, updated_at) 
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `);

      const dataStr = JSON.stringify(movieData);
      stmt.run(movieId, dataStr);

      logger.debug(`[Database] Saved movie data for ID: ${movieId}`);
    } catch (error) {
      logger.error(`[Database] Error saving movie ${movieId}:`, error);
    }
  }

  getMovie(movieId) {
    try {
      const stmt = this.db.prepare("SELECT data FROM movies WHERE id = ?");
      const result = stmt.get(movieId);

      if (result) {
        return JSON.parse(result.data);
      }
      return null;
    } catch (error) {
      logger.error(`[Database] Error getting movie ${movieId}:`, error);
      return null;
    }
  }

  getAllMovies() {
    try {
      const stmt = this.db.prepare(
        "SELECT id, data FROM movies ORDER BY updated_at DESC",
      );
      const results = stmt.all();

      const movies = {};
      results.forEach((row) => {
        movies[row.id] = JSON.parse(row.data);
      });

      return movies;
    } catch (error) {
      logger.error("[Database] Error getting all movies:", error);
      return {};
    }
  }

  // Buscar película por ID de Cinecalidad en el catálogo guardado
  findMovieByOriginalId(originalId) {
    try {
      const stmt = this.db.prepare("SELECT id, data FROM movies");
      const results = stmt.all();

      for (const row of results) {
        try {
          const movieData = JSON.parse(row.data);
          // Buscar en release.id o movieDetails.id
          if (movieData.release && movieData.release.id === originalId) {
            return {
              stremioId: row.id,
              data: movieData,
            };
          }
          if (
            movieData.movieDetails &&
            movieData.movieDetails.id === originalId
          ) {
            return {
              stremioId: row.id,
              data: movieData,
            };
          }
        } catch (parseError) {
          logger.warn(
            `[Database] Error parsing movie data for ${row.id}:`,
            parseError,
          );
          continue;
        }
      }

      return null;
    } catch (error) {
      logger.error(
        `[Database] Error finding movie by original ID ${originalId}:`,
        error,
      );
      return null;
    }
  }

  // Métodos para caché
  setCache(key, data, ttlMinutes = 60) {
    try {
      const expiresAt = new Date(
        Date.now() + ttlMinutes * 60 * 1000,
      ).toISOString();
      const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO cache (key, data, expires_at) 
                VALUES (?, ?, ?)
            `);

      const dataStr = JSON.stringify(data);
      stmt.run(key, dataStr, expiresAt);

      logger.debug(
        `[Database] Cached data for key: ${key} (expires: ${expiresAt})`,
      );
    } catch (error) {
      logger.error(`[Database] Error setting cache ${key}:`, error);
    }
  }

  getCache(key) {
    try {
      const stmt = this.db.prepare(`
                SELECT data FROM cache 
                WHERE key = ? AND expires_at > CURRENT_TIMESTAMP
            `);
      const result = stmt.get(key);

      if (result) {
        logger.debug(`[Database] Cache hit for key: ${key}`);
        return JSON.parse(result.data);
      }

      logger.debug(`[Database] Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      logger.error(`[Database] Error getting cache ${key}:`, error);
      return null;
    }
  }

  deleteCache(key) {
    try {
      const stmt = this.db.prepare("DELETE FROM cache WHERE key = ?");
      const result = stmt.run(key);

      if (result.changes > 0) {
        logger.debug(`[Database] Deleted cache for key: ${key}`);
      }
    } catch (error) {
      logger.error(`[Database] Error deleting cache ${key}:`, error);
    }
  }

  clearExpiredCache() {
    try {
      const stmt = this.db.prepare(
        "DELETE FROM cache WHERE expires_at <= CURRENT_TIMESTAMP",
      );
      const result = stmt.run();

      if (result.changes > 0) {
        logger.info(
          `[Database] Cleared ${result.changes} expired cache entries`,
        );
      }
    } catch (error) {
      logger.error("[Database] Error clearing expired cache:", error);
    }
  }

  // Métodos para torrents
  saveTorrent(infoHash, torrentData) {
    try {
      const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO torrents (info_hash, data, updated_at) 
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `);

      const dataStr = JSON.stringify(torrentData);
      stmt.run(infoHash, dataStr);

      // Get the ID of the inserted/updated record
      const getIdStmt = this.db.prepare(
        "SELECT id FROM torrents WHERE info_hash = ?",
      );
      const idResult = getIdStmt.get(infoHash);

      logger.debug(
        `[Database] Saved torrent data for hash: ${infoHash}, ID: ${idResult?.id}`,
      );
      return idResult?.id;
    } catch (error) {
      logger.error(`[Database] Error saving torrent ${infoHash}:`, error);
      return null;
    }
  }

  getTorrent(infoHash) {
    try {
      const stmt = this.db.prepare(
        "SELECT data FROM torrents WHERE info_hash = ?",
      );
      const result = stmt.get(infoHash);

      if (result) {
        return JSON.parse(result.data);
      }
      return null;
    } catch (error) {
      logger.error(`[Database] Error getting torrent ${infoHash}:`, error);
      return null;
    }
  }

  getTorrentById(id) {
    try {
      const stmt = this.db.prepare(
        "SELECT info_hash, data FROM torrents WHERE id = ?",
      );
      const result = stmt.get(id);

      if (result) {
        const torrentData = JSON.parse(result.data);
        return {
          infoHash: result.info_hash,
          ...torrentData,
        };
      }
      return null;
    } catch (error) {
      logger.error(`[Database] Error getting torrent by ID ${id}:`, error);
      return null;
    }
  }

  // Métodos de mantenimiento
  cleanup() {
    try {
      this.clearExpiredCache();

      // Limpiar películas muy antiguas (más de 7 días)
      const stmt = this.db.prepare(`
                DELETE FROM movies 
                WHERE updated_at < datetime('now', '-7 days')
            `);
      const result = stmt.run();

      if (result.changes > 0) {
        logger.info(
          `[Database] Cleaned up ${result.changes} old movie entries`,
        );
      }
    } catch (error) {
      logger.error("[Database] Error during cleanup:", error);
    }
  }

  getStats() {
    try {
      const movieCount = this.db
        .prepare("SELECT COUNT(*) as count FROM movies")
        .get().count;
      const cacheCountStmt = this.db.prepare(
        "SELECT COUNT(*) as count FROM cache WHERE expires_at > CURRENT_TIMESTAMP",
      );
      const cacheCount = cacheCountStmt.get().count;
      const torrentCount = this.db
        .prepare("SELECT COUNT(*) as count FROM torrents")
        .get().count;

      return {
        movies: movieCount,
        cache: cacheCount,
        torrents: torrentCount,
        dbSize: this.getDbSize(),
      };
    } catch (error) {
      logger.error("[Database] Error getting stats:", error);
      return { movies: 0, cache: 0, torrents: 0, dbSize: 0 };
    }
  }

  getDbSize() {
    try {
      const stats = fs.statSync(this.dbFile);
      return Math.round(stats.size / 1024); // KB
    } catch (error) {
      return 0;
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      logger.info("[Database] Database connection closed");
    }
  }
}

// Singleton pattern
let instance = null;

module.exports = {
  getInstance() {
    if (!instance) {
      instance = new DatabaseService();
    }
    return instance;
  },
};
