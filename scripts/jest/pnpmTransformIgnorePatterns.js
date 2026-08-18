/**
 * pnpm-safe Jest transformIgnorePatterns for ESM deps under .pnpm store paths.
 */
const PNPM_ESM_ALLOW =
  '(?:\\.pnpm/[^/]+/node_modules/(?:lodash-es|yaml|@openshift|uuid|@patternfly|d3|delaunator|robust-predicates|internmap|monaco-editor|mod-arch-core|mod-arch-shared|mod-arch-kubeflow)|lodash-es|yaml|@openshift|uuid|@patternfly|d3|delaunator|robust-predicates|internmap|monaco-editor|mod-arch-core|mod-arch-shared|mod-arch-kubeflow|mod-arch-*)';

const pnpmTransformIgnorePatterns = [`node_modules/(?!${PNPM_ESM_ALLOW})`];

module.exports = {
  PNPM_ESM_ALLOW,
  pnpmTransformIgnorePatterns,
};
