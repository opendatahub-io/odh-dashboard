import React from 'react';
import { Radio, Stack, StackItem } from '@patternfly/react-core';
import { z } from 'zod';
import { useAppContext } from '@odh-dashboard/internal/app/AppContext';
import type { ModelTypeField } from './ModelTypeSelectField';
import type { ModelServerSelectField } from './ModelServerTemplateSelectField';
import type { DeploymentStrategyField as DeploymentStrategyFieldType } from '../types';

// Schema
export const deploymentStrategyFieldSchema = z.enum(['rolling', 'recreate']);

export type DeploymentStrategyFieldData = z.infer<typeof deploymentStrategyFieldSchema>;

export const deploymentStrategyRolling: DeploymentStrategyFieldData = 'rolling';
export const deploymentStrategyRecreate: DeploymentStrategyFieldData = 'recreate';

export const isValidDeploymentStrategy = (value: unknown): value is DeploymentStrategyFieldData => {
  return deploymentStrategyFieldSchema.safeParse(value).success;
};

// Hook
export type DeploymentStrategyFieldHook = {
  data: DeploymentStrategyFieldData;
  setData: (data: DeploymentStrategyFieldData) => void;
  isVisible: boolean;
};

export const useDeploymentStrategyField = (
  existingData?: DeploymentStrategyFieldData,
  deploymentStrategyFields?: DeploymentStrategyFieldType[],
  modelType?: ModelTypeField,
  modelServer?: ModelServerSelectField,
): DeploymentStrategyFieldHook => {
  const { dashboardConfig } = useAppContext();

  const isVisible = React.useMemo(() => {
    if (!modelType || !deploymentStrategyFields) return true;

    const activeField = deploymentStrategyFields.find((field) =>
      field.isActive({
        modelType,
        modelServer,
      }),
    );
    return activeField?.isVisible ?? true;
  }, [deploymentStrategyFields, modelType, modelServer]);

  const clusterDefault = React.useMemo(() => {
    const strategy = dashboardConfig.spec.modelServing?.deploymentStrategy;
    if (strategy === deploymentStrategyRolling || strategy === deploymentStrategyRecreate) {
      return strategy;
    }
    return deploymentStrategyRolling;
  }, [dashboardConfig.spec.modelServing?.deploymentStrategy]);

  const [deploymentStrategy, setDeploymentStrategy] = React.useState<DeploymentStrategyFieldData>(
    () => existingData || clusterDefault,
  );

  return {
    data: deploymentStrategy,
    setData: setDeploymentStrategy,
    isVisible,
  };
};

// Component
type DeploymentStrategyFieldProps = {
  value: DeploymentStrategyFieldData;
  onChange: (value: DeploymentStrategyFieldData) => void;
  isDisabled?: boolean;
};

export const DeploymentStrategyField: React.FC<DeploymentStrategyFieldProps> = ({
  value,
  onChange,
  isDisabled = false,
}) => {
  return (
    <Stack hasGutter>
      <StackItem>
        <Radio
          id="deployment-strategy-rolling"
          name="deployment-strategy"
          label={<span className="pf-v6-u-font-weight-bold">Rolling update</span>}
          description={
            <>
              Existing inference service pods are terminated <u>after</u> new ones are started. This
              ensures zero downtime and continuous availability.
            </>
          }
          isChecked={value === deploymentStrategyRolling}
          onChange={() => onChange(deploymentStrategyRolling)}
          isDisabled={isDisabled}
          data-testid="deployment-strategy-rolling"
        />
      </StackItem>
      <StackItem>
        <Radio
          id="deployment-strategy-recreate"
          name="deployment-strategy"
          label={<span className="pf-v6-u-font-weight-bold">Recreate</span>}
          description={
            <>
              All existing inference service pods are terminated <u>before</u> any new ones are
              started. This saves resources but guarantees a period of downtime.
            </>
          }
          isChecked={value === deploymentStrategyRecreate}
          onChange={() => onChange(deploymentStrategyRecreate)}
          isDisabled={isDisabled}
          data-testid="deployment-strategy-recreate"
        />
      </StackItem>
    </Stack>
  );
};
