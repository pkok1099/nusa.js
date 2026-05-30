// rollup.config.js — Bundle ESM modules into single IIFE for browser
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'js/game.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife',
    name: 'Nusantara',
    // All import/export removed — works with plain <script> tag
  },
  plugins: [
    resolve(),
  ],
};
