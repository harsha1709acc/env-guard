import { describe, it, expect } from "vitest";
import { EnvValidationError } from "../src/index.js";

describe("EnvValidationError", () => {
  it("should format single and multiple errors cleanly", () => {
    const singleError = new EnvValidationError([
      {
        key: "DATABASE_URL",
        expectedType: "valid URL",
        receivedValue: undefined,
        message: 'Missing required environment variable "DATABASE_URL"',
      },
    ]);

    expect(singleError.message).toContain("failed with 1 error:");
    expect(singleError.message).toContain("- DATABASE_URL: Expected valid URL, received undefined");
    expect(singleError.errors).toHaveLength(1);

    const multiError = new EnvValidationError([
      {
        key: "PORT",
        expectedType: "port",
        receivedValue: "abc",
        message: 'Invalid "PORT"',
      },
      {
        key: "API_SECRET",
        expectedType: "string",
        receivedValue: "[REDACTED]",
        message: 'Invalid "API_SECRET"',
        isSecret: true,
      },
    ]);

    expect(multiError.message).toContain("failed with 2 errors:");
    expect(multiError.message).toContain('- PORT: Expected port, received "abc"');
    expect(multiError.message).toContain("- API_SECRET: Expected string, received [REDACTED]");
    expect(multiError.name).toBe("EnvValidationError");
    expect(Object.isFrozen(multiError.errors)).toBe(true);
  });
});
