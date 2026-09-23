/**
 * ESM dependencies Jest must transform in both flat and pnpm node_modules layouts.
 * Scoped entries intentionally allow every package in that scope, matching the
 * behavior of the pre-pnpm Jest configurations.
 */
const PNPM_ESM_PACKAGES =
  '(?:lodash-es|yaml|@openshift/[^/]+|uuid|@patternfly/[^/]+|d3(?:-[^/]+)?|delaunator|robust-predicates|internmap|monaco-editor|mod-arch-[^/]+|echarts|zrender|@perses-dev/[^/]+)';

const PNPM_ESM_ALLOW = `(?:\\.pnpm/[^/]+/node_modules/)?${PNPM_ESM_PACKAGES}(?:/|$)`;

const pnpmTransformIgnorePatterns = [`node_modules/(?!${PNPM_ESM_ALLOW})`];

module.exports = {
  PNPM_ESM_ALLOW,
  pnpmTransformIgnorePatterns,
};
