import React from 'react';
import { FormGroup } from '@patternfly/react-core';
import { z, type ZodIssue } from 'zod';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import { FieldValidationProps } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { ZodErrorHelperText } from '@odh-dashboard/internal/components/ZodErrorFormHelperText';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import {
  isModelTypeFieldOverride,
  ModelLocationData,
  ModelTypeFieldOverride,
  ModelTypeLabel,
} from '../types';
import { useWizardFieldOverrides } from '../dynamicFormUtils';

// Schema
export const modelTypeSelectFieldSchema = z.object({
  type: z.string(),
});

export type ModelTypeFieldData = z.infer<typeof modelTypeSelectFieldSchema>;

// Hooks

export type ModelTypeField = {
  data: ModelTypeFieldData | undefined;
  setData: (data: ModelTypeFieldData) => void;
  externalData: {
    data: {
      extraOptions: ModelTypeFieldOverride['extraOption'][];
      forced: boolean;
    };
  };
};
export const useModelTypeField = (
  existingData?: ModelTypeFieldData,
  modelLocationData?: ModelLocationData,
): ModelTypeField => {
  const overrideFormData = React.useMemo(
    () => ({
      modelLocationData: { data: modelLocationData },
    }),
    [modelLocationData],
  );
  const modelTypeOverrides = useWizardFieldOverrides(isModelTypeFieldOverride, overrideFormData);

  const [modelTypeState, setModelTypeState] = React.useState<ModelTypeFieldData | undefined>(
    existingData,
  );

  const forcedOverride = modelTypeOverrides.find((o) => o.forced);
  const modelType = React.useMemo(
    () => (forcedOverride ? { type: forcedOverride.extraOption.key } : modelTypeState),
    [forcedOverride, modelTypeState],
  );

  return React.useMemo(
    () => ({
      data: modelType,
      setData: setModelTypeState,
      externalData: {
        data: {
          extraOptions: modelTypeOverrides.map((override) => override.extraOption),
          forced: !!forcedOverride,
        },
      },
    }),
    [modelType, setModelTypeState, modelTypeOverrides, forcedOverride],
  );
};

// Component

type ModelTypeSelectFieldProps = {
  modelType?: ModelTypeFieldData;
  setModelType?: (value: ModelTypeFieldData) => void;
  validationProps?: FieldValidationProps;
  validationIssues?: ZodIssue[];
  isEditing?: boolean;
  isDisabled?: boolean;
  externalData: ModelTypeField['externalData'];
};
export const ModelTypeSelectField: React.FC<ModelTypeSelectFieldProps> = ({
  modelType,
  isDisabled,
  setModelType,
  validationProps,
  validationIssues = [],
  isEditing,
  externalData,
}) => {
  const options = React.useMemo(() => {
    return [
      {
        key: ServingRuntimeModelType.PREDICTIVE,
        label: ModelTypeLabel.PREDICTIVE,
      },
      {
        key: ServingRuntimeModelType.GENERATIVE,
        label: ModelTypeLabel.GENERATIVE,
      },
      ...externalData.data.extraOptions,
    ];
  }, [externalData.data.extraOptions]);

  return (
    <>
      <FormGroup fieldId="model-type-select" label="Model type" isRequired>
        <SimpleSelect
          options={options}
          onChange={(key) => {
            setModelType?.({
              type: key,
            });
          }}
          onBlur={validationProps?.onBlur}
          placeholder="Select model type"
          value={modelType?.type}
          toggleProps={{ style: { minWidth: '300px' } }}
          dataTestId="model-type-select"
          isDisabled={isEditing || isDisabled || externalData.data.forced}
        />
        <ZodErrorHelperText zodIssue={validationIssues} />
      </FormGroup>
    </>
  );
};
