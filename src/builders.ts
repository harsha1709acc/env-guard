import type { FieldBuilderOptions, FieldParser } from "./types.js";

/**
 * Builder class for configuring environment variable validation, coercion, and metadata.
 *
 * @template T The parsed value type.
 * @template IsRequired Whether the environment variable is required.
 * @template HasDefault Whether a default value is supplied.
 */
export class FieldBuilder<
  T,
  IsRequired extends boolean = true,
  HasDefault extends boolean = false,
> {
  // Phantom type markers for accurate TypeScript type inference
  declare readonly _type: T;
  declare readonly _isRequired: IsRequired;
  declare readonly _hasDefault: HasDefault;

  private readonly _parser: FieldParser<T>;
  private readonly _expectedType: string;
  private readonly _required: boolean;
  private readonly _defaultValue?: T;
  private readonly _hasDefaultValue: boolean;
  private readonly _isSecret: boolean;
  private readonly _description?: string;

  constructor(options: FieldBuilderOptions<T, IsRequired, HasDefault>) {
    this._parser = options.parser;
    this._expectedType = options.expectedType;
    this._required = options.required ?? true;
    this._defaultValue = options.defaultValue;
    this._hasDefaultValue = options.hasDefault ?? false;
    this._isSecret = options.secret ?? false;
    this._description = options.description;
  }

  /**
   * Set a fallback default value to use if the environment variable is missing.
   *
   * @param value The default value.
   * @returns A builder configured with this default value.
   */
  default(value: T): FieldBuilder<T, true, true> {
    return new FieldBuilder<T, true, true>({
      parser: this._parser,
      expectedType: this._expectedType,
      required: true,
      defaultValue: value,
      hasDefault: true,
      secret: this._isSecret,
      description: this._description,
    });
  }

  /**
   * Mark the environment variable as optional (may resolve to undefined).
   *
   * @returns An optional builder.
   */
  optional(): FieldBuilder<T, false, false> {
    return new FieldBuilder<T, false, false>({
      parser: this._parser,
      expectedType: this._expectedType,
      required: false,
      defaultValue: undefined,
      hasDefault: false,
      secret: this._isSecret,
      description: this._description,
    });
  }

  /**
   * Add a descriptive explanation of what this environment variable is used for.
   *
   * @param text Explanatory description.
   * @returns The builder instance with updated description.
   */
  describe(text: string): FieldBuilder<T, IsRequired, HasDefault> {
    return new FieldBuilder<T, IsRequired, HasDefault>({
      parser: this._parser,
      expectedType: this._expectedType,
      required: this._required as IsRequired,
      defaultValue: this._defaultValue,
      hasDefault: this._hasDefaultValue as HasDefault,
      secret: this._isSecret,
      description: text,
    });
  }

  /**
   * Mark this variable as secret so its received value is masked in logs and error messages.
   *
   * @returns The builder instance with secret masking enabled.
   */
  secret(): FieldBuilder<T, IsRequired, HasDefault> {
    return new FieldBuilder<T, IsRequired, HasDefault>({
      parser: this._parser,
      expectedType: this._expectedType,
      required: this._required as IsRequired,
      defaultValue: this._defaultValue,
      hasDefault: this._hasDefaultValue as HasDefault,
      secret: true,
      description: this._description,
    });
  }

  /**
   * Internal validator method used during schema evaluation.
   * @internal
   */
  _parse(raw: string): T {
    return this._parser(raw);
  }

  /** Expected type string representation. */
  get expectedType(): string {
    return this._expectedType;
  }

  /** Whether the field is required. */
  get isRequired(): boolean {
    return this._required;
  }

  /** Default value if configured. */
  get defaultValue(): T | undefined {
    return this._defaultValue;
  }

  /** Whether a default value is present. */
  get hasDefault(): boolean {
    return this._hasDefaultValue;
  }

  /** Whether this variable represents a secret. */
  get isSecret(): boolean {
    return this._isSecret;
  }

  /** Descriptive text if configured. */
  get description(): string | undefined {
    return this._description;
  }
}

/**
 * Creates a string field validator.
 *
 * @returns A string field builder.
 * @example
 * ```ts
 * const schema = {
 *   HOST: str().default("localhost"),
 * };
 * ```
 */
export function str(): FieldBuilder<string, true, false> {
  return new FieldBuilder<string, true, false>({
    expectedType: "string",
    parser: (val: string) => val,
  });
}

/**
 * Creates a number field validator that coerces numeric strings to numbers.
 * Rejects empty strings, whitespace-only strings, NaN, and non-finite values.
 *
 * @returns A number field builder.
 * @example
 * ```ts
 * const schema = {
 *   TIMEOUT: num().default(5000),
 * };
 * ```
 */
export function num(): FieldBuilder<number, true, false> {
  return new FieldBuilder<number, true, false>({
    expectedType: "number",
    parser: (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed === "") {
        throw new TypeError("Value is not a valid number");
      }
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        throw new TypeError("Value is not a valid finite number");
      }
      return parsed;
    },
  });
}

/**
 * Creates a boolean field validator.
 * Coerces "true" / "1" to true, and "false" / "0" to false (case-insensitive).
 *
 * @returns A boolean field builder.
 * @example
 * ```ts
 * const schema = {
 *   ENABLE_METRICS: bool().default(false),
 * };
 * ```
 */
export function bool(): FieldBuilder<boolean, true, false> {
  return new FieldBuilder<boolean, true, false>({
    expectedType: 'boolean ("true", "false", "1", "0")',
    parser: (raw: string) => {
      const normalized = raw.trim().toLowerCase();
      if (normalized === "true" || normalized === "1") {
        return true;
      }
      if (normalized === "false" || normalized === "0") {
        return false;
      }
      throw new TypeError('Value must be "true", "false", "1", or "0"');
    },
  });
}

/**
 * Creates a network port validator requiring an integer between 1 and 65535.
 *
 * @returns A port field builder.
 * @example
 * ```ts
 * const schema = {
 *   PORT: port().default(3000),
 * };
 * ```
 */
export function port(): FieldBuilder<number, true, false> {
  return new FieldBuilder<number, true, false>({
    expectedType: "port (integer 1-65535)",
    parser: (raw: string) => {
      const trimmed = raw.trim();
      if (!/^\d+$/.test(trimmed)) {
        throw new TypeError("Port must be a valid integer string");
      }
      const val = Number(trimmed);
      if (!Number.isInteger(val) || val < 1 || val > 65535) {
        throw new RangeError("Port must be between 1 and 65535");
      }
      return val;
    },
  });
}

/**
 * Creates a URL validator verifying standard URL syntax via the URL constructor.
 *
 * @returns A URL field builder resolving to the valid URL string.
 * @example
 * ```ts
 * const schema = {
 *   DATABASE_URL: url().secret(),
 * };
 * ```
 */
export function url(): FieldBuilder<string, true, false> {
  return new FieldBuilder<string, true, false>({
    expectedType: "valid URL",
    parser: (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed === "") {
        throw new TypeError("URL cannot be empty");
      }
      try {
        new URL(trimmed);
        return trimmed;
      } catch {
        throw new TypeError("Invalid URL format");
      }
    },
  });
}

/**
 * Creates an enumeration field validator allowing only specified values.
 *
 * @param values Array of allowed string options.
 * @returns An enumeration field builder.
 * @example
 * ```ts
 * const schema = {
 *   NODE_ENV: oneOf(["development", "production", "test"] as const),
 * };
 * ```
 */
export function oneOf<const U extends readonly string[]>(
  values: U,
): FieldBuilder<U[number], true, false> {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError("oneOf requires a non-empty array of allowed values");
  }

  const allowedSet = new Set<string>(values);
  const allowedString = values.map((v) => `"${v}"`).join(" | ");

  return new FieldBuilder<U[number], true, false>({
    expectedType: `one of (${allowedString})`,
    parser: (raw: string) => {
      const trimmed = raw.trim();
      if (!allowedSet.has(trimmed)) {
        throw new TypeError(`Value must be one of: ${allowedString}`);
      }
      return trimmed as U[number];
    },
  });
}
