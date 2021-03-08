const createError = require('http-errors');
const fs = require('fs');
const path = require('path');
const constants = require('../../../utils/constants');

const getGettingStartedDoc = (appName) => {
  const normalizedPath = path.join(__dirname, '../../../../data/getting-started');
  try {
    const markdown = fs.readFileSync(path.join(normalizedPath, `${appName}.md`), 'utf8');
    return {
      appName,
      markdown,
    };
  } catch (e) {
    const error = createError(500, 'failed to getting started file');
    error.explicitInternalServerError = true;
    error.error = 'failed to getting started file';
    error.message = `Unable to load getting started documentation for ${appName}.`;
    throw error;
    // throw new Error(`Unable to load getting started documentation for ${appName}.`);
  }
};

const getGettingStartedDocs = () => {
  const normalizedPath = path.join(__dirname, '../../../../data/getting-started');
  const gettingStartedDocs = [];
  fs.readdirSync(normalizedPath).forEach((file) => {
    if (constants.mdRegExp.test(file)) {
      try {
        const markdown = fs.readFileSync(path.join(normalizedPath, file), 'utf8');
        gettingStartedDocs.push({
          appName: file.replace('.md', ''),
          markdown,
        });
      } catch (e) {
        console.error(`Error loading getting started markdown ${file}: ${e}`);
      }
    }
  });
  return gettingStartedDocs;
};

module.exports = { getGettingStartedDoc, getGettingStartedDocs };
