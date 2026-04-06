import React from 'react';
import { Checkbox, FormGroup, StackItem } from '@patternfly/react-core';
import { z } from 'zod';
import type { RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import type { WizardFormData, WizardField } from '@odh-dashboard/model-serving/types/form-data';
import NumberInputWrapper from '@odh-dashboard/internal/components/NumberInputWrapper';
import DashboardHelpTooltip from '@odh-dashboard/internal/concepts/dashboard/DashboardHelpTooltip';
import type { ServingRuntimeKind, TemplateKind } from '@odh-dashboard/internal/k8sTypes';
import {
  isServingRuntimeKind,
  isTemplateKind,
} from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import { applyTimeoutConfig, extractTimeoutConfig, DEFAULT_TIMEOUT } from './timeoutApplyExtract';
import type { KServeDeployment } from '../../deployments';

export type TimeoutFieldValue = {
  timeout: number;
  return401: boolean;
};

export const timeoutFieldSchema = z.object({
  timeout: z.number().min(0),
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
 * Returns true when KServe InferenceService is active.
 * Active when editing an InferenceService or when a ServingRuntime/Template is selected.
 */
export const isKServeInferenceServiceActive = (
  wizardState: RecursivePartial<WizardFormData['state']>,
): boolean => {
  const selection = wizardState.modelServer?.data?.selection;
  if (!selection) {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const template = selection.template as ServingRuntimeKind | TemplateKind | undefined;

  if (selection.name && !template && selection.namespace) {
    return true;
  }

  if (!template) {
    return false;
  }

  // Check if it's a Template containing a ServingRuntime
  if (isTemplateKind(template)) {
    try {
      return isServingRuntimeKind(template.objects[0]);
    } catch {
      return false;
    }
  }

  // Check if it's a direct ServingRuntime
  try {
    return isServingRuntimeKind(template);
  } catch {
    return false;
  }
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
        min={0}
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
