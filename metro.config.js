const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add 'wasm' to the asset extensions list so Metro treats WebAssembly files as static assets
// rather than trying to parse them as JavaScript modules.
config.resolver.assetExts.push('wasm');

module.exports = config;
