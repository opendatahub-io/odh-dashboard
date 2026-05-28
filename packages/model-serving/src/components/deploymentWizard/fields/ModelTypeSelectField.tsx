import React from 'react';
import { Checkbox, FormGroup } from '@patternfly/react-core';
import { z, type ZodIssue } from 'zod';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import { FieldValidationProps } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { ZodErrorHelperText } from '@odh-dashboard/internal/components/ZodErrorFormHelperText';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/internal/concepts/areas';
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
  legacyVLLM: z.boolean(),
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
  vLLMDeploymentOnMaaSEnabled?: boolean,
): ModelTypeField => {
  const overrideFormData = React.useMemo(
    () => ({
      modelLocationData: { data: modelLocationData },
      devFeatureFlags: { vLLMDeploymentOnMaaS: vLLMDeploymentOnMaaSEnabled },
    }),
    [modelLocationData, vLLMDeploymentOnMaaSEnabled],
  );
  const modelTypeOverrides = useWizardFieldOverrides(isModelTypeFieldOverride, overrideFormData);

  const [modelTypeState, setModelTypeState] = React.useState<ModelTypeFieldData | undefined>(
    existingData,
  );

  const forcedOverride = modelTypeOverrides.find((o) => o.forced);
  const modelType = React.useMemo(
    () =>
      forcedOverride ? { type: forcedOverride.extraOption.key, legacyVLLM: false } : modelTypeState,
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
  const isVLLMOnMaaSEnabled = useIsAreaAvailable(SupportedArea.VLLM_ON_MAAS).status;

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
              legacyVLLM: key === ServingRuntimeModelType.GENERATIVE && !isVLLMOnMaaSEnabled,
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
      {isVLLMOnMaaSEnabled && modelType?.type === ServingRuntimeModelType.GENERATIVE && (
        <Checkbox
          id="legacy-mode-checkbox"
          data-testid="legacy-mode-checkbox"
          label={<span className="pf-v6-c-form__label-text">Use legacy deployment method</span>}
          description="Deploy this model using a serving runtime and inference server. This deployment method does not support MaaS."
          isChecked={modelType.legacyVLLM}
          onChange={(_e, checked) => setModelType?.({ ...modelType, legacyVLLM: checked })}
          isDisabled={isEditing || isDisabled || externalData.data.forced}
        />
      )}
    </>
  );
};
