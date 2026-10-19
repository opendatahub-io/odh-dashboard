import type { Extension } from '@openshift/dynamic-plugin-sdk';
import extensions0 from '@odh-dashboard/observability/extensions/static';
import extensions1 from '@odh-dashboard/maas/extensions/static';
import extensions2 from '@odh-dashboard/gen-ai/extensions/static';
import extensions3 from './extensions';

const pluginExtensions: Record<string, Extension[]> = {
  '@odh-dashboard/observability': extensions0,
  '@odh-dashboard/maas': extensions1,
  '@odh-dashboard/gen-ai': extensions2,
  'maas-portal': extensions3,
};

export const featureFlags: Record<string, boolean> = {
  observabilityDashboard: true,
  modelAsService: true,
  mySubscriptions: true,
  grid: false,
  genAiStudio: true,
  'plugin-gen-ai': true,
  chatPlayground: true,
};

export default pluginExtensions;
