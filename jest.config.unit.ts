import type { Config } from "jest";

const jestUnitConfig: Config = {
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/tests/mocks/file.ts",
    "\\.(css|scss)$": "<rootDir>/tests/mocks/emptyModule.ts",
  },
  testEnvironment: "node",
  testTimeout: 20_000,
  forceExit: true,
  maxWorkers: "50%",
  testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
  collectCoverage: true,
  coverageDirectory: "coverage/unit",
  collectCoverageFrom: [
    "src/utils/**/*.ts",
    "src/access/**/*.ts",
    "src/middleware/**/*.ts",
    "!src/**/index.ts",
  ],
  coverageReporters: ["json", "lcov", "text", "clover"],
};

export default jestUnitConfig;
