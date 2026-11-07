# intlayer Examples

This directory contains a progressive set of examples demonstrating how to use intlayer from basic to advanced scenarios.

## Structure

- `basic/` - Introduction to core features: simple translation, interpolation, pluralization, has() check.
- `advanced/` - More sophisticated usage: fallback chains, async loading, locale switching, formatting, nested messages, locale-aware pluralization, inline ICU formatting, durations.
- `ssr/` - Server-side rendering examples with Express and React.
- `framework/` - Bindings for popular frameworks: React hook, Vue composable, Svelte store.
- `testing/` - Guidance on unit testing with intlayer (Jest and Vitest examples) and build-time message validation.

## Running Examples

The `basic/` and `advanced/` examples and `testing/16-validate-messages.js` are self-contained and run with plain Node.js after building the package. The `framework/`, `ssr/` and the other `testing/` examples are illustrative snippets: they need their own dependencies (React, Vue, Svelte, Express, JSX, Jest or Vitest) and are not meant to be run with `node` directly.

First, build the package:

```bash
npm run build
```

Then run any example, for example:

```bash
node examples/basic/1-hello.js
```

Note: The examples now import from the published package name `@paternina/intlayer`, which points to the built dist files after running `npm run build`.

## Progression

1. Start with the basic examples to understand the core API.
2. Move to advanced examples to learn about fallback chains, lazy loading, and formatting.
3. Explore SSR examples for server-side rendering patterns.
4. See framework-specific wrappers for easier integration.
5. Check testing example for mocking strategies.

Feel free to copy and adapt these examples for your own projects.
