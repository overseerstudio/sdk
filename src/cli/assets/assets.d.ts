/** @format */

// The CLI Vite build (`--mode cli`) inlines these assets as base64 data URLs
// (see `assetsInlineLimit` in vite.config.ts), so the default export is a string.
declare module '*.png' {
  const src: string;
  export default src;
}
