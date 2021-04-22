const fs = require('fs');
const path = require('path');
const jsYaml = require('js-yaml');
const constants = require('../../../utils/constants');

// TODO: Retrieve from the correct group for dashboard quick starts
const quickStartsGroup = 'odh.openshift.io';
const quickStartsVersion = 'v1';
const quickStartsPlural = 'consolequickstarts';

const getInstalledQuickStarts = async (fastify) => {
  const installedQuickStarts = [];

  // TODO: Fetch quick starts from kube once they are installed by operators
  // const customObjectsApi = fastify.kube.customObjectsApi;
  // try {
  //   const res = await customObjectsApi.listClusterCustomObject(
  //     quickStartsGroup,
  //     quickStartsVersion,
  //     quickStartsPlural,
  //   );
  //   installedQuickStarts.push(...res.body.items);
  // } catch (e) {
  //   fastify.log.error(e, 'failed to get quickstarts');
  // }

  // TODO: Remove local quick starts when we get the correct quick starts from OpenShift
  const normalizedPath = path.join(__dirname, '../../../../data/quickstarts');
  fs.readdirSync(normalizedPath).forEach((file) => {
    if (constants.yamlRegExp.test(file)) {
      try {
        const doc = jsYaml.load(fs.readFileSync(path.join(normalizedPath, file), 'utf8'));
        installedQuickStarts.push(doc);
      } catch (e) {
        console.error(`Error loading quick start ${file}: ${e}`);
      }
    }
  });

  return installedQuickStarts;
};

module.exports = { getInstalledQuickStarts };
