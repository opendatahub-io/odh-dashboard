// Mock for ansi-regex to avoid ES6 module issues
function ansiRegex(options = {}) {
  const { onlyFirst = false } = options;
  // Simple regex pattern for ANSI escape codes
  // eslint-disable-next-line no-control-regex
  const pattern = /\x1B\[[0-9;]*[a-zA-Z]/g;
  return onlyFirst ? pattern : pattern;
}

module.exports = ansiRegex;
module.exports.default = ansiRegex;
