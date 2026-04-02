import React from 'react';
import { Checkbox, FormGroup, StackItem } from '@patternfly/react-core';
import { z } from 'zod';
import type { RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import type { WizardFormData, WizardField } from '@odh-dashboard/model-serving/types/form-data';
import NumberInputWrapper from '@odh-dashboard/internal/components/NumberInputWrapper';
import DashboardHelpTooltip from '@odh-dashboard/internal/concepts/dashboard/DashboardHelpTooltip';
import type { ModelResourceType } from '@odh-dashboard/model-serving/extension-points';
import type { KServeDeployment } from '../deployments';
import { applyTimeoutConfig, extractTimeoutConfig, DEFAULT_TIMEOUT } from '../deployUtils';

export type TimeoutFieldValue = {
  timeout: number;
  return401: boolean;
};

export const timeoutFieldSchema = z.object({
  timeout: z.number().min(1),
  return401: z.boolean(),
});

const setTimeoutFieldData = (value: TimeoutFieldValue): TimeoutFieldValue => value;

const getInitialTimeoutFieldData = (value?: TimeoutFieldValue): TimeoutFieldValue => {
  if (value) {
    return value;
  }
  return { timeout: DEFAULT_TIMEOUT, return401: false };
};

/**
 * Returns true when KServe InferenceService is active (not LLM-D)
 */
export const isKServeInferenceServiceActive = (
  wizardState: RecursivePartial<WizardFormData['state']>,
  resources?: { model?: ModelResourceType },
): boolean => {
  // Check if LLM-D is selected - if so, this field should NOT be active
  const isLLMOptionSelected =
    wizardState.modelServer?.data?.selection?.name === 'llmd-serving' ||
    wizardState.modelServer?.data?.selection?.template?.kind === 'LLMInferenceServiceConfig';
  const isLLMInferenceService = resources?.model?.kind === 'LLMInferenceService';

  // Active for KServe InferenceService only (not LLM-D)
  if (isLLMOptionSelected || isLLMInferenceService) {
    return false;
  }

  // Check if this is a KServe deployment (InferenceService)
  const isInferenceService = resources?.model?.kind === 'InferenceService';
  if (isInferenceService) {
    return true;
  }

  // For new deployments, check if a non-LLM-D server is selected
  const hasModelServerSelected = !!wizardState.modelServer?.data?.selection;
  return hasModelServerSelected;
};

type TimeoutFieldProps = {
  id: string;
  value: TimeoutFieldValue;
  onChange: (value: TimeoutFieldValue) => void;
  isDisabled?: boolean;
};

const TimeoutFieldComponent: React.FC<TimeoutFieldProps> = ({
  id,
  value,
  onChange,
  isDisabled,
}) => (
  <StackItem data-testid="timeout-field">
    <FormGroup
      label="Model route timeout"
      fieldId={`${id}-timeout`}
      data-testid="timeout-field-group"
    >
      <NumberInputWrapper
        min={1}
        max={1000000}
        value={value.timeout}
        onChange={(newValue?: number) =>
          onChange({ ...value, timeout: newValue ?? DEFAULT_TIMEOUT })
        }
        increment={5}
        unit="seconds"
        isDisabled={isDisabled}
        data-testid="timeout-input"
      />
    </FormGroup>
    <FormGroup
      label="Authentication failure handling"
      fieldId={`${id}-auth-failure`}
      data-testid="auth-failure-field-group"
      labelHelp={
        <DashboardHelpTooltip
          content={
            <>
              If enabled, unauthorized requests will return a 401 Unauthorized status, instead of
              redirecting to the login page.
            </>
          }
        />
      }
    >
      <Checkbox
        label="Return 401 API Response"
        id={`${id}-return-401`}
        name={`${id}-return-401`}
        data-testid="return-401-checkbox"
        isChecked={value.return401}
        isDisabled={isDisabled}
        onChange={(e, checked) => onChange({ ...value, return401: checked })}
      />
    </FormGroup>
  </StackItem>
);

type TimeoutFieldType = WizardField<TimeoutFieldValue, undefined>;

export const TIMEOUT_FIELD_ID = 'kserve/timeout';

export const TimeoutFieldWizardField: TimeoutFieldType = {
  id: TIMEOUT_FIELD_ID,
  step: 'advancedOptions',
  type: 'addition',
  isActive: isKServeInferenceServiceActive,
  reducerFunctions: {
    setFieldData: setTimeoutFieldData,
    getInitialFieldData: getInitialTimeoutFieldData,
    validationSchema: timeoutFieldSchema,
  },
  component: TimeoutFieldComponent,
  getReviewSections: (value) => [
    {
      title: 'Advanced settings',
      items: [
        {
          key: 'timeout',
          label: 'Model route timeout',
          value: () => `${value.timeout} seconds`,
        },
      ],
    },
  ],
};

/**
 * Apply timeout field data to a KServe deployment during assembly
 */
export const applyTimeoutFieldData = (
  deployment: KServeDeployment,
  fieldData: TimeoutFieldValue,
): KServeDeployment => {
  const updatedModel = applyTimeoutConfig(deployment.model, {
    timeout: fieldData.timeout,
    return401: fieldData.return401,
  });
  return {
    ...deployment,
    model: updatedModel,
  };
};

/**
 * Extract timeout field data from an existing KServe deployment
 */
export const extractTimeoutFieldData = (deployment: KServeDeployment): TimeoutFieldValue => {
  const config = extractTimeoutConfig(deployment);
  return {
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
    return401: config.return401 ?? false,
  };
};
