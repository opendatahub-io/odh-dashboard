import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { AutofillConnectionButtonExtension } from '@mf/modelRegistry/extension-points';

const extensions: (AutofillConnectionButtonExtension | Extension)[] = [
  {
    type: 'model-registry.register/autofill-connection',
    properties: {
      component: () => import('./src/connection/AutofillConnectionButton'),
    },
  },
  {
    type: 'model-registry.admin/check',
    properties: {
      component: () => import('./upstream/frontend/src/odh/components/AdminCheck'),
    },
  },
];

export default extensions;
