// tests/test-meta-handler.js
/**
 * Test Suite for MetaHandler
 * Comprehensive testing with mocks, scenarios, and edge cases
 */

const MetaHandler = require("../src/handlers/MetaHandler");

// Mock dependencies
class MockDatabase {
  constructor() {
    this.movies = new Map();
    this.cache = new Map();
  }

  getMovie(id) {
    return this.movies.get(id) || null;
  }

  findMovieByOriginalId(originalId) {
    console.log(`[MOCK] findMovieByOriginalId called with: ${originalId}`);
    console.log(`[MOCK] Available movies:`, Array.from(this.movies.keys()));

    for (const [key, value] of this.movies.entries()) {
      console.log(
        `[MOCK] Checking key: ${key}, release.id: ${value.release?.id}, ` +
          `movieDetails.id: ${value.movieDetails?.id}`,
      );
      if (
        value.release?.id === originalId ||
        value.movieDetails?.id === originalId
      ) {
        console.log(`[MOCK] Found match for ${originalId}`);
        return { stremioId: key, data: value };
      }
    }
    console.log(`[MOCK] No match found for ${originalId}`);
    return null;
  }

  saveMovie(id, data) {
    this.movies.set(id, data);
  }

  getCache(key) {
    const item = this.cache.get(key);
    if (item && item.expires > Date.now()) {
      return item.data;
    }
    return null;
  }

  setCache(key, data, ttlMinutes = 30) {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMinutes * 60 * 1000,
    });
  }

  deleteCache(key) {
    this.cache.delete(key);
  }

  clearExpiredCache() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expires <= now) {
        this.cache.delete(key);
      }
    }
  }
}

class MockCineCalidadService {
  constructor() {
    this.mockReleases = [];
    this.mockMovieDetails = null;
  }

  async performQuery(query) {
    console.log(`[MOCK] performQuery called with:`, query);
    return this.mockReleases;
  }

  async getMovieDetails(url) {
    console.log(`[MOCK] getMovieDetails called with:`, url);
    return this.mockMovieDetails;
  }

  setMockReleases(releases) {
    this.mockReleases = releases;
  }

  setMockMovieDetails(details) {
    this.mockMovieDetails = details;
  }
}

class MockMetadataBuilder {
  constructor() {
    this.mockCatalogResult = null;
  }

  async buildFromCatalogData(catalogData, id) {
    console.log(`[MOCK] buildFromCatalogData called with:`, {
      catalogData,
      id,
    });

    if (this.mockCatalogResult) {
      console.log(
        `[MOCK] Returning mock catalog result:`,
        this.mockCatalogResult,
      );
      return this.mockCatalogResult;
    }

    // Default behavior - build from release data
    const { release } = catalogData;
    if (release) {
      const result = {
        id,
        type: "movie",
        name: release.originalTitle || release.title,
        poster: release.poster,
        year: parseInt(release.year) || 2023,
        description: "Default catalog description",
      };
      console.log(`[MOCK] Built catalog result:`, result);
      return result;
    }

    console.log(`[MOCK] No release data, returning null`);
    return null;
  }

  buildFromIMDB(id, metadata) {
    return {
      id,
      type: "movie",
      name: metadata.originalTitle || metadata.title || "Unknown Title",
      poster: metadata.poster,
      year: metadata.year,
      description: metadata.description,
      genres: metadata.genres,
      imdbId: id,
    };
  }

  async buildFromScrapedData(catalogData, movieDetails, externalMeta, id) {
    console.log(`[MOCK] buildFromScrapedData called with:`, {
      catalogData,
      movieDetails,
      externalMeta,
      id,
    });

    // Extract data from catalogData if structured that way
    const actualExternalMeta = externalMeta || catalogData?.externalMeta;
    const actualMovieDetails = movieDetails || catalogData?.movieDetails;
    const actualId = id || catalogData?.id;

    // Build from scraped data
    return {
      id: actualId,
      type: "movie",
      name:
        actualExternalMeta?.originalTitle ||
        actualExternalMeta?.title ||
        actualMovieDetails?.title ||
        "Scraped Movie",
      poster: actualExternalMeta?.poster,
      year: actualExternalMeta?.year || actualMovieDetails?.year,
      description: actualExternalMeta?.description,
      genres: actualExternalMeta?.genres,
      imdbId: actualMovieDetails?.imdbId,
    };
  }

  setMockCatalogResult(result) {
    this.mockCatalogResult = result;
  }
}

class MockMetadataService {
  constructor() {
    this.mockMetadata = null;
  }

  async getMovieMetadata(params) {
    console.log(`[MOCK] getMovieMetadata called with:`, params);
    return this.mockMetadata;
  }

  setMockMetadata(metadata) {
    this.mockMetadata = metadata;
  }
}

/**
 * Test Suite Runner
 */
class MetaHandlerTestSuite {
  constructor() {
    this.database = new MockDatabase();
    this.cineCalidadService = new MockCineCalidadService();
    this.metadataService = new MockMetadataService();
    this.metadataBuilder = new MockMetadataBuilder();

    this.dependencies = {
      database: this.database,
      cineCalidadService: this.cineCalidadService,
      metadataService: this.metadataService,
      metadataBuilder: this.metadataBuilder,
    };

    this.metaHandler = new MetaHandler(this.dependencies);
    this.testResults = [];
  }

  async runAllTests() {
    console.log("🧪 Starting MetaHandler Test Suite...\n");

    // Test basic validation
    await this.testInputValidation();
    await this.testNonMovieType();

    // Test IMDB ID handling
    await this.testIMDBIdSuccess();
    await this.testIMDBIdNotFound();

    // Test Cinecalidad ID handling
    await this.testCineCalidadIdFromDatabase();
    await this.testCineCalidadIdFromCatalog();
    await this.testCineCalidadIdScraping();
    await this.testCineCalidadIdNotFound();

    // Test caching
    await this.testCaching();

    // Test edge cases
    await this.testInvalidIdFormat();
    await this.testEmptyResponse();

    // Test error handling
    await this.testServiceErrors();

    this.printResults();
  }

  async runTest(testName, testFn) {
    console.log(`🔍 Running: ${testName}`);
    const startTime = Date.now();

    try {
      await testFn();
      const duration = Date.now() - startTime;
      console.log(`✅ PASSED: ${testName} (${duration}ms)\n`);
      this.testResults.push({ name: testName, status: "PASSED", duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ FAILED: ${testName} (${duration}ms)`);
      console.log(`   Error: ${error.message}\n`);
      this.testResults.push({
        name: testName,
        status: "FAILED",
        duration,
        error: error.message,
      });
    }
  }

  // Test Cases
  async testInputValidation() {
    await this.runTest("Input Validation - Invalid Args", async () => {
      const result = await this.metaHandler.handle(null);
      if (result.meta !== null) {
        throw new Error("Should return null meta for invalid args");
      }
    });

    await this.runTest("Input Validation - Missing ID", async () => {
      const result = await this.metaHandler.handle({ type: "movie" });
      if (result.meta !== null) {
        throw new Error("Should return null meta for missing ID");
      }
    });
  }

  async testNonMovieType() {
    await this.runTest("Non-Movie Type Handling", async () => {
      const result = await this.metaHandler.handle({
        type: "series",
        id: "tt1234567",
      });
      if (result.meta !== null) {
        throw new Error("Should return null meta for non-movie type");
      }
    });
  }

  async testIMDBIdSuccess() {
    await this.runTest("IMDB ID - Success Case", async () => {
      // Setup mock
      this.metadataService.setMockMetadata({
        title: "Test Movie",
        originalTitle: "Test Movie Original",
        year: 2023,
        poster: "https://example.com/poster.jpg",
        description: "A test movie",
        genres: ["Action", "Drama"],
        cast: ["Actor 1", "Actor 2"],
        imdbRating: 8.5,
      });

      const result = await this.metaHandler.handle({
        type: "movie",
        id: "tt1234567",
      });

      if (!result.meta) {
        throw new Error("Should return metadata for valid IMDB ID");
      }

      if (result.meta.name !== "Test Movie Original") {
        throw new Error(
          `Expected title 'Test Movie Original', got '${result.meta.name}'`,
        );
      }

      if (result.meta.imdbId !== "tt1234567") {
        throw new Error(
          `Expected IMDB ID 'tt1234567', got '${result.meta.imdbId}'`,
        );
      }
    });
  }

  async testIMDBIdNotFound() {
    await this.runTest("IMDB ID - Not Found", async () => {
      // Setup mock to return null
      this.metadataService.setMockMetadata(null);

      const result = await this.metaHandler.handle({
        type: "movie",
        id: "tt9999999",
      });

      if (result.meta !== null) {
        throw new Error("Should return null meta when IMDB metadata not found");
      }
    });
  }

  async testCineCalidadIdFromDatabase() {
    await this.runTest("Cinecalidad ID - From Database", async () => {
      // Setup database with existing movie - use correct structure with meta wrapper
      this.database.saveMovie("cc_test-movie-2023", {
        meta: {
          id: "cc_test-movie-2023",
          type: "movie",
          name: "Test Movie from DB",
          year: 2023,
          poster: "https://example.com/poster.jpg",
          description: "A test movie from database",
          genres: ["Action"],
        },
      });

      const result = await this.metaHandler.handle({
        type: "movie",
        id: "cc_test-movie-2023",
      });

      if (!result.meta) {
        throw new Error("Should return metadata from database");
      }

      if (result.meta.name !== "Test Movie from DB") {
        throw new Error(`Expected title from DB, got '${result.meta.name}'`);
      }
    });
  }

  async testCineCalidadIdFromCatalog() {
    await this.runTest("Cinecalidad ID - From Catalog", async () => {
      // Setup catalog data with proper structure - key should match what findMovieByOriginalId looks for
      this.database.saveMovie("cc_test-catalog-movie-2023", {
        release: {
          id: "test-catalog-movie-2023", // This should match the movieId extracted from cc_test-catalog-movie-2023
          title: "Test Catalog Movie (2023)",
          originalTitle: "Test Catalog Movie",
          year: "2023",
          quality: "1080p",
          poster: "https://example.com/poster.jpg",
        },
        movieDetails: {
          imdbId: "tt1111111",
          description: "A catalog movie",
          genres: ["Drama"],
        },
      });

      const result = await this.metaHandler.handle({
        type: "movie",
        id: "cc_test-catalog-movie-2023",
      });

      if (!result.meta) {
        throw new Error("Should return metadata from catalog");
      }

      // Check if name exists before using includes
      if (
        !result.meta.name ||
        !result.meta.name.includes("Test Catalog Movie")
      ) {
        throw new Error(
          `Expected catalog movie title, got '${result.meta.name}'`,
        );
      }
    });
  }

  async testCineCalidadIdScraping() {
    await this.runTest("Cinecalidad ID - Scraping Fallback", async () => {
      // Setup mocks for scraping
      this.cineCalidadService.setMockReleases([
        {
          id: "test-scraped-movie-2023",
          title: "Test Scraped Movie (2023)",
          originalTitle: "Test Scraped Movie",
          year: "2023",
          quality: "1080p",
          poster: "https://example.com/poster.jpg",
          detailsLink: "https://example.com/movie/test-scraped-movie-2023",
        },
      ]);

      this.cineCalidadService.setMockMovieDetails({
        imdbId: "tt2222222",
        title: "Test Scraped Movie",
        year: 2023,
      });

      this.metadataService.setMockMetadata({
        title: "Test Scraped Movie",
        originalTitle: "Test Scraped Movie Original",
        year: 2023,
        description: "A scraped test movie",
        imdbRating: 7.5,
      });

      const result = await this.metaHandler.handle({
        type: "movie",
        id: "cc_test-scraped-movie-2023",
      });

      if (!result.meta) {
        throw new Error("Should return metadata from scraping");
      }

      // Check if name exists before using includes
      if (
        !result.meta.name ||
        !result.meta.name.includes("Test Scraped Movie")
      ) {
        throw new Error(
          `Expected scraped movie title, got '${result.meta.name}'`,
        );
      }
    });
  }

  async testCineCalidadIdNotFound() {
    await this.runTest("Cinecalidad ID - Not Found", async () => {
      // Setup empty responses
      this.cineCalidadService.setMockReleases([]);

      const result = await this.metaHandler.handle({
        type: "movie",
        id: "cc_nonexistent-movie-2023",
      });

      if (result.meta !== null) {
        throw new Error("Should return null meta when movie not found");
      }
    });
  }

  async testCaching() {
    await this.runTest("Caching Functionality", async () => {
      // Setup metadata service
      this.metadataService.setMockMetadata({
        title: "Cached Movie",
        year: 2023,
      });

      // First call should cache the result
      const result1 = await this.metaHandler.handle({
        type: "movie",
        id: "tt3333333",
      });

      if (!result1.meta) {
        throw new Error("First call should return metadata");
      }

      // Mock service to return null (to verify cache is used)
      this.metadataService.setMockMetadata(null);

      // Second call should use cache
      const result2 = await this.metaHandler.handle({
        type: "movie",
        id: "tt3333333",
      });

      if (!result2.meta) {
        throw new Error("Second call should return cached metadata");
      }

      if (result1.meta.name !== result2.meta.name) {
        throw new Error("Cached result should match original result");
      }
    });
  }

  async testInvalidIdFormat() {
    await this.runTest("Invalid ID Format", async () => {
      const result = await this.metaHandler.handle({
        type: "movie",
        id: "invalid-id-format",
      });

      if (result.meta !== null) {
        throw new Error("Should return null meta for invalid ID format");
      }
    });
  }

  async testEmptyResponse() {
    await this.runTest("Empty Response Handling", async () => {
      this.metadataService.setMockMetadata({});

      const result = await this.metaHandler.handle({
        type: "movie",
        id: "tt4444444",
      });

      // Should handle empty metadata gracefully
      if (!result || typeof result !== "object") {
        throw new Error("Should return valid response object");
      }
    });
  }

  async testServiceErrors() {
    await this.runTest("Service Error Handling", async () => {
      // Mock service to throw error
      const originalMethod = this.metadataService.getMovieMetadata;
      this.metadataService.getMovieMetadata = async () => {
        throw new Error("Service unavailable");
      };

      const result = await this.metaHandler.handle({
        type: "movie",
        id: "tt5555555",
      });

      // Should handle error gracefully
      if (!result || typeof result !== "object") {
        throw new Error(
          "Should return valid response object even on service error",
        );
      }

      // Restore original method
      this.metadataService.getMovieMetadata = originalMethod;
    });
  }

  printResults() {
    console.log("\n📊 TEST RESULTS SUMMARY");
    console.log("========================");

    const passed = this.testResults.filter((r) => r.status === "PASSED").length;
    const failed = this.testResults.filter((r) => r.status === "FAILED").length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);

    const successRate = ((passed / total) * 100).toFixed(1);
    console.log(`Success Rate: ${successRate}%`);

    const avgDuration = (
      this.testResults.reduce((sum, r) => sum + r.duration, 0) / total
    ).toFixed(0);
    console.log(`Average Duration: ${avgDuration}ms`);

    if (failed > 0) {
      console.log("\n❌ FAILED TESTS:");
      this.testResults
        .filter((r) => r.status === "FAILED")
        .forEach((r) => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
    }

    console.log("\n🎯 Test Suite Completed!");

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new MetaHandlerTestSuite();
  testSuite.runAllTests().catch((error) => {
    console.error("Test suite failed:", error);
    process.exit(1);
  });
}

module.exports = MetaHandlerTestSuite;
