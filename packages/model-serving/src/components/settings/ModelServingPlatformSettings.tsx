import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  AlertVariant,
  FormHelperText,
  Switch,
  Stack,
  StackItem,
  HelperText,
  HelperTextItem,
  Flex,
  FlexItem,
  Button,
  Popover,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import { useServingPlatformStatuses } from '@odh-dashboard/plugin-core/host-api';
import type { ModelServingPlatformEnabled } from '@odh-dashboard/internal/types';

type ModelServingPlatformSettingsProps = {
  enabledPlatforms: ModelServingPlatformEnabled;
  setEnabledPlatforms: (platforms: ModelServingPlatformEnabled) => void;
  isDistributedInferencingDefault: boolean;
  setIsDistributedInferencingDefault: (value: boolean) => void;
};

const ModelServingPlatformSettings: React.FC<ModelServingPlatformSettingsProps> = ({
  enabledPlatforms,
  setEnabledPlatforms,
  isDistributedInferencingDefault,
  setIsDistributedInferencingDefault,
}) => {
  const [alert, setAlert] = React.useState<{ variant: AlertVariant; message: string }>();
  const {
    kServe: { installed: kServeInstalled },
  } = useServingPlatformStatuses();

  const llmdEnabled = React.useMemo(
    () => (enabledPlatforms.kServe && kServeInstalled ? enabledPlatforms.LLMd : false),
    [enabledPlatforms, kServeInstalled],
  );

  React.useEffect(() => {
    if (!enabledPlatforms.kServe || !kServeInstalled) {
      setAlert({
        variant: AlertVariant.warning,
        message:
          'Disabling all model serving platforms prevents new projects from deploying models. Models can still be deployed from existing projects that already have a serving platform.',
      });
    } else {
      setAlert(undefined);
    }
  }, [enabledPlatforms, kServeInstalled]);

  return (
    <Stack hasGutter>
      <StackItem>
        <Switch
          label="Enable model serving"
          isDisabled={!kServeInstalled}
          isChecked={kServeInstalled && enabledPlatforms.kServe}
          onChange={(_event, enabled: boolean) => {
            setEnabledPlatforms({
              ...enabledPlatforms,
              kServe: enabled,
              LLMd: enabled,
            });
            setIsDistributedInferencingDefault(enabled);
          }}
          aria-label="Single-model serving platform enabled switch"
          id="single-model-serving-platform-enabled-switch"
          data-testid="single-model-serving-platform-enabled-switch"
          name="singleModelServingPlatformEnabledSwitch"
        />
      </StackItem>
      <StackItem>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              Enable users to deploy models on the cluster. Each model is deployed on its own model
              server.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </StackItem>
      {alert && (
        <StackItem>
          <Alert
            data-testid="serving-platform-warning-alert"
            variant={alert.variant}
            title={alert.message}
            isInline
            actionClose={<AlertActionCloseButton onClose={() => setAlert(undefined)} />}
          />
        </StackItem>
      )}
      <StackItem>
        <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <div className="pf-v6-u-font-weight-bold">Distributed inferencing</div>
          </FlexItem>
        </Flex>
      </StackItem>
      {!llmdEnabled && (
        <StackItem>
          <HelperText>
            <HelperTextItem variant="warning" icon={<ExclamationTriangleIcon />}>
              To use distributed inferencing, you must configure the inferencing gateway on your
              cluster.
            </HelperTextItem>
          </HelperText>
        </StackItem>
      )}
      <StackItem>
        <Switch
          id="enable-llmd-switch"
          label="Enable distributed inference with llm-d"
          isChecked={llmdEnabled}
          isDisabled={!enabledPlatforms.kServe || !kServeInstalled}
          onChange={(_event, checked) => {
            setEnabledPlatforms({
              ...enabledPlatforms,
              LLMd: checked,
            });
            setIsDistributedInferencingDefault(checked);
          }}
          data-testid="enable-llmd-switch"
        />
      </StackItem>
      <StackItem className="pf-v6-u-ml-xl pf-v6-u-mt-sm">
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
          >
            Learn more about distributed inferencing
          </Button>
        </Popover>
      </StackItem>
      <StackItem>
        <Switch
          id="use-distributed-llm-default-switch"
          label="Use distributed inference with llm-d by default when deploying generative models"
          isChecked={isDistributedInferencingDefault && llmdEnabled}
          onChange={(_event, checked) => setIsDistributedInferencingDefault(checked)}
          data-testid="use-distributed-llm-default-switch"
          isDisabled={!llmdEnabled}
        />
      </StackItem>
    </Stack>
  );
};

export default ModelServingPlatformSettings;
