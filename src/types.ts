import type { FieldBuilder } from "./builders.js";

/**
 * Infer the runtime type for an individual field definition.
 */
export type InferField<F> =
  F extends FieldBuilder<infer T, infer IsReq, infer HasDef>
    ? HasDef extends true
      ? T
      : IsReq extends true
        ? T
        : T | undefined
    : never;

/**
 * Schema defining the expected environment variables.
 */
export type EnvSchema = Record<string, FieldBuilder<any, any, any>>;

/**
 * Infer the complete environment object type from a schema definition.
 */
export type InferEnv<S extends EnvSchema> = {
  readonly [K in keyof S]: InferField<S[K]>;
};

/**
 * Parser and validator function for converting raw strings into typed values.
 */
export type FieldParser<T> = (value: string) => T;

/**
 * Internal options configuration for a FieldBuilder instance.
 */
export interface FieldBuilderOptions<
  T,
  IsRequired extends boolean = true,
  HasDefault extends boolean = false,
> {
  parser: FieldParser<T>;
  expectedType: string;
  required?: IsRequired;
  defaultValue?: T;
  hasDefault?: HasDefault;
  secret?: boolean;
  description?: string;
}
