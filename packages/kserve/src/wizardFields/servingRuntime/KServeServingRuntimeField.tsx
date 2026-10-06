import React from 'react';
import { z } from 'zod';
import type { RecursivePartial } from '@odh-dashboard/foundation';
import type {
  HardwareProfileKind,
  SupportedModelFormats,
  TemplateKind,
} from '@odh-dashboard/k8s-core';
import {
  ServingRuntimeModelType,
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeFromTemplate,
  getServingRuntimeVersion,
  isTemplateKind,
} from '@odh-dashboard/model-serving/shared';
import {
  isModelServerTemplateFieldOverride,
  type WizardField,
  type WizardFormData,
} from '@odh-dashboard/model-serving/shared/types/form-data';
import {
  ModelServerTemplateSelectField,
  type ModelServerOption,
  type ModelServerSelectFieldData,
  modelServerSelectFieldSchema,
  getAcceleratorIdentifierFromHardwareProfile,
  type ModelTypeFieldData,
  useWizardFieldOverrides,
} from '@odh-dashboard/model-serving/shared/wizard-fields';
import { useModelServingClusterSettings } from '@odh-dashboard/model-serving/concepts/useModelServingClusterSettings';
import { useServingRuntimeTemplates } from '@odh-dashboard/model-serving/concepts/useServingRuntimeTemplates';
import {
  filterTemplatesByModelType,
  findTemplateForSelection,
  mergeProjectAndGlobalTemplates,
} from '@odh-dashboard/model-serving/concepts/servingRuntimeTemplates/templateUtils';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { isCompatibleWithIdentifier } from '@odh-dashboard/internal/pages/projects/screens/spawner/spawnerUtils';
import { useProfileIdentifiers } from '@odh-dashboard/hardware-profiles/shared';
import { LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY } from '../deploymentMethodField';

// Types

type KServeServingRuntimeDependencies = {
  modelFormat?: SupportedModelFormats;
  hardwareProfile?: HardwareProfileKind;
  modelType?: ModelTypeFieldData;
  vLLMDeploymentOnMaaS?: boolean;
  deploymentMethod?: string;
  projectName?: string;
  /** When predictive, reuse ModelFormatField's already-fetched templates to avoid duplicate watches. */
  templatesFromModelFormat?: TemplateKind[];
  modelFormatLoaded?: boolean;
};

export type KServeServingRuntimeExternalData = {
  templates: TemplateKind[];
  extraOptions: ModelServerOption[];
  suggestion?: ModelServerOption;
};

export type KServeServingRuntimeFieldValue = {
  data?: ModelServerSelectFieldData;
};

export type KServeServingRuntimeFieldType = WizardField<
  KServeServingRuntimeFieldValue,
  KServeServingRuntimeExternalData,
  KServeServingRuntimeDependencies
>;

/**
 * Determines if the KServe serving runtime field should be active in the wizard.
 *
 * Activation logic:
 * - PREDICTIVE models: Always active (use traditional KServe serving runtimes)
 * - GENERATIVE models: Active only when the legacy deployment method is selected
 *
 * When inactive, the field's externalDataHook is unmounted so TemplateKind resources
 * are not fetched from the cluster.
 */
export const isKServeServingRuntimeFieldActive = (
  wizardState: RecursivePartial<WizardFormData['state']>,
): boolean => {
  const modelType = wizardState.modelType?.data;
  const deploymentMethodOption = wizardState.deploymentMethod?.method;

  if (modelType?.type === ServingRuntimeModelType.PREDICTIVE) {
    return true;
  }

  if (
    modelType?.type === ServingRuntimeModelType.GENERATIVE &&
    deploymentMethodOption === LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY
  ) {
    return true;
  }

  return false;
};

/**
 * Resolves initial model-server field state.
 * When editing, extracted selections omit the Template object — attach it once templates load
 * so Advanced Options / submit can resolve the ServingRuntime without relying on ModelFormat.
 */
export const resolveInitialModelServerFieldData = (
  existingFieldData?: KServeServingRuntimeFieldValue,
  externalData?: KServeServingRuntimeExternalData,
  dependencies?: KServeServingRuntimeDependencies,
): KServeServingRuntimeFieldValue => {
  if (existingFieldData?.data?.selection) {
    const { selection } = existingFieldData.data;
    if (selection.template || !externalData?.templates.length) {
      return existingFieldData;
    }

    const matchedTemplate = findTemplateForSelection(externalData.templates, selection);
    if (!matchedTemplate) {
      return existingFieldData;
    }

    return {
      ...existingFieldData,
      data: {
        ...existingFieldData.data,
        selection: {
          ...selection,
          template: matchedTemplate,
        },
      },
    };
  }

  if (externalData?.suggestion) {
    return {
      data: {
        selection: externalData.suggestion,
        autoSelect: true,
        suggestion: externalData.suggestion,
      },
    };
  }

  const suggestion = computeSuggestion(
    externalData?.templates,
    dependencies?.modelFormat,
    dependencies?.hardwareProfile,
  );
  if (suggestion) {
    return {
      data: {
        selection: suggestion,
        autoSelect: true,
        suggestion,
      },
    };
  }

  return { data: { autoSelect: false } };
};

// External data hook — only mounted while the field is active (ExternalDataLoader)

export const useKServeServingRuntimeExternalData = (
  dependencies?: KServeServingRuntimeDependencies,
): {
  data: KServeServingRuntimeExternalData;
  loaded: boolean;
  loadError?: Error;
} => {
  const { dashboardNamespace } = useDashboardNamespace();
  const projectName = dependencies?.projectName;
  const hasDistinctProjectNamespace = !!projectName && projectName !== dashboardNamespace;
  // Predictive already watches Templates in ModelFormatField — reuse those results.
  // Generative + legacy is the only path that must fetch here.
  const shouldFetchTemplates = dependencies?.modelType?.type === ServingRuntimeModelType.GENERATIVE;

  const [globalTemplates, globalLoaded, globalError] = useServingRuntimeTemplates(
    undefined,
    shouldFetchTemplates,
  );
  const [projectTemplates, projectLoaded, projectError] = useServingRuntimeTemplates(
    hasDistinctProjectNamespace ? projectName : undefined,
    shouldFetchTemplates && hasDistinctProjectNamespace,
  );

  const templates = React.useMemo(() => {
    if (!shouldFetchTemplates) {
      return dependencies?.templatesFromModelFormat ?? [];
    }
    return filterTemplatesByModelType(
      mergeProjectAndGlobalTemplates(
        globalTemplates,
        projectTemplates,
        hasDistinctProjectNamespace,
      ),
      dependencies.modelType?.type,
    );
  }, [
    shouldFetchTemplates,
    dependencies?.templatesFromModelFormat,
    globalTemplates,
    projectTemplates,
    hasDistinctProjectNamespace,
    dependencies?.modelType?.type,
  ]);

  const {
    data: modelServingClusterSettings,
    loaded: clusterSettingsLoaded,
    error: clusterSettingsError,
  } = useModelServingClusterSettings();

  const formData = React.useMemo(
    () => ({
      modelType: { data: dependencies?.modelType },
      devFeatureFlags: { vLLMDeploymentOnMaaS: dependencies?.vLLMDeploymentOnMaaS },
    }),
    [dependencies?.modelType, dependencies?.vLLMDeploymentOnMaaS],
  );

  const modelServerOverrides = useWizardFieldOverrides(
    isModelServerTemplateFieldOverride,
    formData,
  );

  const templatesLoaded = shouldFetchTemplates
    ? globalLoaded && projectLoaded
    : dependencies?.modelFormatLoaded ?? false;

  const isLegacyGenerativePath =
    dependencies?.deploymentMethod === LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY;

  return React.useMemo(() => {
    let extraOptions = modelServerOverrides.flatMap((override) => override.extraOptions ?? []);
    let suggestion = modelServerOverrides.reduce<ModelServerOption | undefined>(
      (acc, override) => acc ?? override.suggestion?.(modelServingClusterSettings),
      undefined,
    );

    // Pre-vLLMonMaaS overrides can inject model-server options with no Template (e.g. llm-d)
    // based on model type / feature flag alone. On the KServe legacy path only Template-backed
    // options are valid — otherwise we would auto-select and deploy without a ServingRuntime.
    if (isLegacyGenerativePath) {
      const isTemplateBacked = (option: ModelServerOption): boolean =>
        option.template !== undefined && isTemplateKind(option.template);

      extraOptions = extraOptions.filter(isTemplateBacked);
      if (suggestion && !isTemplateBacked(suggestion)) {
        suggestion = undefined;
      }
    }

    return {
      data: { templates, extraOptions, suggestion },
      loaded: templatesLoaded && clusterSettingsLoaded,
      loadError: globalError || projectError || clusterSettingsError,
    };
  }, [
    templates,
    modelServerOverrides,
    modelServingClusterSettings,
    templatesLoaded,
    clusterSettingsLoaded,
    globalError,
    projectError,
    clusterSettingsError,
    isLegacyGenerativePath,
  ]);
};

const computeSuggestion = (
  templates?: TemplateKind[],
  modelFormat?: SupportedModelFormats,
  hardwareProfile?: HardwareProfileKind,
): ModelServerOption | undefined => {
  let filtered = templates;

  if (modelFormat) {
    filtered = filtered?.filter((template) =>
      getServingRuntimeFromTemplate(template)?.spec.supportedModelFormats?.some(
        (format) => format.name === modelFormat.name && format.version === modelFormat.version,
      ),
    );
  }

  const accelerator = getAcceleratorIdentifierFromHardwareProfile(hardwareProfile);
  if (accelerator) {
    filtered = filtered?.filter((template) =>
      isCompatibleWithIdentifier(accelerator, getServingRuntimeFromTemplate(template)),
    );
  }

  if (filtered?.length === 1) {
    const suggestedTemplate = filtered[0];
    return {
      name: suggestedTemplate.metadata.name,
      namespace: suggestedTemplate.metadata.namespace,
      label: getServingRuntimeDisplayNameFromTemplate(suggestedTemplate),
      template: suggestedTemplate,
    };
  }
  return undefined;
};

// Component

const KServeServingRuntimeField: KServeServingRuntimeFieldType['component'] = ({
  value,
  onChange,
  externalData,
  dependencies,
  isEditing,
}) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const profileIdentifiers = useProfileIdentifiers(dependencies?.hardwareProfile);

  const options = React.useMemo((): ModelServerOption[] => {
    const result: ModelServerOption[] = [];

    result.push(...(externalData?.data.extraOptions ?? []));

    result.push(
      ...(externalData?.data.templates.map(
        (template) =>
          ({
            name: template.metadata.name,
            namespace: template.metadata.namespace,
            label: getServingRuntimeDisplayNameFromTemplate(template),
            version: getServingRuntimeVersion(template),
            compatibleWithHardwareProfile: profileIdentifiers.some((identifier) =>
              isCompatibleWithIdentifier(identifier, getServingRuntimeFromTemplate(template)),
            ),
            scope: template.metadata.namespace === dashboardNamespace ? 'global' : 'project',
            template,
          } satisfies ModelServerOption),
      ) ?? []),
    );

    return result;
  }, [
    externalData?.data.extraOptions,
    externalData?.data.templates,
    dashboardNamespace,
    profileIdentifiers,
  ]);

  return (
    <ModelServerTemplateSelectField
      label="Serving runtime template"
      modelServerState={{
        data: value?.data,
        setData: (data: ModelServerSelectFieldData) => onChange({ data }),
        options,
      }}
      isEditing={isEditing}
    />
  );
};

// WizardField definition

export const KServeServingRuntimeFieldWizardField: KServeServingRuntimeFieldType = {
  id: 'kserve/modelServer',
  step: 'modelDeployment',
  type: 'replacement',
  stateKey: 'modelServer',
  isActive: isKServeServingRuntimeFieldActive,
  reducerFunctions: {
    resolveDependencies: (formData) => ({
      modelFormat: formData.modelFormatState.modelFormat,
      hardwareProfile: formData.hardwareProfileConfig.formData.selectedProfile,
      modelType: formData.modelType.data,
      vLLMDeploymentOnMaaS: formData.devFeatureFlags?.vLLMDeploymentOnMaaS,
      deploymentMethod: formData.deploymentMethod?.method,
      projectName: formData.project.projectName,
      templatesFromModelFormat: formData.modelFormatState.templatesFilteredForModelType,
      modelFormatLoaded: formData.modelFormatState.loaded,
    }),
    setFieldData: (value: KServeServingRuntimeFieldValue) => value,
    getInitialFieldData: resolveInitialModelServerFieldData,
    validationSchema: z.object({
      data: modelServerSelectFieldSchema,
    }),
  },
  shouldResetOnDependencyChange: (prevDependencies, newDependencies) => {
    return (
      prevDependencies.modelType?.type !== newDependencies.modelType?.type ||
      prevDependencies.deploymentMethod !== newDependencies.deploymentMethod ||
      prevDependencies.projectName !== newDependencies.projectName
    );
  },
  component: KServeServingRuntimeField,
  externalDataHook: useKServeServingRuntimeExternalData,
};
