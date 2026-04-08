import React from 'react';
import { Checkbox, Stack, StackItem, Flex, FlexItem, Label } from '@patternfly/react-core';
import { z } from 'zod';
import type {
  WizardField,
  WizardStateOverrides,
} from '@odh-dashboard/model-serving/types/form-data';
import { isLLMInferenceServiceActive } from '@odh-dashboard/llmd-serving/formUtils';
import { MAAS_DEFAULT_GATEWAY } from './maasDeploymentTransformer';

export type MaaSFieldValue = {
  isChecked: boolean;
};

export const maasFieldSchema = z.object({
  isChecked: z.boolean(),
});

const setMaaSFieldData = (value: MaaSFieldValue): MaaSFieldValue => value;
const getInitialMaaSFieldData = (value?: MaaSFieldValue): MaaSFieldValue =>
  value ?? { isChecked: false };

type MaaSFieldProps = {
  id: string;
  value?: MaaSFieldValue;
  onChange: (value: MaaSFieldValue) => void;
  isDisabled?: boolean;
};

const MaaSField: React.FC<MaaSFieldProps> = ({ id, value, onChange, isDisabled }) => {
  const handleCheckboxChange = (_: React.FormEvent<HTMLInputElement>, checked: boolean): void => {
    onChange({ ...value, isChecked: checked });
  };

  return (
    <StackItem>
      <Stack hasGutter>
        <Checkbox
          id={id}
          data-testid={id}
          label={
            <>
              <div className="pf-v6-c-form__label-text">Publish as MaaS</div>
              <Flex>
                <FlexItem>
                  Publishing as MaaS makes the model deployment endpoint accessible to others as a
                  service through a gateway API.
                </FlexItem>
                <Label isCompact color="yellow" variant="outline">
                  Tech preview
                </Label>
              </Flex>
            </>
          }
          isChecked={value?.isChecked}
          isDisabled={isDisabled}
          onChange={handleCheckboxChange}
        />
      </Stack>
    </StackItem>
  );
};

export type MaaSFieldType = WizardField<MaaSFieldValue>;

export const MaaSEndpointFieldWizardField: MaaSFieldType = {
  id: 'maas/save-as-maas-checkbox',
  parentId: 'model-playground-availability',
  step: 'advancedOptions',
  type: 'addition',
  isActive: isLLMInferenceServiceActive,
  reducerFunctions: {
    setFieldData: setMaaSFieldData,
    getInitialFieldData: getInitialMaaSFieldData,
    validationSchema: maasFieldSchema,
    getFieldOverrides: (fieldValue) => {
      const overrides: WizardStateOverrides = {};
      if (fieldValue.isChecked) {
        overrides.tokenAuthentication = { isDisabled: true };
        overrides['llmd-serving/gateway'] = { isDisabled: true, selection: MAAS_DEFAULT_GATEWAY };
      } else {
        overrides['llmd-serving/gateway'] = { hiddenOptions: [MAAS_DEFAULT_GATEWAY] };
      }
      return overrides;
    },
  },
  component: MaaSField,
  getReviewSections: (value) => [
    {
      title: 'Advanced settings',
      items: [
        {
          key: 'maas-endpoint-enabled',
          label: 'MaaS endpoint',
          value: () => (value.isChecked ? 'Yes' : 'No'),
        },
      ],
    },
  ],
};
