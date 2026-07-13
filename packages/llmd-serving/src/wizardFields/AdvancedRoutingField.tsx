import React from 'react';
import {
  Content,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import type {
  WizardField,
  WizardFormData,
  WizardReviewSection,
} from '@odh-dashboard/model-serving/types/form-data';
import type { RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { LLMD_DEPLOYMENT_METHOD_KEY } from './deploymentMethodField';
import { isTopologyTypeFieldData } from './TopologyTypeField';
import type { TopologyTypeFieldData } from './TopologyTypeField';
import {
  TopologyType,
  RoutingTypeLabels,
  type LLMInferenceServiceConfigKind,
  getConfigRoutingType,
  getConfigSupportedTopologies,
} from '../types';
import { isConfigEnabled } from '../utils';
import { useFetchRouterConfigs } from '../api/LLMInferenceServiceConfigs';
import { isLLMInferenceServiceActive } from '../formUtils';

// --- External data hook ---

export type AdvancedRoutingExternalData = {
  routerConfigs: LLMInferenceServiceConfigKind[];
};

export const useAdvancedRoutingData = (): {
  data: AdvancedRoutingExternalData;
  loaded: boolean;
  loadError?: Error;
} => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { data: configs, loaded, error } = useFetchRouterConfigs(dashboardNamespace);

  const enabledConfigs = React.useMemo(() => configs.filter(isConfigEnabled), [configs]);

  return React.useMemo(
    () => ({
      data: { routerConfigs: enabledConfigs },
      loaded,
      loadError: error,
    }),
    [enabledConfigs, loaded, error],
  );
};

// --- Dependencies ---

type AdvancedRoutingDependencies = {
  topologyType?: TopologyTypeFieldData;
};

// --- Field value ---

export type AdvancedRoutingFieldData = {
  selectedConfig?: LLMInferenceServiceConfigKind;
};

export type AdvancedRoutingFieldType = WizardField<
  AdvancedRoutingFieldData,
  AdvancedRoutingExternalData,
  AdvancedRoutingDependencies
>;

// --- Component ---

const getCompatibleRouterConfigs = (
  routerConfigs: LLMInferenceServiceConfigKind[],
  topologyType?: TopologyType,
): LLMInferenceServiceConfigKind[] => {
  if (!topologyType) {
    return routerConfigs;
  }
  return routerConfigs.filter((config) => {
    const supportedTopologies = getConfigSupportedTopologies(config);
    return supportedTopologies.length === 0 || supportedTopologies.includes(topologyType);
  });
};

const DEFAULT_ROUTING_KEY = '__default-optimized-routing__';

const AdvancedRoutingFieldComponent: AdvancedRoutingFieldType['component'] = ({
  value,
  onChange,
  externalData,
  dependencies,
}) => {
  const topologyType = dependencies?.topologyType?.topologyType;
  const routerConfigs = externalData?.data.routerConfigs;
  const isLoaded = externalData?.loaded ?? false;
  const hasLoadError = Boolean(externalData?.loadError);

  const compatibleConfigs = React.useMemo(
    () => getCompatibleRouterConfigs(routerConfigs ?? [], topologyType),
    [routerConfigs, topologyType],
  );

  const options: SimpleSelectOption[] = React.useMemo(() => {
    const result: SimpleSelectOption[] = [
      {
        key: DEFAULT_ROUTING_KEY,
        label: 'Default optimized routing',
        dataTestId: 'routing-config-option-default',
      },
    ];

    result.push(
      ...compatibleConfigs.map((config) => {
        const routingType = getConfigRoutingType(config);
        const routingLabel = routingType ? ` · ${RoutingTypeLabels[routingType]}` : '';
        return {
          key: config.metadata.name,
          label: getDisplayNameFromK8sResource(config),
          description: routingLabel || undefined,
          dataTestId: `routing-config-option-${config.metadata.name}`,
        };
      }),
    );

    return result;
  }, [compatibleConfigs]);

  const selectedValue = value?.selectedConfig?.metadata.name ?? DEFAULT_ROUTING_KEY;

  return (
    <FormGroup fieldId="advanced-routing" label="Advanced routing">
      <Stack hasGutter>
        <StackItem>
          <Content component="p">
            Select the llm-d routing configuration for this deployment
          </Content>
        </StackItem>
        <StackItem>
          <SimpleSelect
            isFullWidth
            options={options}
            onChange={(key, isPlaceholder) => {
              if (!key || isPlaceholder || key === DEFAULT_ROUTING_KEY) {
                onChange({ selectedConfig: undefined });
                return;
              }
              const config = compatibleConfigs.find((c) => c.metadata.name === key);
              onChange({ selectedConfig: config ?? value?.selectedConfig });
            }}
            value={selectedValue}
            dataTestId="routing-config-select"
            isDisabled={!isLoaded || hasLoadError || compatibleConfigs.length === 0}
            autoSelectOnlyOption={false}
            toggleProps={hasLoadError ? { status: 'warning' } : undefined}
          />
          {hasLoadError && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="warning">
                  Failed to load routing configurations.
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

const getReviewSections = (value: AdvancedRoutingFieldData): WizardReviewSection[] => [
  {
    title: 'Advanced settings',
    items: [
      {
        key: 'routing-config',
        label: 'Routing configuration',
        value: () =>
          value.selectedConfig
            ? getDisplayNameFromK8sResource(value.selectedConfig)
            : 'Default optimized routing',
      },
    ],
  },
];

// --- isActive ---

const isActive = (wizardState: RecursivePartial<WizardFormData['state']>): boolean => {
  if (!isLLMInferenceServiceActive(wizardState)) {
    return false;
  }
  return wizardState.deploymentMethod?.method === LLMD_DEPLOYMENT_METHOD_KEY;
};

// --- Field definition ---

export const AdvancedRoutingFieldWizardField: AdvancedRoutingFieldType = {
  id: 'llmd-serving/advanced-routing',
  parentId: 'networking',
  step: 'advancedOptions',
  type: 'addition',
  isActive,
  reducerFunctions: {
    resolveDependencies: (formData) => {
      const rawTopologyData = formData['llmd-serving/topology-type'];
      return {
        topologyType: isTopologyTypeFieldData(rawTopologyData) ? rawTopologyData : undefined,
      };
    },
    setFieldData: (value: AdvancedRoutingFieldData) => value,
    getInitialFieldData: (existingFieldData?: AdvancedRoutingFieldData): AdvancedRoutingFieldData =>
      existingFieldData ?? { selectedConfig: undefined },
  },
  externalDataHook: useAdvancedRoutingData,
  component: AdvancedRoutingFieldComponent,
  getReviewSections,
};
