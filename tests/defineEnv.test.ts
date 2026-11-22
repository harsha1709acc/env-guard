import { describe, it, expect, expectTypeOf } from "vitest";
import { defineEnv, str, num, bool, port, url, oneOf, EnvValidationError } from "../src/index.js";

describe("defineEnv", () => {
  it("should validate and parse valid environment variables", () => {
    const source = {
      NODE_ENV: "production",
      PORT: "8080",
      DEBUG: "true",
      APP_URL: "https://api.example.com",
      DATABASE_SECRET: "s3cr3t_p@ss",
    };

    const env = defineEnv(
      {
        NODE_ENV: oneOf(["development", "production", "test"] as const),
        PORT: port(),
        DEBUG: bool(),
        APP_URL: url(),
        DATABASE_SECRET: str().secret(),
      },
      source,
    );

    expect(env.NODE_ENV).toBe("production");
    expect(env.PORT).toBe(8080);
    expect(env.DEBUG).toBe(true);
    expect(env.APP_URL).toBe("https://api.example.com");
    expect(env.DATABASE_SECRET).toBe("s3cr3t_p@ss");

    // Static type assertions
    expectTypeOf(env.NODE_ENV).toEqualTypeOf<"development" | "production" | "test">();
    expectTypeOf(env.PORT).toEqualTypeOf<number>();
    expectTypeOf(env.DEBUG).toEqualTypeOf<boolean>();
    expectTypeOf(env.APP_URL).toEqualTypeOf<string>();
    expectTypeOf(env.DATABASE_SECRET).toEqualTypeOf<string>();
  });

  it("should return a frozen, immutable object", () => {
    const env = defineEnv(
      {
        APP_NAME: str().default("my-app"),
      },
      {},
    );

    expect(Object.isFrozen(env)).toBe(true);
    expect(() => {
      // @ts-expect-error mutating frozen object
      (env as any).APP_NAME = "new-name";
    }).toThrow();
  });

  it("should use default values when variable is missing", () => {
    const env = defineEnv(
      {
        HOST: str().default("127.0.0.1"),
        PORT: port().default(3000),
        ENABLED: bool().default(false),
      },
      {},
    );

    expect(env.HOST).toBe("127.0.0.1");
    expect(env.PORT).toBe(3000);
    expect(env.ENABLED).toBe(false);

    expectTypeOf(env.HOST).toEqualTypeOf<string>();
    expectTypeOf(env.PORT).toEqualTypeOf<number>();
    expectTypeOf(env.ENABLED).toEqualTypeOf<boolean>();
  });

  it("should not use default value when an explicit value is provided", () => {
    const env = defineEnv(
      {
        HOST: str().default("127.0.0.1"),
        PORT: port().default(3000),
      },
      {
        HOST: "0.0.0.0",
        PORT: "4000",
      },
    );

    expect(env.HOST).toBe("0.0.0.0");
    expect(env.PORT).toBe(4000);
  });

  it("should correctly handle optional fields", () => {
    const env = defineEnv(
      {
        OPTIONAL_STR: str().optional(),
        OPTIONAL_NUM: num().optional(),
      },
      {},
    );

    expect(env.OPTIONAL_STR).toBeUndefined();
    expect(env.OPTIONAL_NUM).toBeUndefined();

    expectTypeOf(env.OPTIONAL_STR).toEqualTypeOf<string | undefined>();
    expectTypeOf(env.OPTIONAL_NUM).toEqualTypeOf<number | undefined>();
  });

  it("should parse optional fields when provided", () => {
    const env = defineEnv(
      {
        OPTIONAL_STR: str().optional(),
        OPTIONAL_NUM: num().optional(),
      },
      {
        OPTIONAL_STR: "present",
        OPTIONAL_NUM: "42",
      },
    );

    expect(env.OPTIONAL_STR).toBe("present");
    expect(env.OPTIONAL_NUM).toBe(42);
  });

  it("should collect all errors and throw a single EnvValidationError", () => {
    expect.assertions(8);

    try {
      defineEnv(
        {
          HOST: str(),
          PORT: port(),
          ACTIVE: bool(),
          API_URL: url(),
        },
        {
          PORT: "not-a-port",
          ACTIVE: "not-a-bool",
          API_URL: "not-a-url",
        },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const validationError = error as EnvValidationError;
      expect(validationError.errors).toHaveLength(4);

      const keys = validationError.errors.map((e) => e.key);
      expect(keys).toContain("HOST");
      expect(keys).toContain("PORT");
      expect(keys).toContain("ACTIVE");
      expect(keys).toContain("API_URL");

      const hostError = validationError.errors.find((e) => e.key === "HOST");
      expect(hostError?.receivedValue).toBeUndefined();

      const portError = validationError.errors.find((e) => e.key === "PORT");
      expect(portError?.receivedValue).toBe("not-a-port");
    }
  });

  it("should mask values for fields marked with .secret()", () => {
    expect.assertions(6);

    try {
      defineEnv(
        {
          REGULAR_VAR: num(),
          SECRET_TOKEN: num().secret(),
        },
        {
          REGULAR_VAR: "bad-number",
          SECRET_TOKEN: "sensitive-unmasked-token",
        },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const validationError = error as EnvValidationError;

      const secretErr = validationError.errors.find((e) => e.key === "SECRET_TOKEN");
      expect(secretErr?.receivedValue).toBe("[REDACTED]");
      expect(secretErr?.isSecret).toBe(true);

      const regularErr = validationError.errors.find((e) => e.key === "REGULAR_VAR");
      expect(regularErr?.receivedValue).toBe("bad-number");

      // Verify that secret is not present in error message
      expect(validationError.message).not.toContain("sensitive-unmasked-token");
      expect(validationError.message).toContain("[REDACTED]");
    }
  });

  it("should include descriptions in error messages when provided", () => {
    expect.assertions(4);

    try {
      defineEnv(
        {
          MISSING_WITH_DESC: str().describe("Primary application port"),
          INVALID_WITH_DESC: num().describe("Max worker threads"),
        },
        {
          INVALID_WITH_DESC: "not-a-number",
        },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const validationError = error as EnvValidationError;

      const missing = validationError.errors.find((e) => e.key === "MISSING_WITH_DESC");
      expect(missing?.message).toContain("Primary application port");

      const invalid = validationError.errors.find((e) => e.key === "INVALID_WITH_DESC");
      expect(invalid?.message).toContain("Max worker threads");
      expect(invalid?.message).toContain("Invalid environment variable");
    }
  });

  it("should use process.env when source is omitted", () => {
    const originalEnv = process.env.TEST_DEFAULT_SOURCE_VAR;
    process.env.TEST_DEFAULT_SOURCE_VAR = "hello-from-process";

    try {
      const env = defineEnv({
        TEST_DEFAULT_SOURCE_VAR: str(),
      });
      expect(env.TEST_DEFAULT_SOURCE_VAR).toBe("hello-from-process");
    } finally {
      if (originalEnv === undefined) {
        delete process.env.TEST_DEFAULT_SOURCE_VAR;
      } else {
        process.env.TEST_DEFAULT_SOURCE_VAR = originalEnv;
      }
    }
  });
});
