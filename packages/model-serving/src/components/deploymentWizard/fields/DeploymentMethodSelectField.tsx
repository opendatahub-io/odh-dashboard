import React from 'react';
import { FormGroup } from '@patternfly/react-core';
import { z } from 'zod';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type { RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import { useModelServingClusterSettings } from '../../../concepts/useModelServingClusterSettings';
import {
  type DeploymentMethodOption,
  type WizardField,
  type WizardFormData,
  isDeploymentMethodFieldOverride,
} from '../types';
import { useWizardFieldOverrides } from '../dynamicFormUtils';

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
      .toSorted((a, b) => b.label.localeCompare(a.label));
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
  const options = React.useMemo(
    () =>
      (externalData?.data.options ?? []).map((opt) => ({
        key: opt.key,
        label: opt.label,
        description: opt.description,
      })),
    [externalData?.data.options],
  );

  return (
    <FormGroup fieldId="deployment-method-select" label="Deployment method" isRequired>
      <SimpleSelect
        options={options}
        onChange={(key) => {
          onChange({ method: key });
        }}
        placeholder="Select deployment method"
        value={value?.method}
        isFullWidth
        dataTestId="deployment-method-select"
        isDisabled={isEditing}
      />
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
