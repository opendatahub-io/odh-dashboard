import React from 'react';
import {
  FormGroup,
  Content,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { z } from 'zod';
import type {
  WizardField,
  WizardFormData,
  WizardReviewSection,
} from '@odh-dashboard/model-serving/types/form-data';
import type { RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { LLMD_DEPLOYMENT_METHOD_KEY } from './deploymentMethodField';
import {
  TopologyType,
  TopologyTypeLabels,
  type LLMInferenceServiceConfigKind,
  getConfigTopologyType,
  isConfigEnabled,
} from '../types';
import { useFetchTopologyConfigs } from '../api/LLMInferenceServiceConfigs';
import { isLLMInferenceServiceActive } from '../formUtils';

// --- External data hook ---

export type TopologyTypeExternalData = {
  configsByTopology: Record<TopologyType, LLMInferenceServiceConfigKind[]>;
};

export const useTopologyTypeData = (): {
  data: TopologyTypeExternalData;
  loaded: boolean;
  loadError?: Error;
} => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { data: configs, loaded, error } = useFetchTopologyConfigs(dashboardNamespace);

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

    return grouped;
  }, [configs]);

  return React.useMemo(
    () => ({
      data: { configsByTopology },
      loaded,
      loadError: error,
    }),
    [configsByTopology, loaded, error],
  );
};

// --- Field value ---

export type TopologyTypeFieldData = {
  topologyType: TopologyType;
};

export type TopologyTypeFieldType = WizardField<TopologyTypeFieldData, TopologyTypeExternalData>;

// --- Component ---

const TopologyTypeFieldComponent: TopologyTypeFieldType['component'] = ({
  value,
  onChange,
  externalData,
}) => {
  const configsByTopology = externalData?.data.configsByTopology;

  const options: SimpleSelectOption[] = React.useMemo(
    () =>
      Object.values(TopologyType).map((topoType) => {
        const configs = configsByTopology?.[topoType];
        const hasConfigs = configs !== undefined && configs.length > 0;
        const isSingleNode = topoType === TopologyType.SINGLE_NODE;
        const isOptionDisabled = !isSingleNode && !hasConfigs;
        return {
          key: topoType,
          label: TopologyTypeLabels[topoType],
          dropdownLabel: isOptionDisabled ? (
            <>
              {TopologyTypeLabels[topoType]}{' '}
              <Tooltip content="No configurations available. To request one, contact your administrator.">
                <OutlinedQuestionCircleIcon />
              </Tooltip>
            </>
          ) : undefined,
          isAriaDisabled: isOptionDisabled,
          dataTestId: `topology-type-${topoType}`,
        };
      }),
    [configsByTopology],
  );

  return (
    <FormGroup fieldId="topology-type-select" label="Topology type" isRequired>
      <Stack hasGutter>
        <StackItem>
          <Content component="p">
            Select the deployment topology for your model. This determines how the workload is
            distributed across nodes.
          </Content>
        </StackItem>
        <StackItem>
          <SimpleSelect
            isFullWidth
            options={options}
            onChange={(key) => {
              const matched = Object.values(TopologyType).find((v) => v === key);
              if (matched) {
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
  id: 'llmd-serving/topology-type',
  step: 'modelDeployment',
  type: 'addition',
  isActive,
  reducerFunctions: {
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
