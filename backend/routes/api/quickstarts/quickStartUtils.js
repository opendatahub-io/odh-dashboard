const getMockQuickStarts = require('../../../__mocks__/mock-quickstarts/getMockQuickStarts');

// TODO: Retrieve from the correct group for dashboard quickstarts
const quickStartsGroup = 'console.openshift.io';
const quickStartsVersion = 'v1';
const quickStartsPlural = 'consolequickstarts';

const getInstalledQuickStarts = async (fastify) => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const installedQuickStarts = [];
  try {
    const res = await customObjectsApi.listClusterCustomObject(
      quickStartsGroup,
      quickStartsVersion,
      quickStartsPlural,
    );
    installedQuickStarts.push(...res.body.items);
  } catch (e) {
    fastify.log.error(e, 'failed to get quickstarts');
  }

  // TODO: Remove MOCK quick starts when we get the correct quick starts from OpenShift
  installedQuickStarts.push(...getMockQuickStarts());

  return installedQuickStarts;
};

module.exports = { getInstalledQuickStarts };
