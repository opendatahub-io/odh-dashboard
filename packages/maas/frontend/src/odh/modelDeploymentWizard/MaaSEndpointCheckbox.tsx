import React from 'react';
import {
  Checkbox,
  FormGroup,
  Popover,
  TextInput,
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
import type { WizardField } from '@odh-dashboard/model-serving/types/form-data';

/**
 * The `tiers` is the true value that is stored and is interpreted like so:
 * - `undefined` = maas not enabled / `isChecked` = false
 * - `null` = maas enabled but no tiers configured / `isChecked` = true and `tiersDropdownSelection` = 'no-tiers'
 * - `[]` = maas enabled and all tiers used / `isChecked` = true and `tiersDropdownSelection` = 'all-tiers'
 *   - This is the default value when the checkbox is checked
 * - `[string]` = maas enabled and specific tiers selected / `isChecked` = true and `tiersDropdownSelection` = 'specify-tiers'
 */
export type MaaSTierValue = {
  isChecked: boolean; // whether the checkbox is checked
  tiersDropdownSelection?: TierDropdownOption; // the selected tier from the dropdown
  tierNamesInput?: string; // if tiersDropdownSelection is 'specify-tiers', this is the raw text input for tier names (comma-separated)
};

//// Zod Validation Schema ////

/**
 * Validation schema for MaaS endpoint field.
 * - When unchecked (isChecked: false), no validation needed
 * - When checked with 'all-tiers' or 'no-tiers', no additional validation needed
 * - When checked with 'specify-tiers', tierNamesInput is required
 */
export const maasEndpointsFieldSchema = z
  .object({
    isChecked: z.boolean(),
    tiersDropdownSelection: z.enum(['all-tiers', 'no-tiers', 'specify-tiers']).optional(),
    tierNamesInput: z.string().optional(),
  })
  .refine(
    (data) => {
      // Only validate tierNamesInput when checkbox is checked and 'specify-tiers' is selected
      if (data.isChecked && data.tiersDropdownSelection === 'specify-tiers') {
        return data.tierNamesInput != null && data.tierNamesInput.trim().length > 0;
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

//// Dropdown options ////

type TierDropdownOption = 'all-tiers' | 'no-tiers' | 'specify-tiers';

const TIER_DROPDOWN_OPTIONS: Array<{ key: TierDropdownOption; label: string }> = [
  { key: 'all-tiers', label: 'All tiers' },
  { key: 'no-tiers', label: 'No tiers' },
  { key: 'specify-tiers', label: 'Specific tiers' },
];

const getTierDropdownLabel = (key: TierDropdownOption): string => {
  const option = TIER_DROPDOWN_OPTIONS.find((opt) => opt.key === key);
  return option?.label ?? 'All tiers';
};

//// Component ////

type MaasEndpointFieldProps = {
  id: string;
  value: MaaSTierValue;
  onChange: (value: MaaSTierValue) => void;
};

const MaasEndpointField: React.FC<MaasEndpointFieldProps> = ({ id, value, onChange }) => {
  const handleCheckboxChange = (_: React.FormEvent<HTMLInputElement>, checked: boolean): void => {
    if (checked) {
      onChange({
        isChecked: true,
        tiersDropdownSelection: 'all-tiers',
        tierNamesInput: '',
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
      tierNamesInput: value.tierNamesInput ?? '',
    });
  };

  const handleTierNamesChange = (
    _: React.FormEvent<HTMLInputElement>,
    inputValue: string,
  ): void => {
    onChange({
      ...value,
      tierNamesInput: inputValue,
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
                        value.tiersDropdownSelection ?? 'all-tiers',
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
                      <TextInput
                        id={`${id}-tier-names`}
                        data-testid={`${id}-tier-names`}
                        value={value.tierNamesInput ?? ''}
                        onChange={handleTierNamesChange}
                        isRequired
                        aria-describedby={`${id}-tier-names-helper`}
                      />
                      <FormHelperText>
                        <HelperText>
                          <HelperTextItem>Separate names using commas.</HelperTextItem>
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

export const MaaSEndpointFieldWizardField: WizardField<MaaSTierValue> = {
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
};
