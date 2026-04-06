import React from 'react';
import { Checkbox, FormGroup } from '@patternfly/react-core';
import { z, type ZodIssue } from 'zod';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import { FieldValidationProps } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { ZodErrorHelperText } from '@odh-dashboard/internal/components/ZodErrorFormHelperText';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/internal/concepts/areas';
import { ModelTypeLabel } from '../types';

// Schema

const modelTypeValueSchema = z.enum(
  [ServingRuntimeModelType.PREDICTIVE, ServingRuntimeModelType.GENERATIVE],
  {
    // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
    required_error: 'Select a model type.',
  },
);

export type ModelTypeValue = z.infer<typeof modelTypeValueSchema>;

export const modelTypeSelectFieldSchema = z.object({
  type: modelTypeValueSchema,
  legacyVLLM: z.boolean(),
});

export type ModelTypeFieldData = z.infer<typeof modelTypeSelectFieldSchema>;
export const isValidModelType = (value: string): value is ModelTypeValue =>
  value === ServingRuntimeModelType.PREDICTIVE || value === ServingRuntimeModelType.GENERATIVE;

// Hooks

export type ModelTypeField = {
  data: ModelTypeFieldData | undefined;
  setData: (data: ModelTypeFieldData) => void;
};
export const useModelTypeField = (existingData?: ModelTypeFieldData): ModelTypeField => {
  const [modelType, setModelType] = React.useState<ModelTypeFieldData | undefined>(existingData);

  return {
    data: modelType,
    setData: setModelType,
  };
};

// Component

type ModelTypeSelectFieldProps = {
  modelType?: ModelTypeFieldData;
  setModelType?: (value: ModelTypeFieldData) => void;
  validationProps?: FieldValidationProps;
  validationIssues?: ZodIssue[];
  isEditing?: boolean;
  isDisabled?: boolean;
};
export const ModelTypeSelectField: React.FC<ModelTypeSelectFieldProps> = ({
  modelType,
  isDisabled,
  setModelType,
  validationProps,
  validationIssues = [],
  isEditing,
}) => {
  const isVLLMOnMaaSEnabled = useIsAreaAvailable(SupportedArea.VLLM_ON_MAAS).status;

  return (
    <>
      <FormGroup fieldId="model-type-select" label="Model type" isRequired>
        <SimpleSelect
          options={[
            {
              key: ServingRuntimeModelType.PREDICTIVE,
              label: ModelTypeLabel.PREDICTIVE,
            },
            {
              key: ServingRuntimeModelType.GENERATIVE,
              label: ModelTypeLabel.GENERATIVE,
            },
          ]}
          onChange={(key) => {
            if (isValidModelType(key)) {
              setModelType?.({ type: key, legacyVLLM: false });
            }
          }}
          onBlur={validationProps?.onBlur}
          placeholder="Select model type"
          value={modelType?.type}
          toggleProps={{ style: { minWidth: '300px' } }}
          dataTestId="model-type-select"
          isDisabled={isEditing || isDisabled}
        />
        <ZodErrorHelperText zodIssue={validationIssues} />
      </FormGroup>
      {isVLLMOnMaaSEnabled && modelType?.type === ServingRuntimeModelType.GENERATIVE && (
        <Checkbox
          id="legacy-mode-checkbox"
          data-testid="legacy-mode-checkbox"
          label={<span className="pf-v6-c-form__label-text">Use legacy deployment method</span>}
          description="Deploy this model using a serving runtime and inference server. This deployment method does not support MaaS."
          isChecked={modelType.legacyVLLM}
          onChange={(_e, checked) => setModelType?.({ ...modelType, legacyVLLM: checked })}
          isDisabled={isEditing || isDisabled}
        />
      )}
    </>
  );
};
