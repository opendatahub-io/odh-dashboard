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
import {
  WizardField,
  WizardReviewSection,
} from '@odh-dashboard/model-serving/components/deploymentWizard/types';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
import { ProjectSectionType } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ProjectSection';
import { isLLMInferenceServiceActive } from '../../formUtils';
import { GatewayOption, useGetGatewayOptions } from '../../api/services/gatewayDiscovery';

export type GatewaySelectDependencies = {
  project: ProjectSectionType;
};

export const useGatewayOptions = (
  dependencies?: GatewaySelectDependencies,
): { data: GatewayOption[]; loaded: boolean; loadError?: Error } => {
  const project = dependencies?.project;
  const { data: gatewayOptions, loaded, error } = useGetGatewayOptions(project?.projectName);
  return { data: gatewayOptions, loaded, loadError: error };
};

export type GatewaySelectFieldData = {
  selection: GatewayOption | undefined;
};

export type GatewaySelectFieldType = WizardField<
  GatewaySelectFieldData,
  GatewayOption[] | undefined,
  GatewaySelectDependencies
>;

const getGatewayKey = (gateway: GatewayOption) => `${gateway.name} | ${gateway.namespace}`;

const GatewaySelectFieldComponent: GatewaySelectFieldType['component'] = ({
  value,
  initialValue,
  onChange,
  externalData,
  isDisabled,
}) => {
  const selection = value?.selection;

  const selectedGatewayKey = React.useMemo(
    () => selection && getGatewayKey(selection),
    [selection],
  );

  // If the initial value (from an existing deployment) isn't in the discovered
  // gateways, keep it as an option so the user can switch away and back.
  const initialMissingKey = React.useMemo(() => {
    if (!initialValue || !externalData?.loaded) {
      return undefined;
    }
    const key = initialValue.selection && getGatewayKey(initialValue.selection);
    return key && externalData.data?.some((g) => getGatewayKey(g) === key) ? undefined : key;
  }, [initialValue, externalData]);

  const isCurrentSelectionMissing =
    !!externalData?.loaded &&
    !!selectedGatewayKey &&
    !externalData.data?.some((g) => getGatewayKey(g) === selectedGatewayKey);

  const options: SimpleSelectOption[] = React.useMemo(() => {
    const uniqueGateways = new Map<string, SimpleSelectOption>();
    externalData?.data?.forEach((g) => {
      const key = getGatewayKey(g);
      if (key !== 'maas-default-gateway | openshift-ingress') {
        uniqueGateways.set(key, { key, label: key });
      }
    });

    if (initialMissingKey) {
      uniqueGateways.set(initialMissingKey, { key: initialMissingKey, label: initialMissingKey });
    }
    return Array.from(uniqueGateways.values());
  }, [externalData, initialMissingKey]);

  return (
    <FormGroup fieldId="gateway-select" label="Gateway Selection">
      <Stack hasGutter>
        <StackItem>
          <Content component="p">
            Select the gateway through which users can access the model deployment
          </Content>
        </StackItem>
        <StackItem>
          <SimpleSelect
            isFullWidth
            options={options}
            onChange={(key) => {
              if (!key || key === selectedGatewayKey) {
                onChange({ selection: undefined });
                return;
              }
              const gateway =
                externalData?.data?.find((g) => key === getGatewayKey(g)) ??
                (key === initialMissingKey ? initialValue?.selection : undefined);
              onChange({ selection: gateway });
            }}
            placeholder="Select a gateway"
            value={selectedGatewayKey ?? undefined}
            toggleProps={{
              ...(externalData?.loadError && { status: 'warning' }),
            }}
            dataTestId="gateway-select"
            isDisabled={isDisabled}
            autoSelectOnlyOption={false}
          />
          {externalData?.loadError && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="warning">
                  {externalData.loadError.message}
                  &nbsp;Ensure &quot;model-serving-api&quot; service is healthy and accessible.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
          {!externalData?.loadError && externalData?.loaded && !externalData.data?.length && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="warning">
                  No Gateways found. Make sure Gateway resources are created and configured
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
          {!externalData?.loadError && isCurrentSelectionMissing && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="warning">
                  The selected gateway was not found. The deployment may not work as expected.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </StackItem>
      </Stack>
    </FormGroup>
  );
};

const getGatewayReviewSection = (value: GatewaySelectFieldData): WizardReviewSection[] => {
  const { selection } = value;
  return [
    {
      title: 'Advanced settings',
      items: selection
        ? [
            {
              key: 'gateway',
              label: 'Gateway',
              value: () => getGatewayKey(selection),
            },
          ]
        : [],
    },
  ];
};
export const GatewaySelectField: GatewaySelectFieldType = {
  id: 'llmd-serving/gateway',
  parentId: 'networking',
  step: 'advancedOptions',
  type: 'addition',
  isActive: isLLMInferenceServiceActive,
  reducerFunctions: {
    resolveDependencies: (formData) => ({
      project: formData.project,
    }),
    setFieldData: (value: GatewaySelectFieldData) => value,
    getInitialFieldData: (existingFieldData?: GatewaySelectFieldData): GatewaySelectFieldData =>
      existingFieldData ?? { selection: undefined },
  },
  shouldResetOnDependencyChange: true,
  externalDataHook: useGatewayOptions,
  component: GatewaySelectFieldComponent,
  getReviewSections: getGatewayReviewSection,
};
