import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import type { ActionProperties, RouteExtension } from '@odh-dashboard/plugin-core/extension-points';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { RuntimeImageInstallActionProps } from '@mf/modelRegistry/extension-points';

const required = [SupportedArea.MODEL_SERVING, 'ADMIN_USER'];

type RuntimeImageInstallActionExtension = Extension<
  'core.action',
  Omit<ActionProperties, 'component'> & {
    component: ComponentCodeRef<RuntimeImageInstallActionProps>;
  }
>;

const extensions: (RuntimeImageInstallActionExtension | RouteExtension)[] = [
  {
    type: 'core.action',
    flags: { required },
    properties: {
      id: 'runtime-image-install',
      label: 'Install Runtime image',
      group: 'runtime-catalog.runtime-image/details-action',
      component: () => import('../src/components/runtimeImageInstall/RuntimeImageInstallAction'),
    },
  },
  {
    type: 'app.route',
    flags: { required },
    properties: {
      path: '/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog/:runtimeId/install',
      component: () => import('../src/components/runtimeImageInstall/RuntimeImageInstallPage'),
    },
  },
];

export default extensions;
