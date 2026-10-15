import yaml from 'js-yaml';
import type { RuntimeImageInstallActionData } from '~/odh/extension-points/runtime-image-install-action';
import type { ServingRuntime, ServingRuntimeVersion } from '~/odh/types/servingRuntimeCatalogTypes';

const nonBlankOrUndefined = (value?: string): string | undefined =>
  value?.trim() ? value : undefined;

export const formatRuntimeTemplate = (template: string | undefined): string => {
  if (!template) {
    return 'N/A';
  }
  try {
    return yaml.dump(JSON.parse(template), { lineWidth: -1, noRefs: true });
  } catch {
    return template;
  }
};

type BuildRuntimeImageInstallActionDataArgs = {
  runtime: ServingRuntime;
  version?: ServingRuntimeVersion;
  cancelReturnRoute: string;
  libraryReturnRoute: string;
};

export const buildRuntimeImageInstallActionData = ({
  runtime,
  version,
  cancelReturnRoute,
  libraryReturnRoute,
}: BuildRuntimeImageInstallActionDataArgs): RuntimeImageInstallActionData => {
  const servingRuntimeTemplate = nonBlankOrUndefined(version?.servingRuntimeTemplate);
  const llmInferenceServiceConfig = nonBlankOrUndefined(version?.llmInferenceServiceConfig);

  return {
    runtimeImageId: runtime.id ?? '',
    runtimeImageName: runtime.displayName?.trim() || runtime.name?.trim() || runtime.id || '',
    cancelReturnRoute,
    libraryReturnRoute,
    deploymentResources: {
      ...(servingRuntimeTemplate && { servingRuntimeTemplate }),
      ...(llmInferenceServiceConfig && { llmInferenceServiceConfig }),
    },
  };
};

export const formatRuntimePublishedDate = (publishedDate?: string): string | undefined => {
  if (!publishedDate) {
    return undefined;
  }
  const date = new Date(publishedDate);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' });
};
