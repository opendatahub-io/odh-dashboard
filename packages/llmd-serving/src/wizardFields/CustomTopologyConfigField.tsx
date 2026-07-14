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
import type { RecursivePartial } from '@odh-dashboard/foundation';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { LLMD_DEPLOYMENT_METHOD_KEY } from './deploymentMethodField';
import {
  useTopologyTypeData,
  isTopologyTypeFieldData,
  type TopologyTypeFieldData,
  type TopologyTypeExternalData,
} from './TopologyTypeField';
import { TopologyType, type LLMInferenceServiceConfigKind } from '../types';
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

const SINGLE_NODE_DEFAULT_KEY = '__single-node-default__';

const CustomTopologyConfigFieldComponent: CustomTopologyConfigFieldType['component'] = ({
  value,
  onChange,
  externalData,
  dependencies,
}) => {
  const topologyType = dependencies?.topologyType?.topologyType;
  const configsByTopology = externalData?.data.configsByTopology;
  const isLoaded = externalData?.loaded ?? false;
  const hasLoadError = Boolean(externalData?.loadError);
  const isSingleNode = topologyType === TopologyType.SINGLE_NODE;

  const filteredConfigs = React.useMemo(
    () => getFilteredConfigs(configsByTopology, topologyType),
    [configsByTopology, topologyType],
  );

  const existingSelection = value?.selectedConfig;
  const noConfigsAvailable =
    isLoaded &&
    !hasLoadError &&
    filteredConfigs.length === 0 &&
    !existingSelection &&
    !isSingleNode;

  // Auto-select first config for non-single-node when configs load
  React.useEffect(() => {
    if (isLoaded && !isSingleNode && !existingSelection && filteredConfigs.length > 0) {
      onChange({ selectedConfig: filteredConfigs[0] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, filteredConfigs.length, topologyType]);

  const options: SimpleSelectOption[] = React.useMemo(() => {
    const result: SimpleSelectOption[] = [];

    if (isSingleNode) {
      result.push({
        key: SINGLE_NODE_DEFAULT_KEY,
        label: 'Single node (default)',
        description: 'LLMInferenceServiceConfig template for this topology type.',
        dataTestId: 'topology-config-option-single-node-default',
      });
    }

    result.push(
      ...filteredConfigs.map((config) => ({
        key: config.metadata.name,
        label: getDisplayNameFromK8sResource(config),
        description: config.metadata.annotations?.['openshift.io/description'],
        dataTestId: `topology-config-option-${config.metadata.name}`,
      })),
    );

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
  }, [filteredConfigs, existingSelection, isSingleNode]);

  const selectedValue =
    isSingleNode && !existingSelection ? SINGLE_NODE_DEFAULT_KEY : existingSelection?.metadata.name;

  return (
    <FormGroup fieldId="custom-topology-config" label="Topology configuration" isRequired>
      <Stack hasGutter>
        <StackItem>
          <Content component="p">
            Select a topology configuration for this deployment pattern.
          </Content>
        </StackItem>
        <StackItem>
          <SimpleSelect
            isFullWidth
            options={options}
            onChange={(key, isPlaceholder) => {
              if (!key || isPlaceholder || key === SINGLE_NODE_DEFAULT_KEY) {
                onChange({ selectedConfig: undefined });
                return;
              }
              const config = filteredConfigs.find((c) => c.metadata.name === key);
              onChange({ selectedConfig: config ?? value?.selectedConfig });
            }}
            placeholder="Select configuration"
            value={selectedValue}
            dataTestId="custom-topology-config-select"
            isDisabled={!isLoaded || hasLoadError || noConfigsAvailable}
            autoSelectOnlyOption={false}
          />
          {hasLoadError ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="warning">
                  Failed to load topology configurations. Some options may be unavailable.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : noConfigsAvailable ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="warning">
                  No topology configurations found for this topology type. Contact your
                  administrator to create one.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : null}
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
          label: 'Topology configuration',
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
