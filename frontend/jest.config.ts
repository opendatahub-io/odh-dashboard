import config from '@odh-dashboard/jest-config';

export default {
  ...config,
  clearMocks: true,
  transformIgnorePatterns: [
    'node_modules/(?!yaml|@openshift|lodash-es|uuid|@patternfly|d3|delaunator|robust-predicates|internmap|monaco-editor|mod-arch-core)',
  ],
};
