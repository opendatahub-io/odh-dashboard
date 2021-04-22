const fs = require('fs');
const path = require('path');
const jsYaml = require('js-yaml');
const constants = require('../../../utils/constants');
const features = require('../../../utils/features');
const componentUtils = require('../components/componentUtils');

const getDocs = () => {
  const normalizedPath = path.join(__dirname, '../../../../data/docs');
  const docs = [];
  const featureFlags = features.getComponentFeatureFlags();
  const appDefs = componentUtils.getApplicationDefs();

  fs.readdirSync(normalizedPath).forEach((file) => {
    if (constants.yamlRegExp.test(file)) {
      try {
        const doc = jsYaml.load(fs.readFileSync(path.join(normalizedPath, file), 'utf8'));
        if (doc.spec.featureFlag) {
          if (featureFlags[doc.spec.featureFlag]) {
            docs.push(doc);
          }
          return;
        }
        if (!doc.spec.appName || appDefs.find((def) => def.metadata.name === doc.spec.appName)) {
          docs.push(doc);
        }
      } catch (e) {
        console.error(`Error loading doc ${file}: ${e}`);
      }
    }
  });
  return docs;
};

module.exports = { getDocs };
