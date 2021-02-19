const fs = require('fs');
const path = require('path');
const jsYaml = require('js-yaml');

const yamlRegExp = /\.ya?ml$/;

const getQuickStarts = () => {
  const normalizedPath = path.join(__dirname, '');
  const allQuickStarts = [];
  fs.readdirSync(normalizedPath).forEach(function (file) {
    if (yamlRegExp.test(file)) {
      try {
        const doc = jsYaml.load(fs.readFileSync(path.join(__dirname, file), 'utf8'));
        allQuickStarts.push(doc);
      } catch (e) {
        console.error(`Error loading quick start ${file}: ${e}`);
      }
    }
  });
  return allQuickStarts;
};

module.exports = getQuickStarts;
