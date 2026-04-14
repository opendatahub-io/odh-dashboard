import path from 'path';
import baseConfig from '@odh-dashboard/jest-config';

const upstreamNodeModules = path.resolve(__dirname, 'upstream/frontend/node_modules');

export default {
  ...baseConfig,
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^mod-arch-core$': path.join(upstreamNodeModules, 'mod-arch-core'),
    '^mod-arch-shared$': path.join(upstreamNodeModules, 'mod-arch-shared'),
    '^mod-arch-kubeflow$': path.join(upstreamNodeModules, 'mod-arch-kubeflow'),
  },
  // Resolve from both root node_modules (first, for React singletons) and upstream
  moduleDirectories: ['node_modules', path.join(upstreamNodeModules)],
  // Include mod-arch packages in the transform (they use ESM)
  transformIgnorePatterns: [
    'node_modules/(?!yaml|@openshift|lodash-es|uuid|@patternfly|d3|delaunator|robust-predicates|internmap|monaco-editor|mod-arch-core|mod-arch-shared|mod-arch-kubeflow)',
  ],
  // Only run tests from src/ and extensions (not upstream/)
  testPathIgnorePatterns: ['/node_modules/', '/upstream/'],
};
