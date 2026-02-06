import React from 'react';
import {
  Checkbox,
  FormGroup,
  Popover,
  HelperText,
  HelperTextItem,
  FormHelperText,
  Stack,
  StackItem,
  Flex,
  FlexItem,
  Label,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { z } from 'zod';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { LLMD_SERVING_ID } from '@odh-dashboard/llmd-serving/extensions';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import DashboardPopupIconButton from '@odh-dashboard/internal/concepts/dashboard/DashboardPopupIconButton';
import {
  MultiSelection,
  SelectionOptions,
} from '@odh-dashboard/internal/components/MultiSelection';
import type { WizardField } from '@odh-dashboard/model-serving/types/form-data';
import type { Tier } from '~/app/types/tier';
import { useFetchTiers } from '~/app/hooks/useFetchTiers';

/**
 * The `tiers` is the true value that is stored and is interpreted like so:
 * - `undefined` = maas not enabled / `isChecked` = false
 * - `null` = maas enabled but no tiers configured / `isChecked` = true and `tiersDropdownSelection` = 'no-tiers'
 * - `[]` = maas enabled and all tiers used / `isChecked` = true and `tiersDropdownSelection` = 'all-tiers'
 *   - This is the default value when the checkbox is checked
 * - `[string]` = maas enabled and specific tiers selected / `isChecked` = true and `tiersDropdownSelection` = 'specify-tiers'
 *
 * @see https://github.com/opendatahub-io/models-as-a-service/blob/main/docs/content/configuration-and-management/tier-configuration.md#2-configure-tier-access
 */
export type MaaSTierValue = {
  isChecked: boolean; // whether the checkbox is checked
  tiersDropdownSelection?: TierDropdownOption; // the selected tier from the dropdown
  selectedTierNames?: string[]; // if tiersDropdownSelection is 'specify-tiers', this is the list of selected tier names
};

//// Dropdown options ////

export enum TierDropdownOption {
  AllTiers = 'all-tiers',
  NoTiers = 'no-tiers',
  SpecifyTiers = 'specify-tiers',
}

const TIER_DROPDOWN_OPTIONS: Array<{ key: TierDropdownOption; label: string }> = [
  { key: TierDropdownOption.AllTiers, label: 'All tiers' },
  { key: TierDropdownOption.NoTiers, label: 'No tiers' },
  { key: TierDropdownOption.SpecifyTiers, label: 'Specific tiers' },
];

const getTierDropdownLabel = (key: TierDropdownOption): string => {
  const option = TIER_DROPDOWN_OPTIONS.find((opt) => opt.key === key);
  return option?.label ?? 'All tiers';
};

const getMaaSTierLabel = (
  value: MaaSTierValue,
  externalData?: { data: MaaSEndpointsExternalData },
): string => {
  const availableTiers = externalData?.data.tiers ?? [];
  const selection = value.tiersDropdownSelection ?? TierDropdownOption.AllTiers;
  if (selection === TierDropdownOption.NoTiers) {
    return getTierDropdownLabel(TierDropdownOption.NoTiers);
  }
  if (selection === TierDropdownOption.SpecifyTiers) {
    // Matching the display name of the selected tiers
    return (
      availableTiers
        .filter((tier: Tier) => value.selectedTierNames?.includes(tier.name ?? ''))
        .map((tier: Tier) => tier.displayName ?? tier.name ?? '')
        .join(', ') ||
      (value.selectedTierNames?.join(', ') ?? 'Tiers selected')
    );
  }
  return getTierDropdownLabel(TierDropdownOption.AllTiers);
};

//// Zod Validation Schema ////

/**
 * Validation schema for MaaS endpoint field.
 * - When unchecked (isChecked: false), no validation needed
 * - When checked with 'all-tiers' or 'no-tiers', no additional validation needed
 * - When checked with 'specify-tiers', selectedTierNames must have at least one entry
 */
export const maasEndpointsFieldSchema = z
  .object({
    isChecked: z.boolean(),
    tiersDropdownSelection: z.nativeEnum(TierDropdownOption).optional(),
    selectedTierNames: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      // Only validate selectedTierNames when checkbox is checked and 'specify-tiers' is selected
      if (data.isChecked && data.tiersDropdownSelection === 'specify-tiers') {
        return data.selectedTierNames != null && data.selectedTierNames.length > 0;
      }
      return true;
    },
    {
      message: 'Tier names are required',
      path: ['tierNamesInput'],
    },
  );

//// Reducer stuff ////

const setMaaSEndpointsFieldData = (value: MaaSTierValue): MaaSTierValue => value;
const getInitialMaaSEndpointsFieldData = (value?: MaaSTierValue): MaaSTierValue =>
  value ?? { isChecked: false };

//// External data hook ////

export type MaaSEndpointsExternalData = {
  tiers: Tier[] | undefined;
  hasViewTiersPermission: boolean;
};

const useMaaSEndpointsExternalData: MaaSEndpointsFieldType['externalDataHook'] = () => {
  const [tiers, loaded, error] = useFetchTiers();
  // If there's no error and we have tiers, the user has permission to view them
  const hasViewTiersPermission = error === undefined;

  return React.useMemo(
    () => ({
      data: { tiers, hasViewTiersPermission },
      loaded,
      loadError: error,
    }),
    [tiers, hasViewTiersPermission, loaded, error],
  );
};

//// Component ////

type MaasEndpointFieldProps = {
  id: string;
  value: MaaSTierValue;
  onChange: (value: MaaSTierValue) => void;
  externalData?: { data: MaaSEndpointsExternalData; loaded: boolean; loadError?: Error };
};

const MaasEndpointField: React.FC<MaasEndpointFieldProps> = ({
  id,
  value,
  onChange,
  externalData,
}) => {
  const { tiers, hasViewTiersPermission } = externalData?.data ?? {
    tiers: [],
    hasViewTiersPermission: false,
  };

  const tierSelectionOptions = React.useMemo((): SelectionOptions[] => {
    const availableTiers = tiers ?? [];
    if (hasViewTiersPermission) {
      // Admin: show available tiers as options
      return availableTiers.map((tier) => ({
        id: tier.name ?? '',
        name: tier.displayName ?? tier.name ?? '',
        selected: value.selectedTierNames?.includes(tier.name ?? '') ?? false,
      }));
    }
    // Non-admin: only show user-created selections (no pre-populated options)
    return (value.selectedTierNames ?? []).map((tierName) => ({
      id: tierName,
      name: tierName,
      selected: true,
    }));
  }, [tiers, hasViewTiersPermission, value.selectedTierNames]);

  const handleCheckboxChange = (_: React.FormEvent<HTMLInputElement>, checked: boolean): void => {
    if (checked) {
      onChange({
        isChecked: true,
        tiersDropdownSelection: TierDropdownOption.AllTiers,
        selectedTierNames: [],
      });
    } else {
      onChange({ isChecked: false });
    }
  };

  const handleDropdownChange = (key: string): void => {
    const isTierDropdownOption = (k: string): k is TierDropdownOption =>
      k === 'all-tiers' || k === 'no-tiers' || k === 'specify-tiers';

    if (!isTierDropdownOption(key)) {
      // eslint-disable-next-line no-console
      console.error(`Invalid tier dropdown option: ${key}`);
      return;
    }

    onChange({
      ...value,
      tiersDropdownSelection: key,
      selectedTierNames: value.selectedTierNames ?? [],
    });
  };

  const handleTierSelectionChange = (newOptions: SelectionOptions[]): void => {
    const selectedNames = newOptions.filter((opt) => opt.selected).map((opt) => String(opt.id));
    onChange({
      ...value,
      selectedTierNames: selectedNames,
    });
  };

  const showTierNamesInput = value.isChecked && value.tiersDropdownSelection === 'specify-tiers';

  return (
    <StackItem>
      <Stack hasGutter>
        <Checkbox
          id={id}
          data-testid={id}
          label={
            <>
              <div className="pf-v6-c-form__label-text">Publish as MaaS endpoint</div>
              <Flex>
                <FlexItem>
                  Enable users in any namespace to access this model by adding its endpoint to the{' '}
                  <span className="pf-v6-c-form__label-text">Models as a service</span> page. This
                  is best for production models.
                </FlexItem>
                <Label isCompact color="yellow" variant="outline">
                  Tech preview
                </Label>
              </Flex>
            </>
          }
          body={
            <>
              {value.isChecked && (
                <>
                  <FormGroup
                    label="Tier access"
                    fieldId={`${id}-tier-access`}
                    labelHelp={
                      <Popover
                        aria-label="Tier access help"
                        bodyContent="Tiers are admin-defined groups of users who share the same resource limits for MaaS usage."
                      >
                        <DashboardPopupIconButton
                          icon={<OutlinedQuestionCircleIcon />}
                          aria-label="Tier access help"
                        />
                      </Popover>
                    }
                  >
                    <HelperText>
                      <HelperTextItem>
                        Choose which tiers can use this model deployment
                      </HelperTextItem>
                    </HelperText>
                    <SimpleSelect
                      dataTestId={`${id}-tier-dropdown`}
                      toggleProps={{ id: `${id}-tier-dropdown` }}
                      options={TIER_DROPDOWN_OPTIONS.map((opt) => ({
                        key: opt.key,
                        label: opt.label,
                      }))}
                      isFullWidth
                      placeholder="Select tier access"
                      value={value.tiersDropdownSelection ?? 'all-tiers'}
                      toggleLabel={getTierDropdownLabel(
                        value.tiersDropdownSelection ?? TierDropdownOption.AllTiers,
                      )}
                      onChange={handleDropdownChange}
                      popperProps={{ appendTo: 'inline' }}
                    />
                  </FormGroup>
                  {showTierNamesInput && (
                    <FormGroup
                      label="Tier names"
                      fieldId={`${id}-tier-names`}
                      isRequired
                      className="pf-v6-u-pt-md" // Add manual padding b/c the Checkbox body overrides the FormGroup padding
                    >
                      <MultiSelection
                        inputId={`${id}-tier-names`}
                        toggleTestId={`${id}-tier-names`}
                        ariaLabel="Select resource tiers"
                        placeholder="Select tiers"
                        value={tierSelectionOptions}
                        setValue={handleTierSelectionChange}
                        isCreatable={!hasViewTiersPermission}
                        createOptionMessage={(tierName) => `Create "${tierName}"`}
                        noSelectedOptionsMessage="At least one resource tier must be selected"
                        popperProps={{ appendTo: 'inline' }}
                      />
                      <FormHelperText>
                        <HelperText>
                          <HelperTextItem>
                            {hasViewTiersPermission
                              ? 'Select from available resource tiers.'
                              : 'Enter the names of the resource tiers you want to use.'}
                          </HelperTextItem>
                        </HelperText>
                      </FormHelperText>
                    </FormGroup>
                  )}
                </>
              )}
            </>
          }
          isChecked={value.isChecked}
          onChange={handleCheckboxChange}
        />
      </Stack>
    </StackItem>
  );
};

type MaaSEndpointsFieldType = WizardField<MaaSTierValue, MaaSEndpointsExternalData>;

export const MaaSEndpointFieldWizardField: MaaSEndpointsFieldType = {
  id: 'maas/save-as-maas-checkbox',
  parentId: 'model-playground-availability',
  step: 'advancedOptions',
  type: 'addition',
  isActive: (wizardFormData) =>
    wizardFormData.modelType?.data === ServingRuntimeModelType.GENERATIVE &&
    wizardFormData.modelServer?.data?.name === LLMD_SERVING_ID,
  reducerFunctions: {
    setFieldData: setMaaSEndpointsFieldData,
    getInitialFieldData: getInitialMaaSEndpointsFieldData,
    validationSchema: maasEndpointsFieldSchema,
  },
  component: MaasEndpointField,
  externalDataHook: useMaaSEndpointsExternalData,
  getReviewSections: (value, _wizardState, externalData) => [
    {
      title: 'Advanced settings',
      items: [
        {
          key: 'maas-endpoint-enabled',
          label: 'MaaS endpoint',
          value: () => (value.isChecked ? 'Yes' : 'No'),
        },
        {
          key: 'maas-tier-access',
          label: 'MaaS tier',
          value: () =>
            getMaaSTierLabel(value, {
              data: externalData ?? { tiers: [], hasViewTiersPermission: false },
            }),
          optional: true,
          isVisible: () => value.isChecked,
        },
      ],
    },
  ],
};
