import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs', 'iife'],
  globalName: 'Intlayer',
  clean: true,
  dts: true,
  sourcemap: true,
  target: 'es2020',
  minify: false,
  splitting: false,
  treeshake: true,
  outDir: 'dist'
})
