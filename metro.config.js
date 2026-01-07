const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resolve assets from react-navigation
config.resolver.assetExts.push(
  // Adds support for `.db` files for SQLite databases
  'db',
  // Image formats that react-navigation needs
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp'
);

config.resolver = {
  ...(config.resolver || {}),
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules || {}),
    tslib: path.resolve(__dirname, 'tslib-shim.js'),
  },
};

module.exports = config;
