export const modelRegistryRoute = (preferredModelRegistry = ''): string =>
  `/ai-hub/registry/${preferredModelRegistry}`;

export const modelRegistrySettingsRoute = (): string =>
  '/settings/model-resources-operations/model-registry';
