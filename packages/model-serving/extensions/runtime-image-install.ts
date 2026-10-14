import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import type { ActionProperties, RouteExtension } from '@odh-dashboard/plugin-core/extension-points';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { PlaceholderRuntimeImageActionProps } from '../src/components/runtimeImageInstall/placeholder-types';

const required = [SupportedArea.RUNTIME_CATALOG, SupportedArea.MODEL_SERVING, 'ADMIN_USER'];

type RuntimeImageInstallActionExtension = Extension<
  'core.action',
  Omit<ActionProperties, 'component'> & {
    component: ComponentCodeRef<PlaceholderRuntimeImageActionProps>;
  }
>;

// TODO this extension uses the placeholder group used by the temporary extension point on the general settings page.
// See packages/model-serving/src/components/settings/GeneralSettingsTab.tsx
// That will be removed in https://issues.redhat.com/browse/RHOAIENG-96642 when the real runtime image details action extension point exists.
const extensions: (RuntimeImageInstallActionExtension | RouteExtension)[] = [
  {
    type: 'core.action',
    flags: { required },
    properties: {
      id: 'runtime-image-install',
      label: 'Install Runtime image',
      group: 'model-runtime-library-placeholder.runtime-image/details-action',
      component: () => import('../src/components/runtimeImageInstall/RuntimeImageInstallAction'),
    },
  },
  {
    type: 'app.route',
    flags: { required },
    properties: {
      // TODO this path is also a placeholder and will be replaced in https://issues.redhat.com/browse/RHOAIENG-96641.
      path: '/settings/model-resources-operations/model-deployment-settings/placeholder-runtime-library-details-page/install',
      component: () => import('../src/components/runtimeImageInstall/RuntimeImageInstallPage'),
    },
  },
];

export default extensions;
