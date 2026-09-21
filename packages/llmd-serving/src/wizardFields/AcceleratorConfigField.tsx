import React from 'react';
import { z } from 'zod';
import type {
  InitialWizardFormData,
  WizardField,
  WizardFormData,
  WizardReviewSection,
} from '@odh-dashboard/model-serving/shared/types/form-data';
import type { RecursivePartial } from '@odh-dashboard/foundation';
import {
  ModelServerTemplateSelectField,
  type ModelServerOption,
  type ModelServerSelectFieldData,
} from '@odh-dashboard/model-serving/shared/wizard-fields';
import { RUNTIME_VERSION_ANNOTATION } from '@odh-dashboard/model-serving/concepts/versions';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { HardwareProfileKind } from '@odh-dashboard/k8s-core';
import { isCompatibleWithIdentifier } from '@odh-dashboard/internal/pages/projects/screens/spawner/spawnerUtils';
import { LLMD_DEPLOYMENT_METHOD_KEY } from './deploymentMethodField';
import { isTopologyTypeFieldData, type TopologyTypeFieldData } from './TopologyTypeField';
import {
  TopologyType,
  type LLMInferenceServiceConfigKind,
  getConfigSupportedTopologies,
} from '../types';
import { isConfigEffectivelyEnabled } from '../utils';
import {
  useFetchLLMInferenceServiceConfig,
  useFetchLLMInferenceServiceConfigs,
} from '../api/LLMInferenceServiceConfigs';
import { isLLMInferenceServiceActive } from '../formUtils';
import { ACCELERATOR_CONFIG_FIELD_ID, ACCELERATOR_CONFIG_DEFAULT } from '../const';

// Synthetic "no override / use the built-in image" option surfaced in the Manual selection list.
// Its `name` doubles as the placeholder we persist (ACCELERATOR_CONFIG_DEFAULT); it carries no
// `template`, so ModelServerTemplateSelectField renders no version labels for it.
const BUILT_IN_IMAGE_OPTION: ModelServerOption = {
  name: ACCELERATOR_CONFIG_DEFAULT,
  // needs-ux: wording
  label: 'Built-in image (default)',
};

// --- Dependencies ---

type AcceleratorConfigDependencies = {
  topologyFieldData?: TopologyTypeFieldData;
  hardwareProfile?: HardwareProfileKind;
  project?: WizardFormData['state']['project'];
  /** The accelerator config this deployment already references, from the edit extractor. */
  configRef?: string;
};

const isRecord = (data: unknown): data is Record<string, unknown> =>
  typeof data === 'object' && data !== null;

const readProperty = (data: unknown, key: string): unknown =>
  isRecord(data) ? data[key] : undefined;

const resolveAcceleratorConfigDependencies = (
  formData: WizardFormData['state'],
  initialData?: InitialWizardFormData,
): AcceleratorConfigDependencies => {
  const rawTopologyData = formData['llmd-serving/topology-type'];
  const configRef = readProperty(initialData?.[ACCELERATOR_CONFIG_FIELD_ID], 'configRef');
  return {
    topologyFieldData: isTopologyTypeFieldData(rawTopologyData) ? rawTopologyData : undefined,
    hardwareProfile: formData.hardwareProfileConfig.formData.selectedProfile,
    project: formData.project,
    configRef: typeof configRef === 'string' ? configRef : undefined,
  };
};

// --- External data hook ---

export type AcceleratorConfigExternalData = { configs: LLMInferenceServiceConfigKind[] };

/**
 * The dashboard accelerator configs, plus the config the deployment already references on edit.
 *
 * On edit, the deployment's accelerator baseRef points at a copy of the config that lives in the
 * deployment's own project namespace (created at deploy time), not in the dashboard namespace.
 * That copy is fetched by name from the project namespace and folded into the configs so the edit
 * form can resolve + pre-select it.
 */
export const useAcceleratorConfigData = (
  dependencies?: AcceleratorConfigDependencies,
): {
  data: AcceleratorConfigExternalData;
  loaded: boolean;
  loadError?: Error;
} => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { data: configs, loaded, error } = useFetchLLMInferenceServiceConfigs(dashboardNamespace);

  const { configRef } = dependencies ?? {};
  const projectName = dependencies?.project?.projectName;
  const {
    data: referencedConfig,
    loaded: referencedLoaded,
    error: referencedError,
  } = useFetchLLMInferenceServiceConfig(configRef, projectName);

  const combined = React.useMemo(() => {
    const enabled = configs.filter(isConfigEffectivelyEnabled);
    if (
      referencedConfig &&
      !enabled.some((c) => c.metadata.name === referencedConfig.metadata.name)
    ) {
      return [...enabled, referencedConfig];
    }
    return enabled;
  }, [configs, referencedConfig]);

  return React.useMemo(
    () => ({
      data: { configs: combined },
      // The referenced config only matters for an existing selection, so an unreadable project
      // namespace shouldn't hold up the field.
      loaded: loaded && (!configRef || !projectName || referencedLoaded || !!referencedError),
      loadError: error,
    }),
    [combined, loaded, error, configRef, projectName, referencedLoaded, referencedError],
  );
};

// --- Field value ---

export type AcceleratorConfigFieldData = {
  selectedConfig?: LLMInferenceServiceConfigKind | typeof ACCELERATOR_CONFIG_DEFAULT;
  configRef?: string;
  /**
   * Whether the user chose "Automatic selection" (vs. picking a config manually). This only drives
   * the shared component's radio state — `selectedConfig` still holds the resolved config either
   * way, so the deploy pipeline is identical for automatic and manual selections.
   */
  autoSelect?: boolean;
};

export type AcceleratorConfigFieldType = WizardField<
  AcceleratorConfigFieldData,
  AcceleratorConfigExternalData,
  AcceleratorConfigDependencies
>;

// --- Compatibility / suggestion ---

const isConfigCompatible = (
  config: LLMInferenceServiceConfigKind,
  hardwareProfile?: HardwareProfileKind,
): boolean =>
  hardwareProfile?.spec.identifiers?.some((identifier) =>
    isCompatibleWithIdentifier(identifier.identifier, config),
  ) ?? false;

const suggestConfig = (
  configs: LLMInferenceServiceConfigKind[],
  hardwareProfile?: HardwareProfileKind,
): LLMInferenceServiceConfigKind | undefined => {
  const compatible = configs.filter((c) => isConfigCompatible(c, hardwareProfile));
  return compatible.length === 1 ? compatible[0] : undefined;
};

// Map an accelerator config to a ModelServerOption (mirrors LlmConfigOptionsField so the shared
// ModelServerTemplateSelectField renders version labels + hardware-profile compatibility labels).
// A config living in the deployment's own project namespace (the local copy folded in on edit) is
// marked project-scoped so the dropdown groups/labels it correctly; dashboard admin configs are left
// unscoped (rendered as global).
const toModelServerOption = (
  config: LLMInferenceServiceConfigKind,
  hardwareProfile?: HardwareProfileKind,
  projectName?: string,
): ModelServerOption => ({
  name: config.metadata.name,
  namespace: config.metadata.namespace,
  label: getDisplayNameFromK8sResource(config),
  version: config.metadata.annotations?.[RUNTIME_VERSION_ANNOTATION],
  template: config,
  compatibleWithHardwareProfile: isConfigCompatible(config, hardwareProfile),
  scope: projectName && config.metadata.namespace === projectName ? 'project' : undefined,
});

// --- Visibility ---

const configSupportsTopology = (
  config: LLMInferenceServiceConfigKind,
  topologyType?: TopologyType,
): boolean => {
  // An absent topology field (LLMD_TOPOLOGY_CONFIGS off) means the deployment is implicitly
  // single-node — same as isActive treats it — so all single-node configs are visible. Without this,
  // visibleConfigs would be empty in the vLLMDeploymentOnMaaS-on / llmdTemplates-off combination and
  // no accelerator config could be selected.
  if (topologyType === TopologyType.SINGLE_NODE || !topologyType) {
    return true;
  }
  return getConfigSupportedTopologies(config).includes(topologyType);
};

// --- Component ---
//
// Renders the shared ModelServerTemplateSelectField (Automatic/Manual radios, version labels,
// project-scoped search) but keeps this field's persisted data model as
// { selectedConfig, configRef }. The component bridges to/from the component's
// ModelServerSelectFieldData ({ selection, autoSelect, suggestion }) internally so the deploy
// pipeline (apply/extract/preDeploy in ../deployments/accelerator) is unchanged.

export const AcceleratorConfigFieldComponent: AcceleratorConfigFieldType['component'] = ({
  value,
  onChange,
  externalData,
  dependencies,
  isEditing,
}) => {
  const topologyType = dependencies?.topologyFieldData?.topologyType;
  const hardwareProfile = dependencies?.hardwareProfile;
  const projectName = dependencies?.project?.projectName;
  const configs = React.useMemo(() => externalData?.data.configs ?? [], [externalData?.data]);
  const isLoaded = externalData?.loaded ?? false;

  const visibleConfigs = React.useMemo(
    () => configs.filter((c) => configSupportsTopology(c, topologyType)),
    [configs, topologyType],
  );

  // Options presented to the shared component: the "Built-in image (default)" placeholder first,
  // then the topology-compatible accelerator configs.
  const options: ModelServerOption[] = React.useMemo(
    () => [
      BUILT_IN_IMAGE_OPTION,
      ...visibleConfigs.map((c) => toModelServerOption(c, hardwareProfile, projectName)),
    ],
    [visibleConfigs, hardwareProfile, projectName],
  );

  // Resolve configRef from the edit extractor into a real selectedConfig once configs load.
  const configRef = value?.configRef;
  const existingSelection = value?.selectedConfig;
  React.useEffect(() => {
    if (!configRef || existingSelection || !isLoaded) {
      return;
    }
    const resolved = configs.find((c) => c.metadata.name === configRef);
    onChange(resolved ? { selectedConfig: resolved } : { configRef: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configRef, isLoaded, existingSelection, configs]);

  // Bridge our persisted { selectedConfig } → the component's ModelServerSelectFieldData.
  const suggestion = React.useMemo(
    () => suggestConfig(visibleConfigs, hardwareProfile),
    [visibleConfigs, hardwareProfile],
  );
  const suggestionOption = React.useMemo(
    () => (suggestion ? toModelServerOption(suggestion, hardwareProfile, projectName) : undefined),
    [suggestion, hardwareProfile, projectName],
  );

  const autoSelect = value?.autoSelect ?? false;
  const selection: ModelServerOption =
    existingSelection && existingSelection !== ACCELERATOR_CONFIG_DEFAULT
      ? toModelServerOption(existingSelection, hardwareProfile, projectName)
      : BUILT_IN_IMAGE_OPTION;

  const modelServerData: ModelServerSelectFieldData = {
    selection,
    // Persisted so the "Automatic selection" radio stays checked and renders its read-only summary;
    // otherwise clicking Automatic would immediately snap back to Manual on the next render.
    autoSelect,
    suggestion: suggestionOption,
  };

  return (
    <ModelServerTemplateSelectField
      label="Accelerator configuration"
      // needs-ux: wording
      helperText="Optionally override the container image with an accelerator-specific configuration."
      isEditing={isEditing}
      modelServerState={{
        data: modelServerData,
        options,
        setData: (data: ModelServerSelectFieldData) => {
          const picked = data.autoSelect ? data.suggestion : data.selection;
          if (!picked || picked.name === ACCELERATOR_CONFIG_DEFAULT) {
            onChange({ selectedConfig: ACCELERATOR_CONFIG_DEFAULT, autoSelect: data.autoSelect });
            return;
          }
          const config = visibleConfigs.find((c) => c.metadata.name === picked.name);
          onChange({
            selectedConfig: config ?? value?.selectedConfig,
            autoSelect: data.autoSelect,
          });
        },
      }}
    />
  );
};

// --- Review ---

const getReviewSections = (value: AcceleratorConfigFieldData): WizardReviewSection[] => [
  {
    title: 'Model deployment',
    items: [
      {
        key: 'accelerator-config',
        label: 'Accelerator configuration',
        value: () =>
          value.selectedConfig && value.selectedConfig !== ACCELERATOR_CONFIG_DEFAULT
            ? getDisplayNameFromK8sResource(value.selectedConfig)
            : 'Built-in image (default)',
      },
    ],
  },
];

// --- isActive ---

const isActive = (wizardState: RecursivePartial<WizardFormData['state']>): boolean => {
  if (!isLLMInferenceServiceActive(wizardState)) {
    return false;
  }
  if (wizardState.deploymentMethod?.method !== LLMD_DEPLOYMENT_METHOD_KEY) {
    return false;
  }
  const rawTopology = wizardState['llmd-serving/topology-type'];
  const topologyType = isTopologyTypeFieldData(rawTopology) ? rawTopology.topologyType : undefined;
  // The field is flag-gated on VLLM_ON_MAAS (not LLMD_TOPOLOGY_CONFIGS), so it can be active even
  // when the topology field isn't present (llmdTemplates off) — in that case the deployment is
  // implicitly single-node, so show the field. When the topology field IS present, restrict to
  // single node (other topologies rely on supported-topologies, gated in the component's
  // visibleConfigs). `undefined` = topology feature off → eligible.
  return topologyType === undefined || topologyType === TopologyType.SINGLE_NODE;
};

// --- Field definition ---

export const AcceleratorConfigFieldWizardField: AcceleratorConfigFieldType = {
  id: ACCELERATOR_CONFIG_FIELD_ID,
  step: 'modelDeployment',
  type: 'addition',
  isActive,
  reducerFunctions: {
    resolveDependencies: resolveAcceleratorConfigDependencies,
    setFieldData: (value: AcceleratorConfigFieldData) => value,
    getInitialFieldData: (
      existingFieldData?: AcceleratorConfigFieldData,
      externalData?: AcceleratorConfigExternalData,
      dependencies?: AcceleratorConfigDependencies,
    ): AcceleratorConfigFieldData => {
      if (existingFieldData) {
        return existingFieldData;
      }
      const suggestion = suggestConfig(externalData?.configs ?? [], dependencies?.hardwareProfile);
      // A suggestion means the hardware profile uniquely matches a config → start on Automatic
      // (mirrors LlmConfigOptionsField). No suggestion → Manual with the built-in image default.
      return suggestion
        ? { selectedConfig: suggestion, autoSelect: true }
        : { selectedConfig: ACCELERATOR_CONFIG_DEFAULT, autoSelect: false };
    },
    validationSchema: z.object({
      selectedConfig: z.union([
        z.custom<LLMInferenceServiceConfigKind>(
          (val) => typeof val === 'object' && val !== null && 'kind' in val,
        ),
        z.literal(ACCELERATOR_CONFIG_DEFAULT),
      ]),
      configRef: z.string().optional(),
      autoSelect: z.boolean().optional(),
    }),
  },
  externalDataHook: useAcceleratorConfigData,
  component: AcceleratorConfigFieldComponent,
  getReviewSections,
};
