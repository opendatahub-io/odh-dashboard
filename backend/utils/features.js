const fs = require('fs');
const path = require('path');

const getComponentFeatureFlags = () => {
  const normalizedPath = path.join(__dirname, '../../data/features.json');
  try {
    return JSON.parse(fs.readFileSync(normalizedPath, 'utf8'));
  } catch {
    return {};
  }
};

module.exports = { getComponentFeatureFlags };
