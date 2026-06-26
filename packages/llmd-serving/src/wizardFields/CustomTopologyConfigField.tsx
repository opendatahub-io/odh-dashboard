import React from 'react';
import { FormGroup, Content, Stack, StackItem } from '@patternfly/react-core';
import type {
  WizardField,
  WizardReviewSection,
  WizardFormData,
} from '@odh-dashboard/model-serving/types/form-data';
import type { RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { LLMD_DEPLOYMENT_METHOD_KEY } from './deploymentMethodField';
import {
  useTopologyTypeData,
  type TopologyTypeFieldData,
  type TopologyTypeExternalData,
} from './TopologyTypeField';
import { type LLMInferenceServiceConfigKind, type TopologyType } from '../types';
import { isLLMInferenceServiceActive } from '../formUtils';

// --- Dependencies ---

type CustomTopologyConfigDependencies = {
  topologyType?: TopologyTypeFieldData;
};

// --- Field value ---

export type CustomTopologyConfigFieldData = {
  selectedConfig?: LLMInferenceServiceConfigKind;
};

export type CustomTopologyConfigFieldType = WizardField<
  CustomTopologyConfigFieldData,
  TopologyTypeExternalData,
  CustomTopologyConfigDependencies
>;

// --- Component ---

const getFilteredConfigs = (
  configsByTopology: Record<TopologyType, LLMInferenceServiceConfigKind[]> | undefined,
  topologyType?: TopologyType,
): LLMInferenceServiceConfigKind[] => {
  if (!configsByTopology || !topologyType) {
    return [];
  }
  return configsByTopology[topologyType];
};

const CustomTopologyConfigFieldComponent: CustomTopologyConfigFieldType['component'] = ({
  value,
  onChange,
  externalData,
  dependencies,
}) => {
  const topologyType = dependencies?.topologyType?.topologyType;
  const configsByTopology = externalData?.data.configsByTopology;

  const filteredConfigs = React.useMemo(
    () => getFilteredConfigs(configsByTopology, topologyType),
    [configsByTopology, topologyType],
  );

  const options: SimpleSelectOption[] = React.useMemo(
    () =>
      filteredConfigs.map((config) => ({
        key: config.metadata.name,
        label: getDisplayNameFromK8sResource(config),
        description: config.metadata.annotations?.['openshift.io/description'],
        dataTestId: `topology-config-option-${config.metadata.name}`,
      })),
    [filteredConfigs],
  );

  if (filteredConfigs.length === 0) {
    return null;
  }

  return (
    <FormGroup fieldId="custom-topology-config" label="Custom topology configurations">
      <Stack hasGutter>
        <StackItem>
          <Content component="p">
            Select a pre-defined topology configuration for this deployment pattern.
          </Content>
        </StackItem>
        <StackItem>
          <SimpleSelect
            isFullWidth
            options={options}
            onChange={(key, isPlaceholder) => {
              if (!key || isPlaceholder) {
                onChange({ selectedConfig: undefined });
                return;
              }
              const config = filteredConfigs.find((c) => c.metadata.name === key);
              onChange({ selectedConfig: config });
            }}
            placeholder="Select custom configuration (optional)"
            value={value?.selectedConfig?.metadata.name}
            dataTestId="custom-topology-config-select"
          />
        </StackItem>
      </Stack>
    </FormGroup>
  );
};

// --- Review ---

const getReviewSections = (value: CustomTopologyConfigFieldData): WizardReviewSection[] => {
  if (!value.selectedConfig) {
    return [];
  }
  return [
    {
      title: 'Model deployment',
      items: [
        {
          key: 'custom-topology-config',
          label: 'Custom topology configuration',
          value: () =>
            value.selectedConfig ? getDisplayNameFromK8sResource(value.selectedConfig) : '',
        },
      ],
    },
  ];
};

// --- isActive ---

const isActive = (wizardState: RecursivePartial<WizardFormData['state']>): boolean => {
  if (!isLLMInferenceServiceActive(wizardState)) {
    return false;
  }
  return wizardState.deploymentMethod?.method === LLMD_DEPLOYMENT_METHOD_KEY;
};

// --- Field definition ---

export const CustomTopologyConfigFieldWizardField: CustomTopologyConfigFieldType = {
  id: 'llmd-serving/custom-topology-config',
  step: 'modelDeployment',
  type: 'addition',
  isActive,
  reducerFunctions: {
    resolveDependencies: (formData) => ({
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      topologyType: formData['llmd-serving/topology-type'] as TopologyTypeFieldData | undefined,
    }),
    setFieldData: (value: CustomTopologyConfigFieldData) => value,
    getInitialFieldData: (
      existingFieldData?: CustomTopologyConfigFieldData,
    ): CustomTopologyConfigFieldData => existingFieldData ?? { selectedConfig: undefined },
  },
  shouldResetOnDependencyChange: (prev, next) =>
    prev.topologyType?.topologyType !== next.topologyType?.topologyType,
  externalDataHook: useTopologyTypeData,
  component: CustomTopologyConfigFieldComponent,
  getReviewSections,
};
