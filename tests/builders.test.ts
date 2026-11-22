import { describe, it, expect } from "vitest";
import { str, num, bool, port, url, oneOf, defineEnv } from "../src/index.js";

describe("Field builders and edge cases", () => {
  describe("str()", () => {
    it("should accept valid strings including empty string", () => {
      const env = defineEnv(
        {
          EMPTY: str(),
          SPACED: str(),
        },
        {
          EMPTY: "",
          SPACED: "   padded string   ",
        },
      );

      expect(env.EMPTY).toBe("");
      expect(env.SPACED).toBe("   padded string   ");
    });

    it("should support description and metadata", () => {
      const builder = str().describe("API host URL").secret();
      expect(builder.description).toBe("API host URL");
      expect(builder.isSecret).toBe(true);
      expect(builder.expectedType).toBe("string");
    });
  });

  describe("num()", () => {
    it("should parse valid numbers including decimals and negatives", () => {
      const env = defineEnv(
        {
          INT: num(),
          FLOAT: num(),
          NEG: num(),
          ZERO: num(),
        },
        {
          INT: "100",
          FLOAT: "3.14159",
          NEG: "-42",
          ZERO: "0",
        },
      );

      expect(env.INT).toBe(100);
      expect(env.FLOAT).toBe(3.14159);
      expect(env.NEG).toBe(-42);
      expect(env.ZERO).toBe(0);
    });

    it("should reject empty strings and whitespace-only strings", () => {
      expect(() => defineEnv({ N: num() }, { N: "" })).toThrow();
      expect(() => defineEnv({ N: num() }, { N: "    " })).toThrow();
    });

    it("should reject invalid numbers, NaN, and Infinity", () => {
      expect(() => defineEnv({ N: num() }, { N: "abc" })).toThrow();
      expect(() => defineEnv({ N: num() }, { N: "123abc" })).toThrow();
      expect(() => defineEnv({ N: num() }, { N: "NaN" })).toThrow();
      expect(() => defineEnv({ N: num() }, { N: "Infinity" })).toThrow();
      expect(() => defineEnv({ N: num() }, { N: "-Infinity" })).toThrow();
    });
  });

  describe("bool()", () => {
    it("should coerce boolean representations accurately", () => {
      const env = defineEnv(
        {
          T1: bool(),
          T2: bool(),
          T3: bool(),
          T4: bool(),
          F1: bool(),
          F2: bool(),
          F3: bool(),
          F4: bool(),
        },
        {
          T1: "true",
          T2: "TRUE",
          T3: "True",
          T4: "1",
          F1: "false",
          F2: "FALSE",
          F3: "False",
          F4: "0",
        },
      );

      expect(env.T1).toBe(true);
      expect(env.T2).toBe(true);
      expect(env.T3).toBe(true);
      expect(env.T4).toBe(true);
      expect(env.F1).toBe(false);
      expect(env.F2).toBe(false);
      expect(env.F3).toBe(false);
      expect(env.F4).toBe(false);
    });

    it("should reject invalid boolean strings, empty strings, and whitespace", () => {
      expect(() => defineEnv({ B: bool() }, { B: "" })).toThrow();
      expect(() => defineEnv({ B: bool() }, { B: "   " })).toThrow();
      expect(() => defineEnv({ B: bool() }, { B: "yes" })).toThrow();
      expect(() => defineEnv({ B: bool() }, { B: "no" })).toThrow();
      expect(() => defineEnv({ B: bool() }, { B: "2" })).toThrow();
    });
  });

  describe("port()", () => {
    it("should parse valid port integers", () => {
      const env = defineEnv(
        {
          MIN: port(),
          HTTP: port(),
          MAX: port(),
        },
        {
          MIN: "1",
          HTTP: "8080",
          MAX: "65535",
        },
      );

      expect(env.MIN).toBe(1);
      expect(env.HTTP).toBe(8080);
      expect(env.MAX).toBe(65535);
    });

    it("should reject out of range numbers and non-integers", () => {
      expect(() => defineEnv({ P: port() }, { P: "0" })).toThrow();
      expect(() => defineEnv({ P: port() }, { P: "-1" })).toThrow();
      expect(() => defineEnv({ P: port() }, { P: "65536" })).toThrow();
      expect(() => defineEnv({ P: port() }, { P: "70000" })).toThrow();
      expect(() => defineEnv({ P: port() }, { P: "3000.5" })).toThrow();
      expect(() => defineEnv({ P: port() }, { P: "8080abc" })).toThrow();
      expect(() => defineEnv({ P: port() }, { P: "" })).toThrow();
      expect(() => defineEnv({ P: port() }, { P: "   " })).toThrow();
    });
  });

  describe("url()", () => {
    it("should parse valid URLs", () => {
      const env = defineEnv(
        {
          WEB: url(),
          API: url(),
          DB: url(),
        },
        {
          WEB: "https://example.com",
          API: "http://localhost:3000/v1/health",
          DB: "postgres://user:pass@db.example.internal:5432/production",
        },
      );

      expect(env.WEB).toBe("https://example.com");
      expect(env.API).toBe("http://localhost:3000/v1/health");
      expect(env.DB).toBe("postgres://user:pass@db.example.internal:5432/production");
    });

    it("should reject malformed URLs, empty strings, and whitespace", () => {
      expect(() => defineEnv({ U: url() }, { U: "" })).toThrow();
      expect(() => defineEnv({ U: url() }, { U: "   " })).toThrow();
      expect(() => defineEnv({ U: url() }, { U: "not-a-valid-url" })).toThrow();
      expect(() => defineEnv({ U: url() }, { U: "/relative/path" })).toThrow();
    });
  });

  describe("oneOf()", () => {
    it("should validate allowed enumeration options", () => {
      const env = defineEnv(
        {
          STAGE: oneOf(["staging", "production"] as const),
        },
        {
          STAGE: "production",
        },
      );

      expect(env.STAGE).toBe("production");
    });

    it("should throw error if input is not in allowed list", () => {
      expect(() =>
        defineEnv(
          {
            STAGE: oneOf(["staging", "production"] as const),
          },
          {
            STAGE: "development",
          },
        ),
      ).toThrow();
    });

    it("should reject empty values or whitespace for oneOf", () => {
      expect(() =>
        defineEnv(
          {
            STAGE: oneOf(["staging", "production"] as const),
          },
          {
            STAGE: "",
          },
        ),
      ).toThrow();

      expect(() =>
        defineEnv(
          {
            STAGE: oneOf(["staging", "production"] as const),
          },
          {
            STAGE: "   ",
          },
        ),
      ).toThrow();
    });

    it("should throw TypeError when oneOf is initialized with empty array", () => {
      expect(() => oneOf([] as unknown as readonly string[])).toThrow(TypeError);
    });
  });
});
