import * as React from 'react';
import { Flex, FlexItem, Radio, Stack, StackItem } from '@patternfly/react-core';

type ModelDeploymentSettingsProps = {
  defaultDeploymentStrategy: string;
  setDefaultDeploymentStrategy: (value: string) => void;
};

const ModelDeploymentSettings: React.FC<ModelDeploymentSettingsProps> = ({
  defaultDeploymentStrategy,
  setDefaultDeploymentStrategy,
}) => {
  return (
    <Stack hasGutter>
      <StackItem style={{ marginTop: '20px' }}>
        <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <div className="pf-v6-u-font-weight-bold">Default deployment strategy</div>
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        <Stack hasGutter>
          <StackItem>
            <Radio
              id="deployment-strategy-rolling"
              name="deployment-strategy"
              label={<span className="pf-v6-u-font-weight-bold">Rolling update</span>}
              description={
                <>
                  Existing inference service pods are terminated <u>after</u> new ones are started.
                  This ensures zero downtime and continuous availability.
                </>
              }
              isChecked={defaultDeploymentStrategy === 'rolling'}
              onChange={() => setDefaultDeploymentStrategy('rolling')}
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
              isChecked={defaultDeploymentStrategy === 'recreate'}
              onChange={() => setDefaultDeploymentStrategy('recreate')}
              data-testid="deployment-strategy-recreate"
            />
          </StackItem>
        </Stack>
      </StackItem>
    </Stack>
  );
};

export default ModelDeploymentSettings;
