import config from '@odh-dashboard/jest-config';

export default {
  ...config,
  moduleNameMapper: {
    ...config.moduleNameMapper,
    // Match the host's singleton SDK context when mounting plugin-core from this package.
    '^@openshift/dynamic-plugin-sdk$': require.resolve('@openshift/dynamic-plugin-sdk'),
  },
};
