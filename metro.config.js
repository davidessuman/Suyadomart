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

module.exports = config;
