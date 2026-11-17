import React from 'react';
import {
  convertResourcesToYaml,
  convertYamlToResources,
  ResourcesParseResult,
  YamlParseResult,
} from './yamlUtils';
import { type Deployment } from '../../../../extension-points';
import {
  useExtractFormDataFromDeployment,
  UseExtractFormDataFromDeploymentReturn,
} from '../useExtractFormDataFromDeployment';
import { DeploymentAssemblyResources } from '../../../../extension-points/deployment-wizard';

type UseFormYamlResourcesResult = {
  yaml?: YamlParseResult;
  /** The YAML generated from the form when entering YAML mode; compare with `isYamlDirty`. */
  yamlAtEntry?: string;
  setYaml: (yaml: YamlParseResult) => void;
  reinitYamlFromResources: (newResourcesFromForm: DeploymentAssemblyResources) => void;
  resources: ResourcesParseResult;
  initialData?: UseExtractFormDataFromDeploymentReturn;
  yamlSubmitErrors: Error[];
  yamlToFormErrors: Error[];
};

/**
 * Parses the editable model YAML and preserves the server from the last form snapshot.
 * Call reinitYamlFromResources when entering YAML mode to capture the current form resources.
 */
export const useFormYamlResources = (
  existingDeployment?: Deployment,
): UseFormYamlResourcesResult => {
  const resourcesAtTimeOfYamlParsing = React.useRef<DeploymentAssemblyResources | undefined>(
    existingDeployment,
  );
  const [editorYaml, setEditorYaml] = React.useState<YamlParseResult>(() =>
    convertResourcesToYaml(resourcesAtTimeOfYamlParsing.current),
  );
  // Only set from the form, so YAML seeded from an existing deployment has no snapshot (dirty)
  const [yamlAtEntry, setYamlAtEntry] = React.useState<string>();

  const reinitYamlFromResources = React.useCallback(
    (newResourcesFromForm: DeploymentAssemblyResources) => {
      resourcesAtTimeOfYamlParsing.current = newResourcesFromForm;
      const generated = convertResourcesToYaml(newResourcesFromForm);
      setYamlAtEntry(generated.yaml);
      setEditorYaml(generated);
    },
    [setEditorYaml],
  );

  // Only the model is editable in YAML; preserve the server from the latest form snapshot.
  const yamlResourcesResult = React.useMemo<ResourcesParseResult>(() => {
    const result = convertYamlToResources(editorYaml.yaml);
    const server = resourcesAtTimeOfYamlParsing.current?.server;
    return {
      ...result,
      resources: {
        ...result.resources,
        ...(server ? { server } : {}),
      },
    };
  }, [editorYaml]);

  const hackDeployment = React.useMemo<Deployment | null>(
    () =>
      yamlResourcesResult.resources.model?.kind === 'LLMInferenceService'
        ? {
            modelServingPlatformId: 'llmd-serving',
            ...yamlResourcesResult.resources,
            model: yamlResourcesResult.resources.model,
          }
        : null,
    [yamlResourcesResult.resources],
  );
  const extractFormDataFromYamlResult: UseExtractFormDataFromDeploymentReturn =
    useExtractFormDataFromDeployment(hackDeployment);

  return React.useMemo(() => {
    return {
      yaml: editorYaml,
      yamlAtEntry,
      setYaml: setEditorYaml,
      reinitYamlFromResources,
      resources: yamlResourcesResult,
      initialData: extractFormDataFromYamlResult,
      yamlSubmitErrors: [editorYaml.error, yamlResourcesResult.error].filter(
        (error): error is Error => error instanceof Error,
      ),
      yamlToFormErrors: [
        ...[editorYaml.error, yamlResourcesResult.error].filter(
          (error): error is Error => error instanceof Error,
        ),
        ...(extractFormDataFromYamlResult.errors ?? []),
      ],
    } satisfies UseFormYamlResourcesResult;
  }, [
    editorYaml,
    yamlAtEntry,
    setEditorYaml,
    reinitYamlFromResources,
    yamlResourcesResult,
    extractFormDataFromYamlResult,
  ]);
};
