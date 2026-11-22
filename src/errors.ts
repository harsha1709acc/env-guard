/**
 * Detailed error item describing a single invalid or missing environment variable.
 */
export interface EnvErrorItem {
  /** The name of the environment variable. */
  key: string;
  /** The expected type or format for the variable. */
  expectedType: string;
  /** The value received from the environment, masked if the variable is marked as secret. */
  receivedValue: unknown;
  /** Descriptive message regarding the validation failure. */
  message: string;
  /** Whether this variable represents secret credentials. */
  isSecret?: boolean;
}

/**
 * Error thrown when one or more environment variables fail validation.
 * Aggregates all detected errors instead of halting on the first failure.
 */
export class EnvValidationError extends Error {
  /** List of all validation failures detected. */
  readonly errors: readonly EnvErrorItem[];

  constructor(errors: EnvErrorItem[]) {
    const errorCount = errors.length;
    const formattedErrors = errors
      .map((err) => {
        const displayValue =
          err.isSecret && err.receivedValue !== undefined
            ? "[REDACTED]"
            : typeof err.receivedValue === "string"
              ? `"${err.receivedValue}"`
              : String(err.receivedValue);
        return `  - ${err.key}: Expected ${err.expectedType}, received ${displayValue}`;
      })
      .join("\n");

    const message = `Environment validation failed with ${errorCount} error${
      errorCount === 1 ? "" : "s"
    }:\n${formattedErrors}`;

    super(message);
    this.name = "EnvValidationError";
    this.errors = Object.freeze([...errors]);

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
