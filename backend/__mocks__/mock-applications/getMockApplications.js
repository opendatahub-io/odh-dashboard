const fs = require('fs');
const path = require('path');
const jsYaml = require('js-yaml');

const yamlRegExp = /\.ya?ml$/;

const getMockApplications = () => {
  const normalizedPath = path.join(__dirname, '');
  const allMockApplications = [];
  fs.readdirSync(normalizedPath).forEach(function (file) {
    if (yamlRegExp.test(file)) {
      try {
        const doc = jsYaml.load(fs.readFileSync(path.join(normalizedPath, file), 'utf8'));
        allMockApplications.push(doc);
      } catch (e) {
        console.error(`Error loading mock applications ${file}: ${e}`);
      }
    }
  });
  return allMockApplications;
};

module.exports = getMockApplications;
