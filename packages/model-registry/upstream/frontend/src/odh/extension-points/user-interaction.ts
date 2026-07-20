import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import { createExtensionGuard } from '@odh-dashboard/plugin-core/extension-points';
import type { UserInteractionAPI } from '~/concepts/userInteraction';

export type { UserInteractionAPI };

export type UserInteractionProviderProps = {
  children: (api: UserInteractionAPI) => React.ReactNode;
};

export type UserInteractionProviderExtension = Extension<
  'model-registry.tracking/provider',
  {
    component: ComponentCodeRef<UserInteractionProviderProps>;
  }
>;

export const isUserInteractionProviderExtension =
  createExtensionGuard<UserInteractionProviderExtension>('model-registry.tracking/provider');
