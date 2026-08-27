import React from 'react';
import {
  Content,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core';
import {
  WizardField,
  WizardFieldHelpPopover,
  WizardReviewSection,
} from '@odh-dashboard/model-serving/shared/types/form-data';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import FieldGroupHelpLabelIcon from '@odh-dashboard/ui-core/components/FieldGroupHelpLabelIcon';
import { ProjectSectionType } from '@odh-dashboard/model-serving/shared/wizard-fields';
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
  return { data: gatewayOptions, loaded: loaded || !!error, loadError: error };
};

export type GatewaySelectFieldData = {
  selection: GatewayOption | undefined;
  hiddenOptions?: GatewayOption[];
  disabledTooltip?: string;
  labelHelpPopover?: WizardFieldHelpPopover;
  labelOverrides?: Record<string, string>;
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
  const hiddenOptions = value?.hiddenOptions;
  const selection = value?.selection;
  const disabledTooltip = value?.disabledTooltip;
  const labelHelpPopover = value?.labelHelpPopover;
  const labelOverrides = value?.labelOverrides;

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
    if (hiddenOptions?.some((h) => getGatewayKey(h) === key)) {
      return undefined;
    }
    return key && externalData.data?.some((g) => getGatewayKey(g) === key) ? undefined : key;
  }, [initialValue, externalData, hiddenOptions]);

  const isCurrentSelectionMissing =
    !!externalData?.loaded &&
    !!selectedGatewayKey &&
    !externalData.data?.some((g) => getGatewayKey(g) === selectedGatewayKey);

  const options: SimpleSelectOption[] = React.useMemo(() => {
    const uniqueGateways = new Map<string, SimpleSelectOption>();
    for (const g of externalData?.data ?? []) {
      const key = getGatewayKey(g);
      if (hiddenOptions?.some((h) => getGatewayKey(h) === key)) {
        continue;
      }

      uniqueGateways.set(key, { key, label: labelOverrides?.[key] ?? key });
    }

    if (initialMissingKey) {
      uniqueGateways.set(initialMissingKey, {
        key: initialMissingKey,
        label: labelOverrides?.[initialMissingKey] ?? initialMissingKey,
      });
    }
    if (isDisabled && selectedGatewayKey && !uniqueGateways.has(selectedGatewayKey)) {
      uniqueGateways.set(selectedGatewayKey, {
        key: selectedGatewayKey,
        label: labelOverrides?.[selectedGatewayKey] ?? selectedGatewayKey,
      });
    }
    return Array.from(uniqueGateways.values());
  }, [
    externalData,
    initialMissingKey,
    hiddenOptions,
    labelOverrides,
    isDisabled,
    selectedGatewayKey,
  ]);

  const toggleProps = !isDisabled && externalData?.loadError ? { status: 'warning' as const } : {};

  const selectEl = (
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
      toggleProps={toggleProps}
      dataTestId="gateway-select"
      isDisabled={isDisabled}
      autoSelectOnlyOption={false}
    />
  );

  return (
    <FormGroup
      fieldId="gateway-select"
      label="Gateway selection"
      labelHelp={
        labelHelpPopover ? (
          <FieldGroupHelpLabelIcon
            buttonTestId="gateway-select-help-button"
            popoverBodyTestId="gateway-select-help-popover"
            title={labelHelpPopover.title}
            content={labelHelpPopover.content}
          />
        ) : undefined
      }
    >
      <Stack hasGutter>
        <StackItem>
          <Content component="p">
            Select the gateway through which users can access the model deployment
          </Content>
        </StackItem>
        <StackItem>
          {disabledTooltip && isDisabled ? (
            <Tooltip content={disabledTooltip}>
              <div
                role="button"
                tabIndex={0}
                aria-label={disabledTooltip}
                data-testid="gateway-select-tooltip-wrapper"
              >
                {selectEl}
              </div>
            </Tooltip>
          ) : (
            selectEl
          )}
          {!isDisabled && externalData?.loadError && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="warning">
                  {externalData.loadError.message}
                  &nbsp;Ensure &quot;model-serving-api&quot; service is healthy and accessible.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
          {!isDisabled && !externalData?.loadError && externalData?.loaded && !options.length && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="warning">
                  No Gateways found. Make sure Gateway resources are created and configured
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
          {!isDisabled && !externalData?.loadError && isCurrentSelectionMissing && (
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
  shouldResetOnDependencyChange: () => true,
  externalDataHook: useGatewayOptions,
  component: GatewaySelectFieldComponent,
  getReviewSections: getGatewayReviewSection,
};
