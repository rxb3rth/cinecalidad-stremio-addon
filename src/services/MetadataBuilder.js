/**
 * Metadata Builder Service
 * Handles construction of metadata objects with proper validation,
 * fallback logic, and consistent data structure
 */

const logger = require("../../lib/logger");
const { validateUrl } = require("../lib/validators");

class MetadataBuilder {
  constructor(dependencies) {
    this.metadataService = dependencies.metadataService;
  }

  /**
   * Build metadata from IMDB data
   * @param {string} id - IMDB ID
   * @param {object} metadata - External metadata
   * @returns {object} Structured metadata
   */
  buildFromIMDB(id, metadata) {
    const context = { id, source: "imdb" };

    try {
      const meta = {
        id,
        type: "movie",
        name: this._selectBestTitle(metadata.originalTitle, metadata.title),
        poster: this._validateAndCleanUrl(metadata.poster),
        background: this._validateAndCleanUrl(
          metadata.background || metadata.poster,
        ),
        year: this._parseYear(metadata.year),
        description: this._cleanDescription(metadata.description),
        genres: this._normalizeGenres(metadata.genres),
        cast: this._normalizeCast(metadata.cast),
        director: this._normalizeDirector(metadata.director),
        writer: this._normalizeWriter(metadata.writer),
        imdbRating: this._parseRating(metadata.imdbRating),
        imdbId: id,
        releaseInfo: undefined,
      };

      logger.debug("Built metadata from IMDB", {
        ...context,
        title: meta.name,
        hasGenres: !!meta.genres?.length,
        hasCast: !!meta.cast?.length,
      });

      return this._cleanMetadata(meta);
    } catch (error) {
      logger.error("Failed to build IMDB metadata", {
        ...context,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Build metadata from catalog data
   * @param {object} catalogData - Existing catalog data
   * @param {string} id - Full ID for the metadata
   * @returns {object} Structured metadata
   */
  async buildFromCatalogData(catalogData, id) {
    const context = { id, source: "catalog" };

    try {
      const { release, movieDetails, externalMeta } = catalogData;

      if (!release) {
        throw new Error("No release data in catalog");
      }

      const meta = {
        id,
        type: "movie",
        name: this._selectBestTitle(
          externalMeta?.originalTitle,
          externalMeta?.title,
          release.originalTitle,
          release.title,
        ),
        poster: this._validateAndCleanUrl(
          externalMeta?.poster || release.poster,
        ),
        background: this._validateAndCleanUrl(
          externalMeta?.background || externalMeta?.poster || release.poster,
        ),
        year: this._parseYear(externalMeta?.year || release.year),
        description: this._buildDescription(externalMeta, release),
        genres: this._normalizeGenres(
          externalMeta?.genres ||
            (release.category ? [release.category] : undefined),
        ),
        cast: this._normalizeCast(externalMeta?.cast),
        director: this._normalizeDirector(externalMeta?.director),
        writer: this._normalizeWriter(externalMeta?.writer),
        imdbRating: this._parseRating(externalMeta?.imdbRating),
        imdbId: movieDetails?.imdbId,
        releaseInfo: this._buildReleaseInfo(release),
      };

      logger.debug("Built metadata from catalog", {
        ...context,
        title: meta.name,
        hasIMDB: !!meta.imdbId,
        quality: release.quality,
      });

      return this._cleanMetadata(meta);
    } catch (error) {
      logger.error("Failed to build catalog metadata", {
        ...context,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Build metadata from scraped data
   * @param {object} scrapedData - Fresh scraped data
   * @returns {object} Structured metadata
   */
  async buildFromScrapedData(scrapedData) {
    const { release, movieDetails, externalMeta, id } = scrapedData;
    const context = { id, source: "scraped" };

    try {
      const meta = {
        id,
        type: "movie",
        name: this._selectBestTitle(
          externalMeta?.originalTitle,
          externalMeta?.title,
          release.originalTitle,
          release.title,
        ),
        poster: this._validateAndCleanUrl(
          externalMeta?.poster || release.poster,
        ),
        background: this._validateAndCleanUrl(
          externalMeta?.background || externalMeta?.poster || release.poster,
        ),
        year: this._parseYear(externalMeta?.year || release.year),
        description: this._buildDescription(externalMeta, release),
        genres: this._normalizeGenres(
          externalMeta?.genres ||
            (release.category ? [release.category] : undefined),
        ),
        cast: this._normalizeCast(externalMeta?.cast),
        director: this._normalizeDirector(externalMeta?.director),
        writer: this._normalizeWriter(externalMeta?.writer),
        imdbRating: this._parseRating(externalMeta?.imdbRating),
        imdbId: movieDetails?.imdbId,
        releaseInfo: this._buildReleaseInfo(release),
      };

      logger.debug("Built metadata from scraped data", {
        ...context,
        title: meta.name,
        hasIMDB: !!meta.imdbId,
        quality: release?.quality,
      });

      return this._cleanMetadata(meta);
    } catch (error) {
      logger.error("Failed to build scraped metadata", {
        ...context,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Select the best title from multiple options
   * @param {...any} titles
   * @private
   */
  _selectBestTitle(...titles) {
    const validTitles = titles.filter(
      (t) => t && typeof t === "string" && t.trim(),
    );

    if (validTitles.length === 0) {
      return "Unknown Title";
    }

    // Prefer non-parenthetical titles, but not empty ones
    const nonParenTitles = validTitles.filter((t) => !t.includes("("));

    return (
      nonParenTitles.length > 0 ? nonParenTitles[0] : validTitles[0]
    ).trim();
  }

  /**
   * Validate and clean URL
   * @param url
   * @private
   */
  _validateAndCleanUrl(url) {
    if (!url || typeof url !== "string") {
      return undefined;
    }

    const cleaned = url.trim();

    if (!validateUrl(cleaned)) {
      return undefined;
    }

    return cleaned;
  }

  /**
   * Parse and validate year
   * @param year
   * @private
   */
  _parseYear(year) {
    if (!year) return undefined;

    const parsed = typeof year === "string" ? parseInt(year, 10) : year;

    if (
      isNaN(parsed) ||
      parsed < 1900 ||
      parsed > new Date().getFullYear() + 5
    ) {
      return undefined;
    }

    return parsed;
  }

  /**
   * Clean and validate description
   * @param description
   * @private
   */
  _cleanDescription(description) {
    if (!description || typeof description !== "string") {
      return undefined;
    }

    const cleaned = description
      .trim()
      .replace(/\s+/g, " ") // Normalize whitespace
      .substring(0, 1000); // Limit length

    return cleaned.length > 10 ? cleaned : undefined;
  }

  /**
   * Build description with fallback logic
   * @param externalMeta
   * @param release
   * @private
   */
  _buildDescription(externalMeta, release) {
    // Prefer external description
    if (externalMeta?.description) {
      return this._cleanDescription(externalMeta.description);
    }

    // Fallback to technical info
    if (release?.quality) {
      let description = `Película disponible en calidad ${release.quality}`;

      if (release.size) {
        const sizeGB =
          Math.round((release.size / 1024 / 1024 / 1024) * 100) / 100;
        description += ` | Tamaño: ${sizeGB}GB`;
      }

      return description;
    }

    return undefined;
  }

  /**
   * Normalize genres array
   * @param genres
   * @private
   */
  _normalizeGenres(genres) {
    if (!genres) return undefined;

    const normalized = Array.isArray(genres) ? genres : [genres];
    const validGenres = normalized
      .filter((g) => g && typeof g === "string")
      .map((g) => g.trim())
      .filter((g) => g.length > 0)
      .slice(0, 10); // Limit number of genres

    return validGenres.length > 0 ? validGenres : undefined;
  }

  /**
   * Normalize cast array
   * @param cast
   * @private
   */
  _normalizeCast(cast) {
    if (!cast) return undefined;

    const normalized = Array.isArray(cast)
      ? cast
      : typeof cast === "string"
        ? cast.split(",")
        : [];

    const validCast = normalized
      .map((c) => (typeof c === "string" ? c.trim() : String(c).trim()))
      .filter((c) => c.length > 0)
      .slice(0, 8); // Limit number of cast members

    return validCast.length > 0 ? validCast : undefined;
  }

  /**
   * Normalize director
   * @param director
   * @private
   */
  _normalizeDirector(director) {
    if (!director) return undefined;

    if (Array.isArray(director)) {
      const validDirectors = director
        .filter((d) => d && typeof d === "string")
        .map((d) => d.trim())
        .slice(0, 3);
      return validDirectors.length > 0 ? validDirectors : undefined;
    }

    if (typeof director === "string") {
      const trimmed = director.trim();
      return trimmed.length > 0 ? [trimmed] : undefined;
    }

    return undefined;
  }

  /**
   * Normalize writer
   * @param writer
   * @private
   */
  _normalizeWriter(writer) {
    return this._normalizeDirector(writer); // Same logic as director
  }

  /**
   * Parse rating value
   * @param rating
   * @private
   */
  _parseRating(rating) {
    if (!rating) return undefined;

    const parsed = typeof rating === "string" ? parseFloat(rating) : rating;

    if (isNaN(parsed) || parsed < 0 || parsed > 10) {
      return undefined;
    }

    return Math.round(parsed * 10) / 10; // Round to 1 decimal
  }

  /**
   * Build release info string
   * @param release
   * @private
   */
  _buildReleaseInfo(release) {
    if (!release?.quality) return undefined;

    return release.quality;
  }

  /**
   * Clean metadata object by removing undefined values
   * @param meta
   * @private
   */
  _cleanMetadata(meta) {
    const cleaned = {};

    for (const [key, value] of Object.entries(meta)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            cleaned[key] = value;
          }
        } else {
          cleaned[key] = value;
        }
      }
    }

    return cleaned;
  }
}

module.exports = { MetadataBuilder };
