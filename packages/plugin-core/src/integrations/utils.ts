import type { IntegrationAppStatus } from './types';

export const isEnabled = (
  components: Record<string, IntegrationAppStatus>,
  componentName: string,
): boolean => {
  const component = componentName in components ? components[componentName] : undefined;
  return !!(component?.isEnabled && component.isInstalled);
};
