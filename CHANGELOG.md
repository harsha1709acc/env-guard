# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-22

### Added

- `defineEnv` — validates environment variables against a typed schema at startup, collects all errors before throwing, and returns a frozen, type-inferred object.
- `str` — string field builder with optional min/max length validation.
- `num` — number field builder that coerces strings to finite numbers.
- `bool` — boolean field builder that accepts `"true"` / `"1"` / `"false"` / `"0"`.
- `port` — integer field builder that validates values in the range 1–65535.
- `url` — URL field builder that validates via the WHATWG `URL` constructor.
- `oneOf` — enumeration field builder constrained to a fixed set of string values, with full literal-type inference.
- `FieldBuilder` modifiers: `.default(value)`, `.optional()`, `.secret()`, `.describe(text)`.
- `EnvValidationError` — aggregated error class with a structured `errors` array.
- Full TypeScript type inference: required, optional, and defaulted fields all infer their correct types.
- Zero runtime dependencies.
- 100 % statement and function coverage, 97.72 % branch coverage.

[Unreleased]: https://github.com/harsha345/env-guard/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/harsha345/env-guard/releases/tag/v0.1.0
