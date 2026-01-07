// Shim to provide both default and named exports for tslib consumers that default-import it.
// This prevents runtime errors like "Cannot destructure property '__extends' of 'tslib.default' as it is undefined."
const tslib = require('tslib');

module.exports = {
  ...tslib,
  default: tslib,
};
