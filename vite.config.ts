/** @format */

import { builtinModules } from 'module';
import { resolve } from 'path';

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const nodeBuiltins = [...builtinModules, ...builtinModules.map(m => `node:${m}`)];

export default defineConfig(({ mode }) => {
  if (mode === 'cli') {
    return {
      ssr: {
        target: 'node',
        noExternal: true,
      },
      build: {
        ssr: resolve(__dirname, 'src/cli/index.ts'),
        outDir: 'dist/cli',
        target: 'node20',
        minify: false,
        emptyOutDir: true,
        cssCodeSplit: false,
        rollupOptions: {
          input: resolve(__dirname, 'src/cli/index.ts'),
          external: nodeBuiltins,
          output: {
            format: 'cjs',
            entryFileNames: 'cli.js',
            banner: '#!/usr/bin/env node',
          },
        },
      },
    };
  }

  return {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        formats: ['es', 'cjs'],
        fileName: 'index',
      },
      minify: true,
    },
    plugins: [dts()],
  };
});
