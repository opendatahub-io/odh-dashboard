import type { AutofillConnectionButtonExtension } from '@mf/modelRegistry/extension-points';

const extensions: AutofillConnectionButtonExtension[] = [
  {
    type: 'model-registry.register/autofill-connection',
    properties: {
      component: () => import('./src/connection/AutofillConnectionButton'),
    },
  },
];

export default extensions;
