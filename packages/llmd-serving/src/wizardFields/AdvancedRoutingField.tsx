import React from 'react';
import {
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
import type { RecursivePartial } from '@odh-dashboard/foundation';
import { z } from 'zod';
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
import { fireRoutingSelected } from '../tracking/llmdTrackingConstants';

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
  configRef?: string;
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

  // Resolve configRef from extractor (edit flow) once external data loads.
  // Resolves against all routerConfigs so a previously selected incompatible config
  // remains visible in the dropdown with a warning.
  const configRef = value?.configRef;
  const existingSelection = value?.selectedConfig;
  const [preSelectedIncompatibleConfig, setPreSelectedIncompatibleConfig] = React.useState<
    LLMInferenceServiceConfigKind | undefined
  >();
  React.useEffect(() => {
    if (!configRef || existingSelection || !isLoaded) {
      return;
    }
    const resolved = (routerConfigs ?? []).find((c) => c.metadata.name === configRef);
    if (resolved) {
      onChange({ selectedConfig: resolved });
      if (!compatibleConfigs.some((c) => c.metadata.name === resolved.metadata.name)) {
        setPreSelectedIncompatibleConfig(resolved);
      }
    } else {
      onChange({ configRef: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configRef, isLoaded, existingSelection, routerConfigs, compatibleConfigs]);

  // Clear stale incompatible state when the config becomes compatible
  // (e.g. topology type changed to one the config supports).
  React.useEffect(() => {
    if (
      preSelectedIncompatibleConfig &&
      compatibleConfigs.some((c) => c.metadata.name === preSelectedIncompatibleConfig.metadata.name)
    ) {
      setPreSelectedIncompatibleConfig(undefined);
    }
  }, [compatibleConfigs, preSelectedIncompatibleConfig]);

  const isIncompatibleSelected =
    !!existingSelection &&
    !!preSelectedIncompatibleConfig &&
    existingSelection.metadata.name === preSelectedIncompatibleConfig.metadata.name;

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

    // Include the incompatible config only if it's not already in the compatible list
    if (
      preSelectedIncompatibleConfig &&
      !compatibleConfigs.some(
        (c) => c.metadata.name === preSelectedIncompatibleConfig.metadata.name,
      )
    ) {
      result.push({
        key: preSelectedIncompatibleConfig.metadata.name,
        label: getDisplayNameFromK8sResource(preSelectedIncompatibleConfig),
        dataTestId: `routing-config-option-${preSelectedIncompatibleConfig.metadata.name}`,
      });
    }

    return result;
  }, [compatibleConfigs, preSelectedIncompatibleConfig]);

  const selectedValue = value?.selectedConfig?.metadata.name ?? DEFAULT_ROUTING_KEY;

  return (
    <FormGroup fieldId="advanced-routing" label="Routing" isRequired>
      <FormHelperText>
        <HelperText>
          <HelperTextItem>
            Select an administrator-defined routing configuration for this topology, or use the
            default.
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
      <Stack hasGutter>
        <StackItem>
          <SimpleSelect
            isFullWidth
            options={options}
            onChange={(key, isPlaceholder) => {
              if (!key || isPlaceholder || key === DEFAULT_ROUTING_KEY) {
                fireRoutingSelected({
                  routingConfigurationId: DEFAULT_ROUTING_KEY,
                  isDefaultRouting: true,
                });
                onChange({ selectedConfig: undefined });
                return;
              }
              const config = (routerConfigs ?? []).find((c) => c.metadata.name === key);
              fireRoutingSelected({
                routingConfigurationId: key,
                isDefaultRouting: false,
              });
              onChange({ selectedConfig: config ?? value?.selectedConfig });
            }}
            value={selectedValue}
            dataTestId="routing-config-select"
            isDisabled={
              !isLoaded ||
              hasLoadError ||
              (compatibleConfigs.length === 0 && !preSelectedIncompatibleConfig)
            }
            autoSelectOnlyOption={false}
            toggleProps={hasLoadError || isIncompatibleSelected ? { status: 'warning' } : undefined}
          />
          {hasLoadError ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="warning">
                  Failed to load routing configurations.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : isIncompatibleSelected ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="warning">
                  The selected routing configuration is not compatible with the current topology
                  type. Select a different routing configuration or contact your administrator.
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

const getReviewSections = (value: AdvancedRoutingFieldData): WizardReviewSection[] => [
  {
    title: 'Model deployment',
    items: [
      {
        key: 'routing-config',
        label: 'Routing',
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
    setFieldData: (value: AdvancedRoutingFieldData) => value,
    getInitialFieldData: (existingFieldData?: AdvancedRoutingFieldData): AdvancedRoutingFieldData =>
      existingFieldData?.selectedConfig || existingFieldData?.configRef
        ? existingFieldData
        : { selectedConfig: undefined },
    validationSchema: z.object({
      selectedConfig: z
        .custom<LLMInferenceServiceConfigKind>(
          (val) => typeof val === 'object' && val !== null && 'kind' in val,
        )
        .optional(),
      configRef: z.string().optional(),
    }),
  },
  shouldResetOnDependencyChange: (prev, next) =>
    prev.topologyType?.topologyType !== next.topologyType?.topologyType,
  externalDataHook: useAdvancedRoutingData,
  component: AdvancedRoutingFieldComponent,
  getReviewSections,
};
