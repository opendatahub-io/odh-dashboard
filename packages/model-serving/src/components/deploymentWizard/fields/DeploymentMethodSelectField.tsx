import React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Radio,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { z } from 'zod';
import type { RecursivePartial } from '@odh-dashboard/foundation';
import { ServingRuntimeModelType } from '@odh-dashboard/model-serving/shared';
import { useModelServingClusterSettings } from '../../../concepts/useModelServingClusterSettings';
import {
  type DeploymentMethodOption,
  type WizardField,
  type WizardFormData,
  isDeploymentMethodFieldOverride,
} from '../types';
import { useWizardFieldOverrides } from '../dynamicFormUtils';
import { fireDeployMethodSelected } from '../../../tracking/modelServingTrackingConstants';

// Schema

export const deploymentMethodSelectFieldSchema = z.object({
  method: z.string().min(1),
});

export type DeploymentMethodFieldData = z.infer<typeof deploymentMethodSelectFieldSchema>;

// External data

export type DeploymentMethodExternalData = {
  options: DeploymentMethodOption[];
  suggestion?: DeploymentMethodOption;
};

export const useDeploymentMethodExternalData = (): {
  data: DeploymentMethodExternalData;
  loaded: boolean;
  loadError?: Error;
} => {
  const {
    data: modelServingClusterSettings,
    loaded: clusterSettingsLoaded,
    error: clusterSettingsError,
  } = useModelServingClusterSettings();

  const overrides = useWizardFieldOverrides(isDeploymentMethodFieldOverride);

  return React.useMemo(() => {
    const options = overrides
      .flatMap((override) => override.options)
      .toSorted((a, b) => a.order - b.order);
    const suggestion = overrides.reduce<DeploymentMethodOption | undefined>(
      (acc, override) => acc ?? override.suggestion?.(modelServingClusterSettings),
      undefined,
    );

    return {
      data: { options, suggestion },
      loaded: clusterSettingsLoaded,
      loadError: clusterSettingsError,
    };
  }, [overrides, modelServingClusterSettings, clusterSettingsLoaded, clusterSettingsError]);
};

// isActive

export const isDeploymentMethodFieldActive = (
  wizardState: RecursivePartial<WizardFormData['state']>,
): boolean => {
  const modelType = wizardState.modelType?.data;
  return modelType?.type === ServingRuntimeModelType.GENERATIVE;
};

// Component

export type DeploymentMethodSelectFieldType = WizardField<
  DeploymentMethodFieldData,
  DeploymentMethodExternalData
>;

const DeploymentMethodSelectField: DeploymentMethodSelectFieldType['component'] = ({
  value,
  onChange,
  externalData,
  isEditing,
}) => {
  const options = externalData?.data.options ?? [];

  return (
    <FormGroup
      fieldId="deployment-method-select"
      label="Deployment method"
      isRequired
      data-testid="deployment-method-field"
    >
      <FormHelperText>
        <HelperText>
          <HelperTextItem>Select how this model will be deployed.</HelperTextItem>
        </HelperText>
      </FormHelperText>
      <Stack hasGutter>
        {options.map((opt) => (
          <StackItem key={opt.key}>
            <Radio
              id={`deployment-method-${opt.key}`}
              name="deployment-method"
              label={opt.label}
              description={opt.description}
              isChecked={value?.method === opt.key}
              onChange={() => {
                fireDeployMethodSelected({
                  deploymentMethod: opt.key,
                  previousDeploymentMethod: value?.method,
                });
                onChange({ method: opt.key });
              }}
              isDisabled={isEditing}
              data-testid={`deployment-method-${opt.key}`}
            />
          </StackItem>
        ))}
      </Stack>
    </FormGroup>
  );
};

// WizardField definition

export const DeploymentMethodSelectFieldWizardField: DeploymentMethodSelectFieldType = {
  id: 'deploymentMethod',
  parentId: 'modelDeployment',
  step: 'modelDeployment',
  type: 'addition',
  isActive: isDeploymentMethodFieldActive,
  reducerFunctions: {
    setFieldData: (value: DeploymentMethodFieldData) => value,
    getInitialFieldData: (
      existingFieldData?: DeploymentMethodFieldData,
      externalData?: DeploymentMethodExternalData,
    ): DeploymentMethodFieldData => {
      if (existingFieldData?.method) {
        return existingFieldData;
      }
      if (externalData?.suggestion) {
        return { method: externalData.suggestion.key };
      }
      if (externalData?.options.length === 1) {
        return { method: externalData.options[0].key };
      }
      return { method: '' };
    },
    validationSchema: deploymentMethodSelectFieldSchema,
  },
  component: DeploymentMethodSelectField,
  externalDataHook: useDeploymentMethodExternalData,
};
