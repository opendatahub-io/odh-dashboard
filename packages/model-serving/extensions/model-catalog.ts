import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { Extension } from '@openshift/dynamic-plugin-sdk';

const extensions: Extension[] = [
  {
    type: 'core.action',
    flags: {
      required: [SupportedArea.MODEL_SERVING, SupportedArea.MODEL_CATALOG],
    },
    properties: {
      id: 'deploy-catalog-model',
      label: 'Deploy model',
      group: 'model-catalog.deploy',
      component: () => import('../modelRegistry/DeployPrefillAction'),
    },
  },
];

export default extensions;
