// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import type { Extension } from '@openshift/dynamic-plugin-sdk';

const extensions: Extension[] = [
  {
    type: 'model-catalog.deployment/navigate-wizard',
    properties: {
      useNavigateToDeploymentWizardWithData: () =>
        import('../modelRegistry/useNavigateToDeploymentWizardWithData').then(
          (m) => m.useNavigateToDeploymentWizardWithData,
        ),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
];

export default extensions;
