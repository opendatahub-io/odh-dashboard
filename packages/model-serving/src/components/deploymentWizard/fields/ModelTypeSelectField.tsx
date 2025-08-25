import React from 'react';
import { FormGroup } from '@patternfly/react-core';
import { z, type ZodIssue } from 'zod';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import { FieldValidationProps } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { ZodErrorHelperText } from '@odh-dashboard/internal/components/ZodErrorFormHelperText';

// Schema

export const modelTypeSelectFieldSchema = z.enum(['predictive-model', 'generative-model'], {
  // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
  required_error: 'Select a model type.',
});

export type ModelTypeFieldData = z.infer<typeof modelTypeSelectFieldSchema>;
export const isValidModelType = (value: string): value is ModelTypeFieldData =>
  value === 'predictive-model' || value === 'generative-model';

// Hooks

export type ModelTypeField = [
  data: ModelTypeFieldData | undefined,
  setData: (data: ModelTypeFieldData) => void,
];
export const useModelTypeField = (existingData?: ModelTypeFieldData): ModelTypeField => {
  const [modelType, setModelType] = React.useState<ModelTypeFieldData | undefined>(existingData);

  return [modelType, setModelType];
};

// Component

type ModelTypeSelectFieldProps = {
  modelType?: ModelTypeFieldData;
  setModelType?: (value: ModelTypeFieldData) => void;
  validationProps?: FieldValidationProps;
  validationIssues?: ZodIssue[];
};
export const ModelTypeSelectField: React.FC<ModelTypeSelectFieldProps> = ({
  modelType,
  setModelType,
  validationProps,
  validationIssues = [],
}) => (
  <FormGroup fieldId="model-type-select" label="Model type" isRequired>
    <SimpleSelect
      options={[
        {
          key: 'predictive-model',
          label: 'Predictive model',
        },
        {
          key: 'generative-model',
          label: 'Generative AI model (e.g. LLM)',
        },
      ]}
      onChange={(key) => {
        if (isValidModelType(key)) {
          setModelType?.(key);
        }
      }}
      onBlur={validationProps?.onBlur}
      placeholder="Select model type"
      value={modelType}
      toggleProps={{ style: { minWidth: '250px' } }}
    />
    <ZodErrorHelperText zodIssue={validationIssues} />
  </FormGroup>
);
