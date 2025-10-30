import * as React from 'react';
import {
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
  Switch,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import SettingSection from '#~/components/SettingSection';
import SimpleSelect from '#~/components/SimpleSelect';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';

type ModelDeploymentSettingsProps = {
  initialUseDistributedInferencing: boolean;
  initialDefaultDeploymentStrategy: string;
  useDistributedInferencing: boolean;
  setUseDistributedInferencing: (value: boolean) => void;
  defaultDeploymentStrategy: string;
  setDefaultDeploymentStrategy: (value: string) => void;
};

const deploymentStrategyOptions = [
  { key: 'rolling', label: 'Rolling update' },
  { key: 'recreate', label: 'Recreate' },
];

const ModelDeploymentSettings: React.FC<ModelDeploymentSettingsProps> = ({
  useDistributedInferencing,
  setUseDistributedInferencing,
  defaultDeploymentStrategy,
  setDefaultDeploymentStrategy,
}) => {
  return (
    <SettingSection title="Model deployment options">
      <Stack hasGutter>
        <StackItem>
          <Flex
            spaceItems={{ default: 'spaceItemsXs' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <div className="pf-v6-u-font-weight-bold">Distributed inferencing</div>
            </FlexItem>
          </Flex>
        </StackItem>
        <StackItem>
          <Switch
            id="use-distributed-llm-switch"
            label="Use distributed inference server with llm-d by default when deploying generative models"
            isChecked={useDistributedInferencing}
            onChange={(_event, checked) => setUseDistributedInferencing(checked)}
            data-testid="use-distributed-llm-switch"
          />
        </StackItem>
        <StackItem style={{ marginLeft: '40px', marginTop: '-10px' }}>
          <HelperText>
            <HelperTextItem icon={<OutlinedQuestionCircleIcon />}>
              Tell me more about distributed inferencing
            </HelperTextItem>
          </HelperText>
        </StackItem>
        {!useDistributedInferencing && (
          <StackItem>
            <HelperText>
              <HelperTextItem variant="warning" icon={<ExclamationTriangleIcon />}>
                To enable distributed inferencing you must first configure the inferencing gateway
                in the LLMInferenceService.
              </HelperTextItem>
            </HelperText>
          </StackItem>
        )}
        <StackItem>
          <Flex
            spaceItems={{ default: 'spaceItemsXs' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <div className="pf-v6-u-font-weight-bold">Default deployment strategy</div>
            </FlexItem>
            <DashboardHelpTooltip content={<>TEMP resource.</>} />
          </Flex>
        </StackItem>
        <StackItem>
          <SimpleSelect
            id="deployment-strategy-select"
            options={deploymentStrategyOptions}
            value={defaultDeploymentStrategy}
            onChange={(key) => setDefaultDeploymentStrategy(key)}
            dataTestId="deployment-strategy-select"
            toggleProps={{ style: { width: '180px' } }}
          />
        </StackItem>
      </Stack>
    </SettingSection>
  );
};

export default ModelDeploymentSettings;
