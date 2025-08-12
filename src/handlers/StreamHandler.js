/**
 * @file Stream Handler for Cinecalidad Stremio addon
 * @author Cinecalidad Team
 * @version 1.0.0
 */

"use strict";

const logger = require("../../lib/logger");
const { createError, ErrorCodes } = require("../lib/errors");
const { CacheService } = require("../services/CacheService");
const { TorrentInfoService } = require("../services/TorrentInfoService");

/**
 * Stream Handler
 * Manages stream requests with proper torrent parsing and caching
 * @class
 */
class StreamHandler {
  /**
   * @param {object} dependencies - Injected dependencies
   */
  constructor(dependencies) {
    this.database = dependencies.database;
    this.cineCalidadService = dependencies.cineCalidadService;
    this.torrentParserService = dependencies.torrentParserService;
    this.metadataService = dependencies.metadataService;
    this.cacheService = new CacheService(dependencies.database);
    this.torrentInfoService = new TorrentInfoService(dependencies);

    // Constants
    this.SUPPORTED_VIDEO_EXTENSIONS = new Set([
      "mp4",
      "mkv",
      "avi",
      "mov",
      "wmv",
      "flv",
      "m4v",
      "webm",
    ]);
    this.COUNTRY_WHITELIST = [
      "MX",
      "ES",
      "AR",
      "CO",
      "PE",
      "CL",
      "VE",
      "EC",
      "BO",
      "PY",
      "UY",
    ];
    this.BINGE_GROUP_PREFIX = "cinecalidad-";

    // Bind methods
    this.handle = this.handle.bind(this);
  }

  /**
   * Handle stream request
   * @param {object} args - Request arguments
   * @returns {Promise<object>} Stream response
   */
  async handle(args) {
    try {
      this._validateRequest(args);

      if (args.type !== "movie") {
        return { streams: [] };
      }

      // Check cache first
      const cacheKey = this._generateCacheKey(args.id);
      const cachedData = await this.cacheService.get(cacheKey);

      if (cachedData) {
        logger.debug("Returning cached stream data", { id: args.id });
        return cachedData;
      }

      // Get or fetch movie data
      const movieData = await this._getMovieData(args.id);
      if (!movieData) {
        return { streams: [] };
      }

      // Process streams
      const streams = await this._processStreams(movieData, args.id);

      const result = { streams };

      // Cache the result
      await this.cacheService.set(cacheKey, result);

      logger.info("Stream request processed successfully", {
        id: args.id,
        streamCount: streams.length,
      });

      return result;
    } catch (error) {
      logger.error("Stream handler error", {
        error: error.message,
        id: args.id,
      });
      throw error;
    }
  }

  /**
   * Validate stream request
   * @private
   * @param {object} args - Request arguments
   */
  _validateRequest(args) {
    if (!args || !args.id || !args.type) {
      throw createError(
        ErrorCodes.INVALID_INPUT,
        "Invalid stream request arguments",
      );
    }
  }

  /**
   * Generate cache key
   * @private
   * @param {string} id - Movie ID
   * @returns {string} Cache key
   */
  _generateCacheKey(id) {
    return `stream_${id}`;
  }

  /**
   * Get movie data from database or fetch from service
   * @private
   * @param {string} id - Movie ID
   * @returns {Promise<object | null>} Movie data
   */
  async _getMovieData(id) {
    // Check database first
    const savedMovie = this.database.getMovie(id);
    if (savedMovie && savedMovie.movieDetails) {
      logger.debug("Found saved movie data in database", { id });
      return savedMovie;
    }

    // Fetch from service
    return this._fetchMovieData(id);
  }

  /**
   * Fetch movie data from Cinecalidad service
   * @private
   * @param {string} id - Movie ID
   * @returns {Promise<object | null>} Movie data
   */
  async _fetchMovieData(id) {
    try {
      const release = await this._findRelease(id);
      if (!release) {
        logger.warn("Release not found", { id });
        return null;
      }

      // Get detailed movie information
      const movieDetails = await this.cineCalidadService.getMovieDetails(
        release.detailsLink,
      );

      // Enrich with external metadata if available
      await this._enrichWithExternalMetadata(movieDetails, id);

      // Save to database
      const movieData = {
        movieDetails,
        release,
        externalMeta: movieDetails.externalMeta,
        lastUpdated: new Date().toISOString(),
      };

      this.database.saveMovie(id, movieData);
      return movieData;
    } catch (error) {
      logger.error("Failed to fetch movie data", { id, error: error.message });
      return null;
    }
  }

  /**
   * Find release by ID
   * @private
   * @param {string} id - Movie ID
   * @returns {Promise<object | null>} Release object
   */
  async _findRelease(id) {
    if (id.startsWith("cc_")) {
      return this._findCineCalidadRelease(id);
    } else if (id.startsWith("tt")) {
      return this._findImdbRelease(id);
    }
    return null;
  }

  /**
   * Find Cinecalidad release
   * @private
   * @param {string} id - Cinecalidad ID
   * @returns {Promise<object | null>} Release object
   */
  async _findCineCalidadRelease(id) {
    const movieId = id.replace("cc_", "");

    const catalogQuery = { search: "", skip: 0, limit: 100 };
    const releases = await this.cineCalidadService.performQuery(catalogQuery);

    return releases.find(
      (r) =>
        r.id === movieId ||
        r.id === encodeURIComponent(movieId) ||
        decodeURIComponent(r.id) === movieId ||
        decodeURIComponent(r.id) === decodeURIComponent(movieId),
    );
  }

  /**
   * Find IMDB release
   * @private
   * @param {string} id - IMDB ID
   * @returns {Promise<object | null>} Release object
   */
  async _findImdbRelease(id) {
    const catalogQuery = { search: "", skip: 0, limit: 100 };
    const releases = await this.cineCalidadService.performQuery(catalogQuery);

    return releases.find((r) => this._createStremioId(r) === id);
  }

  /**
   * Create Stremio ID from release
   * @private
   * @param {object} release - Release object
   * @returns {string|null} Stremio ID
   */
  _createStremioId(release) {
    if (release.id) {
      return `cc_${release.id}`;
    }
    if (release.imdbId && release.imdbId.startsWith("tt")) {
      return release.imdbId;
    }
    return null;
  }

  /**
   * Enrich movie details with external metadata
   * @private
   * @param {object} movieDetails - Movie details
   * @param {string} id - Movie ID
   */
  async _enrichWithExternalMetadata(movieDetails, id) {
    if (!id.startsWith("cc_") || !movieDetails?.imdbId?.startsWith("tt")) {
      return;
    }

    try {
      const externalMeta = await this.metadataService.getMovieMetadata({
        id: movieDetails.imdbId,
        type: "movie",
      });

      if (externalMeta) {
        movieDetails.externalMeta = externalMeta;
        logger.debug("Successfully enriched with external metadata", {
          imdbId: movieDetails.imdbId,
          title: externalMeta.originalTitle || externalMeta.title,
        });
      }
    } catch (error) {
      logger.warn("Failed to get external metadata", {
        imdbId: movieDetails.imdbId,
        error: error.message,
      });
    }
  }

  /**
   * Process streams from movie data
   * @private
   * @param {object} movieData - Movie data
   * @param {string} id - Movie ID
   * @returns {Promise<Array>} Array of streams
   */
  async _processStreams(movieData, id) {
    const { movieDetails } = movieData;

    if (!movieDetails?.downloadLinks?.length) {
      logger.debug("No download links available", { id });
      return [];
    }

    const streams = [];
    const { magnetLinks, nonMagnetLinks } = this._categorizeLinks(
      movieDetails.downloadLinks,
    );

    // Process magnet links
    if (magnetLinks.length > 0) {
      const magnetStreams = await this._processMagnetLinks(
        magnetLinks,
        movieData,
        id,
      );
      streams.push(...magnetStreams);
    }

    // Process non-magnet links
    const downloadStreams = this._processDownloadLinks(
      nonMagnetLinks,
      movieData,
      id,
    );
    streams.push(...downloadStreams);

    return streams;
  }

  /**
   * Categorize download links
   * @private
   * @param {Array} downloadLinks - Download links
   * @returns {object} Categorized links
   */
  _categorizeLinks(downloadLinks) {
    const magnetLinks = downloadLinks.filter(
      (link) => link.url && link.url.startsWith("magnet:"),
    );
    const nonMagnetLinks = downloadLinks.filter(
      (link) => link.url && !link.url.startsWith("magnet:"),
    );

    return { magnetLinks, nonMagnetLinks };
  }

  /**
   * Process magnet links
   * @private
   * @param {Array} magnetLinks - Magnet links
   * @param {object} movieData - Movie data
   * @param {string} id - Movie ID
   * @returns {Promise<Array>} Array of streams
   */
  async _processMagnetLinks(magnetLinks, movieData, id) {
    logger.debug("Processing magnet links", { count: magnetLinks.length, id });

    const magnetPromises = magnetLinks.map((link) =>
      this.torrentInfoService.processLink(link, movieData, id),
    );

    const results = await Promise.allSettled(magnetPromises);
    const streams = [];

    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        if (Array.isArray(result.value)) {
          streams.push(...result.value);
        } else {
          streams.push(result.value);
        }
      }
    });

    return streams;
  }

  /**
   * Process download links
   * @private
   * @param {Array} nonMagnetLinks - Non-magnet links
   * @param {object} movieData - Movie data
   * @param {string} id - Movie ID
   * @returns {Array} Array of download streams
   */
  _processDownloadLinks(nonMagnetLinks, movieData, id) {
    return nonMagnetLinks.map((link) => {
      const quality = this._extractQuality(link.name);
      const bingeGroupId = this._getBingeGroupId(movieData, id);

      return {
        name: `📥 Cinecalidad ${quality} - Download`,
        description: link.name || "Download",
        externalUrl: link.url,
        behaviorHints: {
          bingeGroup: `${this.BINGE_GROUP_PREFIX}${bingeGroupId}`,
          countryWhitelist: this.COUNTRY_WHITELIST,
        },
      };
    });
  }

  /**
   * Extract quality from link name
   * @private
   * @param {string} linkName - Link name
   * @returns {string} Quality
   */
  _extractQuality(linkName) {
    const name = (linkName || "").toUpperCase();

    if (name.includes("4K") || name.includes("2160P")) {
      return "4K";
    } else if (name.includes("720P")) {
      return "720p";
    }
    return "1080p";
  }

  /**
   * Get binge group ID
   * @private
   * @param {object} movieData - Movie data
   * @param {string} id - Movie ID
   * @returns {string} Binge group ID
   */
  _getBingeGroupId(movieData, id) {
    return (
      movieData.movieDetails?.externalMeta?.imdb ||
      movieData.movieDetails?.imdbId ||
      id
    );
  }
}

module.exports = StreamHandler;
