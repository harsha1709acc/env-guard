# env-guard

> Validate environment variables against a typed schema at startup — with clear error messages and full TypeScript type inference.

[![CI](https://github.com/harsha345/env-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/harsha345/env-guard/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@harsha345/env-guard)](https://www.npmjs.com/package/@harsha345/env-guard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

- ✅ Validates all variables at once and reports every error in a single throw
- 🔒 Masks secret values in error messages (`[REDACTED]`)
- 🧊 Returns a frozen, fully typed object — no `string | undefined` everywhere
- 📦 Zero runtime dependencies
- 🟦 TypeScript-first (CJS + ESM dual build)

---

## Installation

```bash
npm install @harsha345/env-guard
```

```bash
yarn add @harsha345/env-guard
```

```bash
pnpm add @harsha345/env-guard
```

> **Requires Node.js ≥ 18**

---

## Quick Start

Create an `env.ts` (or `env.js`) file at the root of your project and call `defineEnv` once at startup:

```ts
import { defineEnv, str, num, bool, port, url, oneOf } from "@harsha345/env-guard";

export const env = defineEnv({
  NODE_ENV: oneOf(["development", "production", "test"] as const).default("development"),
  PORT: port().default(3000),
  HOST: str().default("0.0.0.0"),
  DEBUG: bool().default(false),
  DATABASE_URL: url().secret(),
  API_KEY: str().secret().describe("Third-party API key"),
  LOG_LEVEL: oneOf(["debug", "info", "warn", "error"] as const).optional(),
  MAX_RETRIES: num().optional(),
});

// env is fully typed and frozen — TypeScript knows the exact types:
// env.PORT        → number
// env.NODE_ENV    → "development" | "production" | "test"
// env.LOG_LEVEL   → "debug" | "info" | "warn" | "error" | undefined
// env.MAX_RETRIES → number | undefined
```

If any required variables are missing or invalid, `defineEnv` **throws a single `EnvValidationError`** that lists every problem at once:

```
EnvValidationError: Environment validation failed with 2 errors:
  - DATABASE_URL: Expected valid URL, received undefined
  - API_KEY: Expected string, received undefined
```

---

## API Reference

### `defineEnv(schema, source?)`

Validates environment variables against a schema and returns a frozen, type-inferred object.

```ts
function defineEnv<S extends EnvSchema>(
  schema: S,
  source?: Record<string, string | undefined>, // defaults to process.env
): Readonly<InferEnv<S>>;
```

| Parameter | Type                                  | Description                                        |
| --------- | ------------------------------------- | -------------------------------------------------- |
| `schema`  | `EnvSchema`                           | An object mapping variable names to field builders |
| `source`  | `Record<string, string \| undefined>` | Override the environment source (useful in tests)  |

**Throws** `EnvValidationError` if one or more variables are missing or invalid. All errors are collected before throwing — not just the first one.

---

### Field Builders

Each builder is a factory function that returns a `FieldBuilder`. Every builder supports the [common modifiers](#field-builder-modifiers) described below.

---

#### `str()`

Accepts any non-empty string value.

```ts
str(): FieldBuilder<string>
```

```ts
// Required string
API_SECRET: str();

// With a default
APP_NAME: str().default("my-app");

// Optional — resolves to string | undefined
OPTIONAL_TAG: str().optional();
```

---

#### `num()`

Coerces the raw string to a finite JavaScript number. Rejects `NaN`, `Infinity`, and non-numeric strings.

```ts
num(): FieldBuilder<number>
```

```ts
// Required number
TIMEOUT_MS: num();

// With a default
MAX_CONNECTIONS: num().default(10);

// Optional — resolves to number | undefined
CACHE_TTL: num().optional();
```

---

#### `bool()`

Accepts `"true"` or `"1"` → `true`; `"false"` or `"0"` → `false`. All other values throw.

```ts
bool(): FieldBuilder<boolean>
```

```ts
// Required boolean
ENABLE_METRICS: bool();

// With a default
DEBUG: bool().default(false);

// Optional — resolves to boolean | undefined
VERBOSE: bool().optional();
```

---

#### `port()`

Coerces to an integer and validates it is in the range **1 – 65535**.

```ts
port(): FieldBuilder<number>
```

```ts
// Required port
PORT: port();

// With a default
HTTP_PORT: port().default(3000);
```

---

#### `url()`

Validates the value using the WHATWG `URL` constructor. Must be a fully-formed URL (e.g. `https://example.com`).

```ts
url(): FieldBuilder<string>
```

```ts
// Required URL
DATABASE_URL: url();

// Secret — value is masked as [REDACTED] in error messages
DATABASE_URL: url().secret();

// Optional
PROXY_URL: url().optional();
```

---

#### `oneOf(values)`

Restricts the variable to one of a fixed list of string values. TypeScript infers the union type from the literal array.

```ts
function oneOf<const U extends readonly string[]>(values: U): FieldBuilder<U[number]>;
```

```ts
// Inferred as "development" | "production" | "test"
NODE_ENV: oneOf(["development", "production", "test"] as const);

// With a default — still fully typed
NODE_ENV: oneOf(["development", "production", "test"] as const).default("development");

// Optional — resolves to "small" | "medium" | "large" | undefined
PLAN_TIER: oneOf(["small", "medium", "large"] as const).optional();
```

> **Note:** Use `as const` to preserve the literal string types.

---

### Field Builder Modifiers

Every builder returned by `str()`, `num()`, `bool()`, `port()`, `url()`, and `oneOf()` supports the following chainable methods:

#### `.default(value)`

Sets a fallback value used when the environment variable is absent. The field remains **required** at the type level but will never be `undefined` at runtime.

```ts
PORT: port().default(3000);
// → type: number  (never undefined, even if PORT is unset)
```

#### `.optional()`

Marks the variable as optional. If it is absent, the resolved value is `undefined`. If it is present, it must still parse successfully.

```ts
LOG_LEVEL: str().optional();
// → type: string | undefined
```

#### `.secret()`

Marks the variable as a secret. When validation fails, the received value is replaced with `[REDACTED]` in the error output instead of being logged in plain text.

```ts
API_KEY: str().secret();
DATABASE_URL: url().secret();
```

#### `.describe(text)`

Attaches a human-readable description that is included in error messages to give more context about the variable's purpose.

```ts
API_KEY: str().secret().describe("Primary API key for the payment provider");
// Error: Missing required environment variable "API_KEY" (Primary API key for the payment provider)
```

---

### `EnvValidationError`

Thrown by `defineEnv` when validation fails. Contains a structured `errors` array so you can inspect individual failures programmatically.

```ts
import { defineEnv, str, EnvValidationError } from "@harsha345/env-guard";

try {
  const env = defineEnv({ API_KEY: str() });
} catch (err) {
  if (err instanceof EnvValidationError) {
    console.error(err.message); // formatted summary
    console.error(err.errors); // EnvErrorItem[]
    // err.errors[0] → { key, expectedType, receivedValue, message, isSecret }
  }
}
```

---

## Examples

### Basic server config

```ts
import { defineEnv, str, num, bool, port, url, oneOf } from "@harsha345/env-guard";

export const env = defineEnv({
  NODE_ENV: oneOf(["development", "production", "test"] as const).default("development"),
  PORT: port().default(3000),
  DATABASE_URL: url().secret(),
  REDIS_URL: url().optional(),
  DEBUG: bool().default(false),
});
```

### Using `.default`

```ts
export const env = defineEnv({
  // Falls back to 3000 if PORT is not set
  PORT: port().default(3000),

  // Falls back to "info" if LOG_LEVEL is not set
  LOG_LEVEL: oneOf(["debug", "info", "warn", "error"] as const).default("info"),

  // Falls back to false
  ENABLE_CACHING: bool().default(false),
});
```

### Using `.optional`

```ts
export const env = defineEnv({
  // These may or may not be present — TypeScript knows they can be undefined
  SENTRY_DSN: url().optional(),
  TRACE_ID: str().optional(),
  MAX_RETRIES: num().optional(),
});

// Safe to access — TypeScript forces you to handle undefined
if (env.SENTRY_DSN) {
  initSentry(env.SENTRY_DSN);
}
```

### Using `.secret`

```ts
export const env = defineEnv({
  // If DATABASE_URL or STRIPE_SECRET_KEY are missing or invalid,
  // their values appear as [REDACTED] in error messages — safe to log.
  DATABASE_URL: url().secret(),
  STRIPE_SECRET_KEY: str().secret().describe("Stripe live secret key"),
  JWT_SECRET: str().secret(),
});
```

### Testing with a custom source

```ts
import { defineEnv, str, port } from "@harsha345/env-guard";

const env = defineEnv(
  { PORT: port(), APP_NAME: str() },
  { PORT: "4000", APP_NAME: "test-app" }, // ← inject test values directly
);

console.log(env.PORT); // 4000  (number)
console.log(env.APP_NAME); // "test-app"
```

### Catching validation errors

```ts
import { defineEnv, str, url, EnvValidationError } from "@harsha345/env-guard";

try {
  const env = defineEnv({
    DATABASE_URL: url().secret(),
    APP_SECRET: str().secret(),
  });
} catch (err) {
  if (err instanceof EnvValidationError) {
    // Safe to log — secrets are already masked
    console.error(err.message);
    process.exit(1);
  }
}
```

---

## License

MIT © 2026 Harshavardhan — see [LICENSE](./LICENSE) for details.
