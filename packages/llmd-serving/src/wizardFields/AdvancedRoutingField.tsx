import React from 'react';
import {
  Checkbox,
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
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
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
  isConfigEnabled,
} from '../types';
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
  enabled: boolean;
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

  const noConfigsAvailable = isLoaded && !hasLoadError && compatibleConfigs.length === 0;

  const options: SimpleSelectOption[] = React.useMemo(
    () =>
      compatibleConfigs.map((config) => {
        const routingType = getConfigRoutingType(config);
        const routingLabel = routingType ? ` · ${RoutingTypeLabels[routingType]}` : '';
        return {
          key: config.metadata.name,
          label: getDisplayNameFromK8sResource(config),
          description: routingLabel || undefined,
          dataTestId: `routing-config-option-${config.metadata.name}`,
        };
      }),
    [compatibleConfigs],
  );

  return (
    <FormGroup fieldId="advanced-routing" label="Advanced routing">
      <Stack hasGutter>
        <StackItem>
          <Checkbox
            id="advanced-routing-checkbox"
            label="Use advanced routing"
            isChecked={value?.enabled ?? false}
            onChange={(_event, checked) => {
              onChange({
                enabled: checked,
                selectedConfig: checked ? value?.selectedConfig : undefined,
              });
            }}
            data-testid="advanced-routing-checkbox"
          />
        </StackItem>
        {value?.enabled && (
          <StackItem>
            <FormGroup
              fieldId="routing-config-select"
              label="Custom routing configuration"
              isRequired
            >
              <SimpleSelect
                isFullWidth
                options={options}
                onChange={(key, isPlaceholder) => {
                  if (!key || isPlaceholder) {
                    onChange({ enabled: true, selectedConfig: undefined });
                    return;
                  }
                  const config = compatibleConfigs.find((c) => c.metadata.name === key);
                  onChange({ enabled: true, selectedConfig: config });
                }}
                placeholder="Select routing configuration"
                value={value.selectedConfig?.metadata.name}
                dataTestId="routing-config-select"
                isDisabled={!isLoaded || hasLoadError || noConfigsAvailable}
                autoSelectOnlyOption={false}
                toggleProps={hasLoadError ? { status: 'warning' } : undefined}
              />
              {hasLoadError ? (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant="warning">
                      Failed to load routing configurations.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              ) : noConfigsAvailable ? (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant="warning">
                      No routing configurations available for this topology type. Contact your
                      administrator to create one.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              ) : null}
            </FormGroup>
          </StackItem>
        )}
      </Stack>
    </FormGroup>
  );
};

// --- Review ---

const getReviewSections = (value: AdvancedRoutingFieldData): WizardReviewSection[] => {
  if (!value.enabled || !value.selectedConfig) {
    return [];
  }
  return [
    {
      title: 'Advanced settings',
      items: [
        {
          key: 'routing-config',
          label: 'Routing configuration',
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
      existingFieldData ?? { enabled: false },
  },
  externalDataHook: useAdvancedRoutingData,
  component: AdvancedRoutingFieldComponent,
  getReviewSections,
};
