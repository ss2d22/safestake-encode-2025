/**
 * Jest Configuration for SafeStake SDK tests 
 */

export default {
  // Use ts-jest for TypeScript support
  preset: "ts-jest/presets/default-esm",

  // Test environment
  testEnvironment: "node",

  // Module resolution
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  // Transform TypeScript files
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "ESNext",
          moduleResolution: "bundler",
        },
      },
    ],
  },

  // Test file patterns
  testMatch: ["**/test/**/*.test.ts", "**/test/**/*.spec.ts"],

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/**/index.ts",
  ],

  // Timeout for async tests
  testTimeout: 30000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,
};
