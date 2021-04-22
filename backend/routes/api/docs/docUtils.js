const fs = require('fs');
const path = require('path');
const jsYaml = require('js-yaml');
const constants = require('../../../utils/constants');

const getDocs = () => {
  const normalizedPath = path.join(__dirname, '../../../../data/docs');
  const docs = [];
  fs.readdirSync(normalizedPath).forEach((file) => {
    if (constants.yamlRegExp.test(file)) {
      try {
        const doc = jsYaml.load(fs.readFileSync(path.join(normalizedPath, file), 'utf8'));
        docs.push(doc);
      } catch (e) {
        console.error(`Error loading doc ${file}: ${e}`);
      }
    }
  });
  return docs;
};

module.exports = { getDocs };
