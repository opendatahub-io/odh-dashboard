export const modelRegistryRoute = (preferredModelRegistry = ''): string =>
  `/ai-hub/models/registry/${preferredModelRegistry}`;

export const modelRegistrySettingsRoute = (): string => '/modelRegistrySettings';
