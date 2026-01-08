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
import { ModelServingPlatformEnabled } from '#~/types';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';

type ModelServingPlatformSettingsProps = {
  initialValue: ModelServingPlatformEnabled;
  enabledPlatforms: ModelServingPlatformEnabled;
  setEnabledPlatforms: (platforms: ModelServingPlatformEnabled) => void;
  useDistributedInferencingByDefault: boolean;
  setUseDistributedInferencingByDefault: (value: boolean) => void;
};

const ModelServingPlatformSettings: React.FC<ModelServingPlatformSettingsProps> = ({
  initialValue,
  enabledPlatforms,
  setEnabledPlatforms,
  useDistributedInferencingByDefault,
  setUseDistributedInferencingByDefault,
}) => {
  const [alert, setAlert] = React.useState<{ variant: AlertVariant; message: string }>();
  const {
    kServe: { installed: kServeInstalled },
  } = useServingPlatformStatuses();

  const llmdEnabled = React.useMemo(() => {
    // If kServe is enabled and installed, use the LLMd value from the enabledPlatforms, if not, default to false
    return enabledPlatforms.kServe && kServeInstalled ? enabledPlatforms.LLMd : false;
  }, [enabledPlatforms, kServeInstalled]);

  React.useEffect(() => {
    const kServeDisabled = !enabledPlatforms.kServe || !kServeInstalled;
    if (kServeDisabled) {
      setAlert({
        variant: AlertVariant.warning,
        message:
          'Disabling all model serving platforms prevents new projects from deploying models. Models can still be deployed from existing projects that already have a serving platform.',
      });
    } else if (initialValue.kServe && !enabledPlatforms.kServe) {
      setAlert({
        variant: AlertVariant.info,
        message:
          'Projects with models already deployed will be unaffected by deselecting single-model serving.',
      });
    } else {
      setAlert(undefined);
    }
  }, [enabledPlatforms, initialValue, kServeInstalled]);

  return (
    // TODO: We need to support new LLM-D interface here -- this will be awkward until that support
    <Stack hasGutter>
      <StackItem>
        <Switch
          label="Enable model serving"
          isDisabled={!kServeInstalled}
          isChecked={kServeInstalled && enabledPlatforms.kServe}
          onChange={(_event, enabled: boolean) => {
            const newEnabledPlatforms: ModelServingPlatformEnabled = {
              ...enabledPlatforms,
              kServe: enabled,
              LLMd: enabled ? enabledPlatforms.LLMd : false,
            };
            setEnabledPlatforms(newEnabledPlatforms);
            if (!enabled) {
              // If model serving is disabled, disable LLMd and useDistributedInferencing
              setUseDistributedInferencingByDefault(false);
            }
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
            Enable users to deploy models on the cluster. Each model is deployed on its own model
            server.
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
          onChange={(_event, _checked) => {
            setEnabledPlatforms({
              ...enabledPlatforms,
              LLMd: _checked,
            });
            // If LLMd is disabled, disable useDistributedInferencing
            switch (_checked) {
              case true:
                setUseDistributedInferencingByDefault(true);
                break;
              case false:
                setUseDistributedInferencingByDefault(false);
                break;
            }
          }}
          data-testid="enable-llmd-switch"
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
          isChecked={useDistributedInferencingByDefault && llmdEnabled}
          onChange={(_event, checked) => setUseDistributedInferencingByDefault(checked)}
          data-testid="use-distributed-llm-default-switch"
          isDisabled={!llmdEnabled}
        />
      </StackItem>
    </Stack>
  );
};

export default ModelServingPlatformSettings;
