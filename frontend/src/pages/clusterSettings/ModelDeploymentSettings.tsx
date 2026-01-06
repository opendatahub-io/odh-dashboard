import * as React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  Popover,
  Radio,
  Stack,
  StackItem,
  Switch,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import { ModelServingPlatformEnabled } from '#~/types.ts';

type ModelDeploymentSettingsProps = {
  initialUseDistributedInferencing: boolean;
  initialDefaultDeploymentStrategy: string;
  useDistributedInferencing: boolean;
  setUseDistributedInferencing: (value: boolean) => void;
  defaultDeploymentStrategy: string;
  setDefaultDeploymentStrategy: (value: string) => void;
  enabledPlatforms: ModelServingPlatformEnabled;
  setEnabledPlatforms: (platforms: ModelServingPlatformEnabled) => void;
};

const ModelDeploymentSettings: React.FC<ModelDeploymentSettingsProps> = ({
  useDistributedInferencing,
  setUseDistributedInferencing,
  defaultDeploymentStrategy,
  setDefaultDeploymentStrategy,
  enabledPlatforms,
  setEnabledPlatforms,
}) => {
  return (
    <Stack hasGutter>
      <StackItem>
        <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <div className="pf-v6-u-font-weight-bold">Distributed inferencing</div>
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        <Switch
          id="enable-distributed-llm-switch"
          label="Enable distributed inference with llm-d"
          isChecked={enabledPlatforms.LLMd}
          onChange={(_event, _checked) => {
            setEnabledPlatforms({
              ...enabledPlatforms,
              LLMd: _checked,
            });
          }}
          data-testid="enable-distributed-llm-switch"
        />
      </StackItem>
      <StackItem style={{ marginLeft: '40px', marginTop: '-10px' }}>
        <Popover
          bodyContent={
            <>
              Distributed inferencing divides large AI workloads, such as LLMs, across your cluster
              nodes and GPUs to deliver high throughput and low latency. The LLM-D framework
              optimizes this by using intelligent scheduling and managing separate prefill and
              decode stages to optimize resource usage.
            </>
          }
        >
          <Button
            variant="link"
            icon={<OutlinedQuestionCircleIcon />}
            iconPosition="start"
            isInline
            style={{ textDecoration: 'none' }}
          >
            Learn more about distributed inferencing
          </Button>
        </Popover>
      </StackItem>
      <StackItem>
        <Switch
          id="use-distributed-llm-default-switch"
          label="Use distributed inference with llm-d by default when deploying generative models"
          isChecked={useDistributedInferencing && enabledPlatforms.LLMd}
          onChange={(_event, checked) => setUseDistributedInferencing(checked)}
          data-testid="use-distributed-llm-default-switch"
        />
      </StackItem>

      {!useDistributedInferencing && (
        <StackItem>
          <HelperText>
            <HelperTextItem variant="warning" icon={<ExclamationTriangleIcon />}>
              To use distributed inferencing, you must configure the inferencing gateway on your
              cluster.
            </HelperTextItem>
          </HelperText>
        </StackItem>
      )}
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
