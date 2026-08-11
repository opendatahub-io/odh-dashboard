import React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { z } from 'zod';
import type {
  InitialWizardFormData,
  WizardField,
  WizardFormData,
  WizardReviewSection,
} from '@odh-dashboard/model-serving/shared/types/form-data';
import type { RecursivePartial } from '@odh-dashboard/foundation';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { LLMD_DEPLOYMENT_METHOD_KEY } from './deploymentMethodField';
import {
  TopologyType,
  TopologyTypeLabels,
  TopologyTypeDescriptions,
  type LLMInferenceServiceConfigKind,
  getConfigTopologyType,
} from '../types';
import { isConfigEnabled } from '../utils';
import {
  useFetchTopologyConfigs,
  useFetchLLMInferenceServiceConfig,
} from '../api/LLMInferenceServiceConfigs';
import { isLLMInferenceServiceActive } from '../formUtils';
import { fireTopologyTypeSelected } from '../tracking/llmdTrackingConstants';
import { CUSTOM_TOPOLOGY_CONFIG_FIELD_ID, TOPOLOGY_TYPE_FIELD_ID } from '../const';

// --- Dependencies ---

export type TopologyConfigsDependencies = {
  project?: WizardFormData['state']['project'];
  /** The config this deployment already references, from the edit extractor. */
  configRef?: string;
  /** The topology type this deployment was deployed with, from the edit extractor. */
  initialTopologyType?: TopologyType;
};

const isRecord = (data: unknown): data is Record<string, unknown> =>
  typeof data === 'object' && data !== null;

const readProperty = (data: unknown, key: string): unknown =>
  isRecord(data) ? data[key] : undefined;

export const resolveTopologyConfigsDependencies = (
  formData: WizardFormData['state'],
  initialData?: InitialWizardFormData,
): TopologyConfigsDependencies => {
  const configRef = readProperty(initialData?.[CUSTOM_TOPOLOGY_CONFIG_FIELD_ID], 'configRef');
  const initialTopologyType = readProperty(initialData?.[TOPOLOGY_TYPE_FIELD_ID], 'topologyType');
  return {
    project: formData.project,
    configRef: typeof configRef === 'string' ? configRef : undefined,
    initialTopologyType: Object.values(TopologyType).find((t) => t === initialTopologyType),
  };
};

// --- External data hook ---

export type TopologyTypeExternalData = {
  configsByTopology: Record<TopologyType, LLMInferenceServiceConfigKind[]>;
};

/**
 * The dashboard configs, plus the config the deployment already references.
 *
 * On edit, baseRefs point at a copy of a config that lives in the deployment's own project
 * namespace rather than in the dashboard namespace. That copy is fetched by name and folded into
 * the configs for its topology type, so it is just another option to every consuming field — and
 * so its topology type isn't reported as having no configurations.
 */
export const useTopologyTypeData = (
  dependencies?: TopologyConfigsDependencies,
): {
  data: TopologyTypeExternalData;
  loaded: boolean;
  loadError?: Error;
} => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { data: configs, loaded, error } = useFetchTopologyConfigs(dashboardNamespace);

  const { configRef, initialTopologyType } = dependencies ?? {};
  const projectName = dependencies?.project?.projectName;
  const {
    data: referencedConfig,
    loaded: referencedLoaded,
    error: referencedError,
  } = useFetchLLMInferenceServiceConfig(configRef, projectName);

  const configsByTopology = React.useMemo(() => {
    const grouped: Record<TopologyType, LLMInferenceServiceConfigKind[]> = {
      [TopologyType.SINGLE_NODE]: [],
      [TopologyType.MULTI_NODE]: [],
      [TopologyType.SINGLE_NODE_DISAGGREGATED]: [],
      [TopologyType.MULTI_NODE_DISAGGREGATED]: [],
    };

    for (const config of configs) {
      if (!isConfigEnabled(config)) {
        continue;
      }
      const topoType = getConfigTopologyType(config);
      if (topoType) {
        grouped[topoType].push(config);
      }
    }

    // If config has no topology type, use the deployment's type
    const referencedTopoType = referencedConfig
      ? getConfigTopologyType(referencedConfig) ?? initialTopologyType
      : undefined;
    if (
      referencedConfig &&
      referencedTopoType &&
      !grouped[referencedTopoType].some((c) => c.metadata.name === referencedConfig.metadata.name)
    ) {
      grouped[referencedTopoType].push(referencedConfig);
    }

    return grouped;
  }, [configs, referencedConfig, initialTopologyType]);

  return React.useMemo(
    () => ({
      data: { configsByTopology },
      loaded: loaded && (!configRef || !projectName || referencedLoaded || !!referencedError),
      loadError: error ?? referencedError,
    }),
    [configsByTopology, loaded, error, configRef, projectName, referencedLoaded, referencedError],
  );
};

// --- Field value ---

export type TopologyTypeFieldData = {
  topologyType: TopologyType;
};

const topologyTypeValues: string[] = Object.values(TopologyType);
export const isTopologyTypeFieldData = (data: unknown): data is TopologyTypeFieldData => {
  if (data == null || typeof data !== 'object' || !('topologyType' in data)) {
    return false;
  }
  const record: Record<string, unknown> = data;
  return (
    typeof record.topologyType === 'string' && topologyTypeValues.includes(record.topologyType)
  );
};

export type TopologyTypeFieldType = WizardField<
  TopologyTypeFieldData,
  TopologyTypeExternalData,
  TopologyConfigsDependencies
>;

// --- Component ---

const TopologyTypeFieldComponent: TopologyTypeFieldType['component'] = ({
  value,
  onChange,
  externalData,
}) => {
  const configsByTopology = externalData?.data.configsByTopology;

  const options: SimpleSelectOption[] = React.useMemo(
    () =>
      Object.values(TopologyType).map((topoType): SimpleSelectOption => {
        const configs = configsByTopology?.[topoType];
        const hasConfigs = configs !== undefined && configs.length > 0;
        const isSingleNode = topoType === TopologyType.SINGLE_NODE;
        const isOptionDisabled = !isSingleNode && !hasConfigs;
        return {
          key: topoType,
          label: TopologyTypeLabels[topoType],
          description: TopologyTypeDescriptions[topoType],
          isAriaDisabled: isOptionDisabled,
          dataTestId: `topology-type-${topoType}`,
          tooltipProps: isOptionDisabled
            ? {
                content: 'No configurations available. To request one, contact your administrator.',
                position: 'left',
              }
            : undefined,
        };
      }),
    [configsByTopology],
  );

  return (
    <FormGroup fieldId="topology-type-select" label="Topology type" isRequired>
      <Stack hasGutter>
        <StackItem>
          <SimpleSelect
            isFullWidth
            options={options}
            onChange={(key) => {
              const matched = Object.values(TopologyType).find((v) => v === key);
              if (matched) {
                fireTopologyTypeSelected({
                  llmdComposablePattern: matched,
                  previousPattern: value?.topologyType,
                });
                onChange({ topologyType: matched });
              }
            }}
            value={value?.topologyType}
            dataTestId="topology-type-select"
            toggleProps={externalData?.loadError ? { status: 'warning' } : undefined}
          />
          {externalData?.loadError && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="warning">
                  Failed to load topology configurations. Some options may be unavailable.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </StackItem>
      </Stack>
    </FormGroup>
  );
};

// --- Review ---

const getReviewSections = (value: TopologyTypeFieldData): WizardReviewSection[] => [
  {
    title: 'Model deployment',
    items: [
      {
        key: 'topology-type',
        label: 'Topology type',
        value: () => TopologyTypeLabels[value.topologyType],
      },
    ],
  },
];

// --- isActive: only when llm-d deployment method selected ---

const isActive = (wizardState: RecursivePartial<WizardFormData['state']>): boolean => {
  if (!isLLMInferenceServiceActive(wizardState)) {
    return false;
  }
  return wizardState.deploymentMethod?.method === LLMD_DEPLOYMENT_METHOD_KEY;
};

// --- Field definition ---

export const TopologyTypeFieldWizardField: TopologyTypeFieldType = {
  id: TOPOLOGY_TYPE_FIELD_ID,
  step: 'modelDeployment',
  type: 'addition',
  isActive,
  reducerFunctions: {
    resolveDependencies: resolveTopologyConfigsDependencies,
    setFieldData: (value: TopologyTypeFieldData) => value,
    getInitialFieldData: (existingFieldData?: TopologyTypeFieldData): TopologyTypeFieldData =>
      existingFieldData ?? { topologyType: TopologyType.SINGLE_NODE },
    validationSchema: z.object({
      topologyType: z.nativeEnum(TopologyType),
    }),
  },
  externalDataHook: useTopologyTypeData,
  component: TopologyTypeFieldComponent,
  getReviewSections,
};
