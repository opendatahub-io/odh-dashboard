import React from 'react';
import { Radio, Stack, StackItem } from '@patternfly/react-core';
import { z } from 'zod';
import { useAppContext } from '@odh-dashboard/internal/app/AppContext';

// Schema
export const deploymentStrategyFieldSchema = z.enum(['rolling', 'recreate']);

export type DeploymentStrategyFieldData = z.infer<typeof deploymentStrategyFieldSchema>;

export const isValidDeploymentStrategy = (value: unknown): value is DeploymentStrategyFieldData => {
  return deploymentStrategyFieldSchema.safeParse(value).success;
};

// Hook
export type DeploymentStrategyFieldHook = {
  data: DeploymentStrategyFieldData;
  setData: (data: DeploymentStrategyFieldData) => void;
};

export const useDeploymentStrategyField = (
  existingData?: DeploymentStrategyFieldData,
): DeploymentStrategyFieldHook => {
  const { dashboardConfig } = useAppContext();
  const hasInitializedRef = React.useRef(false);

  const clusterDefault = React.useMemo(() => {
    const strategy = dashboardConfig.spec.modelServing?.deploymentStrategy;
    if (strategy === 'rolling' || strategy === 'recreate') {
      return strategy;
    }
    return 'rolling';
  }, [dashboardConfig.spec.modelServing?.deploymentStrategy]);

  const [deploymentStrategy, setDeploymentStrategy] = React.useState<DeploymentStrategyFieldData>(
    () => existingData || clusterDefault,
  );

  React.useEffect(() => {
    if (!existingData && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setDeploymentStrategy(clusterDefault);
    }
  }, [clusterDefault, existingData]);

  return {
    data: deploymentStrategy,
    setData: setDeploymentStrategy,
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
          isChecked={value === 'rolling'}
          onChange={() => onChange('rolling')}
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
          isChecked={value === 'recreate'}
          onChange={() => onChange('recreate')}
          isDisabled={isDisabled}
          data-testid="deployment-strategy-recreate"
        />
      </StackItem>
    </Stack>
  );
};
