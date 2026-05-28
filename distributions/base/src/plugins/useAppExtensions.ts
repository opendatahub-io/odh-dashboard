import type { Extension } from '@openshift/dynamic-plugin-sdk';

// Static plugin extensions for this distribution.
// When the RHAI-I build profile is created, static plugin imports will be added here:
//   import modelServingExtensions from '@odh-dashboard/model-serving/extensions';
//   const pluginExtensions = { ...modelServingExtensions };
const pluginExtensions: Record<string, Extension[]> = {};

export const useAppExtensions = (): [Record<string, Extension[]>, boolean] => [
  pluginExtensions,
  true,
];
