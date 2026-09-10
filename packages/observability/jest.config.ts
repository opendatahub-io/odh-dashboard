import path from 'path';
import baseConfig from '@odh-dashboard/jest-config';

const repoRoot = path.join(__dirname, '../..');
const uiCoreSrc = path.join(__dirname, '../ui-core/src');

export default {
  ...baseConfig,
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    // Single React instance when testing components that use @odh-dashboard/ui-core
    '^react$': path.join(repoRoot, 'node_modules/react'),
    '^react-dom$': path.join(repoRoot, 'node_modules/react-dom'),
    '^@odh-dashboard/ui-core/(.*)$': `${uiCoreSrc}/$1`,
    '^@odh-dashboard/ui-core$': `${uiCoreSrc}/index.ts`,
  },
};
