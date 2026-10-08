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
import { MultiSelection, SelectionOptions } from '@odh-dashboard/ui-core/components/MultiSelection';
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
  selections: GatewayOption[];
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

const GATEWAY_KEY_SEPARATOR = ' | ';
const getGatewayKey = (gateway: GatewayOption) =>
  `${gateway.name}${GATEWAY_KEY_SEPARATOR}${gateway.namespace}`;

const parseGatewayKey = (key: string): GatewayOption | undefined => {
  const separatorIndex = key.indexOf(GATEWAY_KEY_SEPARATOR);
  if (separatorIndex <= 0) {
    return undefined;
  }
  const name = key.slice(0, separatorIndex);
  const namespace = key.slice(separatorIndex + GATEWAY_KEY_SEPARATOR.length);
  if (!name || !namespace) {
    return undefined;
  }
  return { name, namespace };
};

const EMPTY_SELECTIONS: GatewayOption[] = [];

const GatewaySelectFieldComponent: GatewaySelectFieldType['component'] = ({
  value,
  initialValue,
  onChange,
  externalData,
  isDisabled,
}) => {
  const hiddenOptions = value?.hiddenOptions;
  const selections = value?.selections ?? EMPTY_SELECTIONS;
  const disabledTooltip = value?.disabledTooltip;
  const labelHelpPopover = value?.labelHelpPopover;
  const labelOverrides = value?.labelOverrides;

  const hiddenOptionKeys = React.useMemo(
    () => new Set((hiddenOptions ?? []).map(getGatewayKey)),
    [hiddenOptions],
  );

  const selectedGatewayKeys = React.useMemo(
    () => new Set(selections.map(getGatewayKey)),
    [selections],
  );

  const gatewayByKey = React.useMemo(() => {
    const map = new Map<string, GatewayOption>();
    for (const g of externalData?.data ?? []) {
      map.set(getGatewayKey(g), g);
    }
    for (const g of initialValue?.selections ?? []) {
      const key = getGatewayKey(g);
      if (!map.has(key)) {
        map.set(key, g);
      }
    }
    for (const g of selections) {
      const key = getGatewayKey(g);
      if (!map.has(key)) {
        map.set(key, g);
      }
    }
    return map;
  }, [externalData?.data, initialValue?.selections, selections]);

  // Keep initial selections that aren't in the discovered list so the user can
  // switch away and back (edit flow with deleted/missing gateways).
  const initialMissingKeys = React.useMemo(() => {
    if (!initialValue?.selections.length || !externalData?.loaded) {
      return [];
    }
    return initialValue.selections.map(getGatewayKey).filter((key) => {
      if (hiddenOptionKeys.has(key)) {
        return false;
      }
      return !externalData.data?.some((g) => getGatewayKey(g) === key);
    });
  }, [initialValue, externalData, hiddenOptionKeys]);

  const missingSelectedKeys = React.useMemo(() => {
    if (!externalData?.loaded) {
      return [];
    }
    return [...selectedGatewayKeys].filter((key) => {
      if (hiddenOptionKeys.has(key)) {
        return false;
      }
      return !externalData.data?.some((g) => getGatewayKey(g) === key);
    });
  }, [externalData, selectedGatewayKeys, hiddenOptionKeys]);

  const options: SelectionOptions[] = React.useMemo(() => {
    const uniqueGateways = new Map<string, SelectionOptions>();

    for (const g of externalData?.data ?? []) {
      const key = getGatewayKey(g);
      if (hiddenOptionKeys.has(key)) {
        continue;
      }

      uniqueGateways.set(key, {
        id: key,
        name: labelOverrides?.[key] ?? key,
        selected: selectedGatewayKeys.has(key),
      });
    }

    // Preserve missing initial and currently selected gateways so chips/options
    // remain available even when discovery no longer returns them.
    for (const key of new Set([...initialMissingKeys, ...missingSelectedKeys])) {
      if (!uniqueGateways.has(key)) {
        uniqueGateways.set(key, {
          id: key,
          name: labelOverrides?.[key] ?? key,
          selected: selectedGatewayKeys.has(key),
        });
      }
    }

    return Array.from(uniqueGateways.values());
  }, [
    externalData,
    initialMissingKeys,
    missingSelectedKeys,
    hiddenOptionKeys,
    labelOverrides,
    selectedGatewayKeys,
  ]);

  const selectEl = (
    <MultiSelection
      ariaLabel="Gateway selection"
      value={options}
      setValue={(newOptions) => {
        const nextSelections = newOptions
          .filter((option) => option.selected)
          .map((option) => {
            const key = String(option.id);
            return gatewayByKey.get(key) ?? parseGatewayKey(key);
          })
          .filter((gateway): gateway is GatewayOption => gateway !== undefined);
        onChange({ selections: nextSelections });
      }}
      placeholder="Select gateways"
      toggleTestId="gateway-select"
      isDisabled={isDisabled}
      hasCheckbox
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
            Select one or more gateways through which users can access the model deployment
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
          {!isDisabled && !externalData?.loadError && missingSelectedKeys.length > 0 && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="warning">
                  {missingSelectedKeys.length === 1
                    ? 'The selected gateway was not found. The deployment may not work as expected.'
                    : 'One or more selected gateways were not found. The deployment may not work as expected.'}
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
  const { selections } = value;
  return [
    {
      title: 'Advanced settings',
      items: selections.length
        ? [
            {
              key: 'gateway',
              label: selections.length === 1 ? 'Gateway' : 'Gateways',
              value: () => selections.map(getGatewayKey).join(', '),
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
      existingFieldData ?? { selections: [] },
  },
  shouldResetOnDependencyChange: () => true,
  externalDataHook: useGatewayOptions,
  component: GatewaySelectFieldComponent,
  getReviewSections: getGatewayReviewSection,
};
