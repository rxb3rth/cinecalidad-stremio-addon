/**
 * Application configuration settings
 */
const config = {
  // Server configuration
  server: {
    port: Number(process.env.PORT) || 7000,
    host: "127.0.0.1",
  },

  // CineCalidad configuration
  cinecalidad: {
    siteLink: "https://www.cinecalidad.rs",
    maxLatestPageLimit: 3,
    maxSearchPageLimit: 6,
    requestDelay: 1000,
    detailsDelay: 1500,
    cacheTimeout: 30 * 60 * 1000, // 30 minutes
    retryAttempts: 3,
    retryDelay: 2000,
  },

  // Addon manifest configuration
  addon: {
    id: "org.cinecalidad.addon",
    version: "1.0.0",
    name: "CineCalidad Movies",
    description:
      "Cinecalidad is a Public site for Películas Full UHD/HD en Latino Dual.",
    resources: ["stream", "meta", "catalog"],
    types: ["movie"],
    idPrefixes: ["cc_", "tt"],
  },

  // OMDB API configuration
  omdb: {
    apiKey: process.env.OMDB_API_KEY,
    baseUrl: "http://www.omdbapi.com/",
    timeout: 5000,
  },

  // Logging configuration
  logging: {
    enableFileLogging: false,
    logLevel: "info",
  },
};

/**
 * Get the complete addon manifest
 * @returns {object} Stremio addon manifest
 */
function getManifest() {
  return {
    id: config.addon.id,
    version: config.addon.version,
    name: config.addon.name,
    description: config.addon.description,
    logo: "https://www.stremio.com/website/stremio-logo-small.png",
    resources: config.addon.resources,
    types: config.addon.types,
    catalogs: [
      {
        type: "movie",
        id: "cinecalidad-latest",
        name: "CineCalidad Latest Movies",
        extra: [
          { name: "search", isRequired: false },
          { name: "skip", isRequired: false },
        ],
      },
      {
        type: "movie",
        id: "cinecalidad-search",
        name: "CineCalidad Search",
        extra: [
          { name: "search", isRequired: true },
          { name: "skip", isRequired: false },
        ],
      },
    ],
    idPrefixes: config.addon.idPrefixes,
  };
}

/**
 * Get addon server URL
 * @returns {string} Addon server URL
 */
function getAddonUrl() {
  return `http://${config.server.host}:${config.server.port}`;
}

module.exports = {
  config,
  getManifest,
  getAddonUrl,
};
