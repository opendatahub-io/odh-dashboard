import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  AlertVariant,
  Checkbox,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import SettingSection from '~/components/SettingSection';
import { ModelServingPlatformEnabled } from '~/types';

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

  React.useEffect(() => {
    if (!enabledPlatforms.kServe && !enabledPlatforms.modelMesh) {
      setAlert({
        variant: AlertVariant.warning,
        message:
          'Disabling both model serving platforms prevents new projects from deploying models. Models can still be deployed from existing projects that already have a serving platform.',
      });
    } else {
      if (initialValue.modelMesh && !enabledPlatforms.modelMesh) {
        setAlert({
          variant: AlertVariant.info,
          message:
            'Disabling the multi-model serving platform prevents models deployed in new projects and in existing projects with no deployed models from sharing model servers. Existing projects with deployed models will continue to use multi-model serving.',
        });
      } else {
        setAlert(undefined);
      }
    }
  }, [enabledPlatforms, initialValue]);

  return (
    <SettingSection
      title="Model serving platforms"
      description="Select the serving platforms that projects on this cluster can use for deploying models."
    >
      <Stack hasGutter>
        <StackItem>
          <Checkbox
            label="Single model serving platform"
            isChecked={enabledPlatforms.kServe}
            onChange={(enabled) => {
              const newEnabledPlatforms: ModelServingPlatformEnabled = {
                ...enabledPlatforms,
                kServe: enabled,
              };
              setEnabledPlatforms(newEnabledPlatforms);
            }}
            aria-label="Single model serving platform enabled checkbox"
            id="single-model-serving-platform-enabled-checkbox"
            data-id="single-model-serving-platform-enabled-checkbox"
            name="singleModelServingPlatformEnabledCheckbox"
          />
        </StackItem>
        <StackItem>
          <Checkbox
            label="Multi-model serving platform"
            isChecked={enabledPlatforms.modelMesh}
            onChange={(enabled) => {
              const newEnabledPlatforms: ModelServingPlatformEnabled = {
                ...enabledPlatforms,
                modelMesh: enabled,
              };
              setEnabledPlatforms(newEnabledPlatforms);
            }}
            aria-label="Multi-model serving platform enabled checkbox"
            id="multi-model-serving-platform-enabled-checkbox"
            data-id="multi-model-serving-platform-enabled-checkbox"
            name="multiModelServingPlatformEnabledCheckbox"
          />
        </StackItem>
        {alert && (
          <StackItem>
            <Alert
              data-id="serving-platform-warning-alert"
              variant={alert.variant}
              title={alert.message}
              isInline
              actionClose={<AlertActionCloseButton onClose={() => setAlert(undefined)} />}
            />
          </StackItem>
        )}
      </Stack>
    </SettingSection>
  );
};

export default ModelServingPlatformSettings;
