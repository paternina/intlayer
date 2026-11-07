# Changelog

## 1.0.0

First stable release. The 0.7 public API is unchanged and now covered by semantic versioning.

### Fixed

- `select` no longer throws `TypeError` when the value is `constructor`, `toString`, `__proto__` and similar.
- Overlapping `setLocale` calls: the most recent call wins, regardless of loader completion order.
- A throwing subscriber no longer prevents other subscribers from running.
- `mergeMessages` ignores `__proto__`, `constructor` and `prototype` keys.
- `getFallbackLocale()` returns a copy of the internal list.

### Added

- ICU apostrophe quoting: `''` renders `'`, and `'{'` / `'}'` (and `'#'` inside plurals) render literally. Backslash escapes keep working.
- `offset:N` in `plural` blocks, including validator support.

### Changed (behaviour)

- A malformed plural/select block renders its source text instead of an empty string.
- Parsed-message and path-resolver caches hold 10,000 entries (was 1,000), removing the slowdown for catalogs with more than 1,000 distinct messages (about 2x faster when cycling 5,000 messages in a local benchmark).
- An apostrophe directly before `{` or `}` now opens a quoted section, as in ICU. Write `l''{name}` for a literal apostrophe before a placeholder.

- `#` in plural branches is formatted with the locale's number format (`1,500`, not `1500`).
- After `setLocale('es-MX')`, the base language (`es`) is tried before the fallback list.
- An empty, non-string or malformed `locale` throws in `createI18n` and rejects in `setLocale`.

### Packaging

- Added `LICENSE` (MIT), `engines` (`node >=18`), `publishConfig.access`, `types` conditions in `exports`, `unpkg`/`jsdelivr` fields, and a `prepublishOnly` gate (typecheck, tests, build, dist smoke test).
- Removed the `browser` field, which pointed bundlers at the IIFE build.
- Added a CI workflow and `npm run test:dist`, a smoke test of the built ESM, CJS and IIFE artifacts.

### Documentation

- README synced with the full API. Added supported environments, error behaviour, known limitations and migration notes to `docs/en.md` and `docs/es.md`.

## 0.7.0

ICU argument formatting, durations and message validation.
