import { EnvValidationError } from "./errors.js";
import type { EnvErrorItem } from "./errors.js";
import type { EnvSchema, InferEnv } from "./types.js";

/**
 * Validates environment variables against a defined schema at application startup.
 * Coerces types, assigns default values, masks secret failures, and freezes the result.
 *
 * @param schema Schema mapping variable names to field builders.
 * @param source Environment variable dictionary (defaults to `process.env`).
 * @returns An immutable, frozen object with inferred TypeScript types.
 * @throws {EnvValidationError} If any environment variable is missing or invalid.
 *
 * @example
 * ```ts
 * import { defineEnv, str, port, bool } from "env-guard";
 *
 * export const env = defineEnv({
 *   NODE_ENV: str().default("development"),
 *   PORT: port().default(3000),
 *   DEBUG: bool().default(false),
 * });
 * ```
 */
export function defineEnv<S extends EnvSchema>(
  schema: S,
  source: Record<string, string | undefined> = typeof process !== "undefined" && process?.env
    ? process.env
    : {},
): Readonly<InferEnv<S>> {
  const result: Record<string, any> = {};
  const errors: EnvErrorItem[] = [];

  for (const [key, builder] of Object.entries(schema)) {
    const rawValue = source[key];

    if (rawValue === undefined) {
      if (builder.hasDefault) {
        result[key] = builder.defaultValue;
      } else if (!builder.isRequired) {
        result[key] = undefined;
      } else {
        errors.push({
          key,
          expectedType: builder.expectedType,
          receivedValue: undefined,
          message: builder.description
            ? `Missing required environment variable "${key}" (${builder.description})`
            : `Missing required environment variable "${key}"`,
          isSecret: builder.isSecret,
        });
      }
    } else {
      try {
        result[key] = builder._parse(rawValue);
      } catch (err) {
        const errorDetail = err instanceof Error ? err.message : String(err);
        const receivedValue = builder.isSecret ? "[REDACTED]" : rawValue;
        errors.push({
          key,
          expectedType: builder.expectedType,
          receivedValue,
          message: builder.description
            ? `Invalid environment variable "${key}" (${builder.description}): ${errorDetail}`
            : `Invalid environment variable "${key}": ${errorDetail}`,
          isSecret: builder.isSecret,
        });
      }
    }
  }

  if (errors.length > 0) {
    throw new EnvValidationError(errors);
  }

  return Object.freeze(result) as Readonly<InferEnv<S>>;
}
