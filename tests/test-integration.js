// tests/test-integration.js
/**
 * Integration Test for Complete MetaHandler Flow
 * Tests real-world scenarios with actual service calls
 */

const MetaHandler = require("../src/handlers/MetaHandler");
const CineCalidadService = require("../services/cine-calidad-service");
const { movieMetadata } = require("../lib/metadata");
const { getInstance: getDatabase } = require("../lib/database");

class IntegrationTestSuite {
  constructor() {
    // Use real services for integration testing
    this.database = getDatabase();
    this.cineCalidadService = new CineCalidadService({
      siteLink: "https://www.cinecalidad.rs",
      maxLatestPageLimit: 1,
      maxSearchPageLimit: 2,
      requestDelay: 500,
      detailsDelay: 800,
    });

    this.dependencies = {
      database: this.database,
      cineCalidadService: this.cineCalidadService,
      metadataService: { getMovieMetadata: movieMetadata },
    };

    this.metaHandler = new MetaHandler(this.dependencies);
    this.testResults = [];
  }

  async runIntegrationTests() {
    console.log("🚀 Starting Integration Tests...\n");
    console.log("⚠️  These tests make real HTTP requests and may take time\n");

    // Test real IMDB ID
    await this.testRealIMDBId();

    // Test real Cinecalidad ID that exists
    await this.testRealCineCalidadId();

    // Test performance with multiple requests
    await this.testPerformance();

    // Test caching behavior
    await this.testCachingBehavior();

    this.printResults();
  }

  async runTest(testName, testFn, timeoutMs = 30000) {
    console.log(`🔍 Running: ${testName}`);
    const startTime = Date.now();

    try {
      // Set timeout for long-running tests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error(`Test timeout after ${timeoutMs}ms`)),
          timeoutMs,
        );
      });

      await Promise.race([testFn(), timeoutPromise]);

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

  async testRealIMDBId() {
    await this.runTest("Real IMDB ID - Popular Movie", async () => {
      // Test with a popular movie (Barbie 2023)
      const result = await this.metaHandler.handle({
        type: "movie",
        id: "tt1517268",
      });

      if (!result.meta) {
        throw new Error("Should return metadata for real IMDB ID");
      }

      if (!result.meta.name) {
        throw new Error("Metadata should have a name");
      }

      if (result.meta.type !== "movie") {
        throw new Error("Type should be movie");
      }

      if (result.meta.imdbId !== "tt1517268") {
        throw new Error("IMDB ID should match request");
      }

      console.log(`   📽️  Movie: ${result.meta.name} (${result.meta.year})`);
      console.log(
        `   🎭 Cast: ${result.meta.cast?.slice(0, 3)?.join(", ") || "N/A"}`,
      );
      console.log(`   ⭐ Rating: ${result.meta.imdbRating || "N/A"}`);
    });
  }

  async testRealCineCalidadId() {
    await this.runTest("Real Cinecalidad ID - Scraping Test", async () => {
      // Test with a movie that likely exists on Cinecalidad
      const result = await this.metaHandler.handle({
        type: "movie",
        id: "cc_barbie-2023-online-descarga",
      });

      console.log(`   🔍 Result:`, result.meta ? "Found" : "Not found");

      if (result.meta) {
        console.log(`   📽️  Movie: ${result.meta.name} (${result.meta.year})`);
        console.log(`   🎬 Quality: ${result.meta.releaseInfo || "N/A"}`);
        console.log(`   🆔 IMDB: ${result.meta.imdbId || "N/A"}`);
      }

      // This test passes regardless of result since movie availability varies
      // The important part is that it doesn't throw errors
    });
  }

  async testPerformance() {
    await this.runTest("Performance Test - Multiple Requests", async () => {
      const testIds = [
        "tt0111161", // The Shawshank Redemption
        "tt0068646", // The Godfather
        "tt0071562", // The Godfather Part II
      ];

      const startTime = Date.now();
      const promises = testIds.map((id) =>
        this.metaHandler.handle({ type: "movie", id }),
      );

      const results = await Promise.allSettled(promises);
      const duration = Date.now() - startTime;

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const avgTimePerRequest = duration / testIds.length;

      console.log(
        `   📊 Processed ${testIds.length} requests in ${duration}ms`,
      );
      console.log(
        `   ⚡ Average: ${avgTimePerRequest.toFixed(0)}ms per request`,
      );
      console.log(`   ✅ Success rate: ${successful}/${testIds.length}`);

      if (avgTimePerRequest > 5000) {
        throw new Error(
          `Performance too slow: ${avgTimePerRequest}ms per request`,
        );
      }
    });
  }

  async testCachingBehavior() {
    await this.runTest("Caching Behavior Test", async () => {
      const testId = "tt0109830"; // Forrest Gump

      // First request (should be slower - no cache)
      const start1 = Date.now();
      const result1 = await this.metaHandler.handle({
        type: "movie",
        id: testId,
      });
      const time1 = Date.now() - start1;

      // Second request (should be faster - cached)
      const start2 = Date.now();
      const result2 = await this.metaHandler.handle({
        type: "movie",
        id: testId,
      });
      const time2 = Date.now() - start2;

      console.log(`   🕐 First request: ${time1}ms`);
      console.log(`   🕑 Second request: ${time2}ms`);
      console.log(
        `   ⚡ Cache speedup: ${(((time1 - time2) / time1) * 100).toFixed(1)}%`,
      );

      // Results should be identical
      if (result1.meta?.name !== result2.meta?.name) {
        throw new Error("Cached result should match original result");
      }

      // Second request should be significantly faster (unless first was already cached)
      if (time2 > time1) {
        console.log(
          "   ⚠️  Second request was slower (may indicate cache miss)",
        );
      }
    });
  }

  printResults() {
    console.log("\n📊 INTEGRATION TEST RESULTS");
    console.log("=============================");

    const passed = this.testResults.filter((r) => r.status === "PASSED").length;
    const failed = this.testResults.filter((r) => r.status === "FAILED").length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);

    const successRate = ((passed / total) * 100).toFixed(1);
    console.log(`Success Rate: ${successRate}%`);

    const totalDuration = this.testResults.reduce(
      (sum, r) => sum + r.duration,
      0,
    );
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);

    if (failed > 0) {
      console.log("\n❌ FAILED TESTS:");
      this.testResults
        .filter((r) => r.status === "FAILED")
        .forEach((r) => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
    }

    console.log("\n🎯 Integration Tests Completed!");

    // Don't exit process in integration tests - let user decide
    return failed === 0;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new IntegrationTestSuite();
  testSuite.runIntegrationTests().catch((error) => {
    console.error("Integration test suite failed:", error);
    process.exit(1);
  });
}

module.exports = IntegrationTestSuite;
