import React from 'react';
import {
  FormGroup,
  Content,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
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
import { TopologyType, type LLMInferenceServiceConfigKind } from '../types';
import { isLLMInferenceServiceActive } from '../formUtils';

// --- Dependencies ---

const topologyTypeValues: string[] = Object.values(TopologyType);
const isTopologyTypeFieldData = (data: unknown): data is TopologyTypeFieldData => {
  if (data == null || typeof data !== 'object' || !('topologyType' in data)) {
    return false;
  }
  const record: Record<string, unknown> = data;
  return (
    typeof record.topologyType === 'string' && topologyTypeValues.includes(record.topologyType)
  );
};

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

  const existingSelection = value?.selectedConfig;
  const noConfigsAvailable = filteredConfigs.length === 0 && !existingSelection;

  const options: SimpleSelectOption[] = React.useMemo(() => {
    const result = filteredConfigs.map((config) => ({
      key: config.metadata.name,
      label: getDisplayNameFromK8sResource(config),
      description: config.metadata.annotations?.['openshift.io/description'],
      dataTestId: `topology-config-option-${config.metadata.name}`,
    }));

    if (
      existingSelection &&
      !filteredConfigs.some((c) => c.metadata.name === existingSelection.metadata.name)
    ) {
      result.push({
        key: existingSelection.metadata.name,
        label: getDisplayNameFromK8sResource(existingSelection),
        description: existingSelection.metadata.annotations?.['openshift.io/description'],
        dataTestId: `topology-config-option-${existingSelection.metadata.name}`,
      });
    }

    return result;
  }, [filteredConfigs, existingSelection]);

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
              onChange({ selectedConfig: config ?? value?.selectedConfig });
            }}
            placeholder="Select custom configuration (optional)"
            value={value?.selectedConfig?.metadata.name}
            dataTestId="custom-topology-config-select"
            isDisabled={noConfigsAvailable}
            autoSelectOnlyOption={false}
          />
          {noConfigsAvailable && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="warning">
                  No topology configurations found for this topology type. Contact your
                  administrator to create one.
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
    resolveDependencies: (formData) => {
      const rawTopologyData = formData['llmd-serving/topology-type'];
      return {
        topologyType: isTopologyTypeFieldData(rawTopologyData) ? rawTopologyData : undefined,
      };
    },
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
