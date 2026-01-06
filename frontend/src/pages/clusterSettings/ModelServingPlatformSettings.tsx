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
} from '@patternfly/react-core';
import { ModelServingPlatformEnabled } from '#~/types';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';

type ModelServingPlatformSettingsProps = {
  initialValue: ModelServingPlatformEnabled;
  enabledPlatforms: ModelServingPlatformEnabled;
  setEnabledPlatforms: (platforms: ModelServingPlatformEnabled) => void;
};

const ModelServingPlatformSettings: React.FC<ModelServingPlatformSettingsProps> = ({
  initialValue,
  enabledPlatforms,
  setEnabledPlatforms,
}) => {
  const [alert, setAlert] = React.useState<{ variant: AlertVariant; message: string }>();
  const {
    kServe: { installed: kServeInstalled },
  } = useServingPlatformStatuses();

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
            };
            setEnabledPlatforms(newEnabledPlatforms);
          }}
          aria-label="Single-model serving platform enabled checkbox"
          id="single-model-serving-platform-enabled-checkbox"
          data-testid="single-model-serving-platform-enabled-checkbox"
          name="singleModelServingPlatformEnabledCheckbox"
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
    </Stack>
  );
};

export default ModelServingPlatformSettings;
