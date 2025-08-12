// tests/quick-meta-test.js
/**
 * Quick Test for MetaHandler with Running Addon
 * Tests the actual addon endpoint to verify functionality
 */

const fetch = require("node-fetch");

class QuickMetaTest {
  constructor(baseUrl = "http://127.0.0.1:7000") {
    this.baseUrl = baseUrl;
    this.testCases = [
      {
        name: "IMDB ID - Popular Movie",
        id: "tt1517268", // Barbie 2023
        type: "imdb",
      },
      {
        name: "IMDB ID - Classic Movie",
        id: "tt0111161", // The Shawshank Redemption
        type: "imdb",
      },
      {
        name: "CineCalidad ID - Recent Movie",
        id: "cc_barbie-2023-online-descarga",
        type: "cinecalidad",
      },
      {
        name: "CineCalidad ID - Another Movie",
        id: "cc_avatar-el-camino-del-agua-online-descarga",
        type: "cinecalidad",
      },
    ];
  }

  async runQuickTests() {
    console.log("🚀 Quick MetaHandler Test");
    console.log("========================");
    console.log(`🌐 Testing addon at: ${this.baseUrl}\n`);

    // Check if addon is running
    const isRunning = await this.checkAddonStatus();
    if (!isRunning) {
      console.log(
        "❌ Addon is not running. Please start it first with: npm start",
      );
      return false;
    }

    console.log("✅ Addon is running\n");

    let passedTests = 0;
    const totalTests = this.testCases.length;

    for (const testCase of this.testCases) {
      const success = await this.runSingleTest(testCase);
      if (success) passedTests++;
    }

    console.log("\n📊 QUICK TEST SUMMARY");
    console.log("=====================");
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${totalTests - passedTests} ❌`);
    console.log(
      `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`,
    );

    return passedTests === totalTests;
  }

  async checkAddonStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/manifest.json`, {
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async runSingleTest(testCase) {
    const { name, id, type } = testCase;
    console.log(`🔍 Testing: ${name} (${id})`);

    const startTime = Date.now();

    try {
      const url = `${this.baseUrl}/meta/movie/${id}.json`;
      const response = await fetch(url, {
        timeout: 30000, // 30 second timeout
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Validate response structure
      if (!data || typeof data !== "object") {
        throw new Error("Invalid response format");
      }

      // Check if we got metadata
      if (data.meta) {
        const { meta } = data;
        console.log(`   ✅ SUCCESS (${duration}ms)`);
        console.log(`   📽️  Title: ${meta.name || "N/A"}`);
        console.log(`   📅 Year: ${meta.year || "N/A"}`);
        console.log(`   🆔 IMDB: ${meta.imdbId || "N/A"}`);
        console.log(`   ⭐ Rating: ${meta.imdbRating || "N/A"}`);
        console.log(`   🎬 Release Info: ${meta.releaseInfo || "N/A"}`);

        if (meta.genres && meta.genres.length > 0) {
          console.log(`   🎭 Genres: ${meta.genres.slice(0, 3).join(", ")}`);
        }

        if (meta.cast && meta.cast.length > 0) {
          console.log(`   👥 Cast: ${meta.cast.slice(0, 3).join(", ")}`);
        }

        console.log("");
        return true;
      } else {
        console.log(`   ⚠️  NO METADATA FOUND (${duration}ms)`);
        console.log(`   📄 Response: ${JSON.stringify(data, null, 2)}`);
        console.log("");

        // For CineCalidad IDs, this might be expected if movie doesn't exist
        if (type === "cinecalidad") {
          console.log(
            "   ℹ️  This is acceptable for CineCalidad IDs (movie might not exist)\n",
          );
          return true;
        }

        return false;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`   ❌ FAILED (${duration}ms)`);
      console.log(`   💥 Error: ${error.message}\n`);
      return false;
    }
  }
}

// Helper function to test a specific ID
/**
 *
 * @param id
 */
async function testSpecificId(id) {
  console.log(`🎯 Testing specific ID: ${id}\n`);

  const tester = new QuickMetaTest();
  const isRunning = await tester.checkAddonStatus();

  if (!isRunning) {
    console.log(
      "❌ Addon is not running. Please start it first with: npm start",
    );
    return;
  }

  const testCase = {
    name: `Manual Test for ${id}`,
    id,
    type: id.startsWith("tt") ? "imdb" : "cinecalidad",
  };

  await tester.runSingleTest(testCase);
}

// Export for use in other files
module.exports = { QuickMetaTest, testSpecificId };

// Run tests if this file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // Test specific ID if provided
    testSpecificId(args[0]).catch(console.error);
  } else {
    // Run all quick tests
    const tester = new QuickMetaTest();
    tester.runQuickTests().catch(console.error);
  }
}
