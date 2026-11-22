import { describe, it, expectTypeOf } from "vitest";
import { str, num, bool, port, url, oneOf, defineEnv } from "../src/index.js";
import type { InferEnv } from "../src/index.js";

describe("Type Inference", () => {
  it("should infer types accurately for required, optional, and defaulted fields", () => {
    const schema = {
      // Required fields
      REQUIRED_STR: str(),
      REQUIRED_NUM: num(),
      REQUIRED_BOOL: bool(),
      REQUIRED_PORT: port(),
      REQUIRED_URL: url(),
      NODE_ENV: oneOf(["development", "production", "test"] as const),

      // Fields with defaults
      DEFAULT_STR: str().default("default-value"),
      DEFAULT_NUM: num().default(8080),
      DEFAULT_BOOL: bool().default(false),
      DEFAULT_PORT: port().default(3000),

      // Optional fields
      OPTIONAL_STR: str().optional(),
      OPTIONAL_NUM: num().optional(),
      OPTIONAL_BOOL: bool().optional(),
      OPTIONAL_PORT: port().optional(),
      OPTIONAL_URL: url().optional(),
      OPTIONAL_ENUM: oneOf(["a", "b"] as const).optional(),

      // Chained metadata
      SECRET_DESCRIBED: str().describe("A secret token").secret(),
      OPTIONAL_SECRET: str().optional().secret(),
      DEFAULT_SECRET: str().default("fallback").secret(),
    };

    type ExpectedEnvType = {
      readonly REQUIRED_STR: string;
      readonly REQUIRED_NUM: number;
      readonly REQUIRED_BOOL: boolean;
      readonly REQUIRED_PORT: number;
      readonly REQUIRED_URL: string;
      readonly NODE_ENV: "development" | "production" | "test";

      readonly DEFAULT_STR: string;
      readonly DEFAULT_NUM: number;
      readonly DEFAULT_BOOL: boolean;
      readonly DEFAULT_PORT: number;

      readonly OPTIONAL_STR: string | undefined;
      readonly OPTIONAL_NUM: number | undefined;
      readonly OPTIONAL_BOOL: boolean | undefined;
      readonly OPTIONAL_PORT: number | undefined;
      readonly OPTIONAL_URL: string | undefined;
      readonly OPTIONAL_ENUM: "a" | "b" | undefined;

      readonly SECRET_DESCRIBED: string;
      readonly OPTIONAL_SECRET: string | undefined;
      readonly DEFAULT_SECRET: string;
    };

    expectTypeOf<InferEnv<typeof schema>>().toEqualTypeOf<ExpectedEnvType>();

    const env = defineEnv(schema, {
      REQUIRED_STR: "test",
      REQUIRED_NUM: "123",
      REQUIRED_BOOL: "true",
      REQUIRED_PORT: "3000",
      REQUIRED_URL: "https://example.com",
      NODE_ENV: "production",
      SECRET_DESCRIBED: "secret-value",
    });

    expectTypeOf(env).toEqualTypeOf<ExpectedEnvType>();
  });
});
