import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  AlertVariant,
  Button,
  Checkbox,
  Flex,
  FlexItem,
  Popover,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import SettingSection from '~/components/SettingSection';
import { ModelServingPlatformEnabled } from '~/types';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import { useAccessReview } from '~/api';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import { useOpenShiftURL } from '~/utilities/clusterUtils';

type ModelServingPlatformSettingsProps = {
  initialValue: ModelServingPlatformEnabled;
  enabledPlatforms: ModelServingPlatformEnabled;
  setEnabledPlatforms: (platforms: ModelServingPlatformEnabled) => void;
};

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'datasciencecluster.opendatahub.io/v1',
  resource: 'DataScienceCluster',
  verb: 'update',
};

const ModelServingPlatformSettings: React.FC<ModelServingPlatformSettingsProps> = ({
  initialValue,
  enabledPlatforms,
  setEnabledPlatforms,
}) => {
  const [alert, setAlert] = React.useState<{ variant: AlertVariant; message: string }>();
  const {
    kServe: { installed: kServeInstalled },
    modelMesh: { installed: modelMeshInstalled },
  } = useServingPlatformStatuses();

  const [allowUpdate] = useAccessReview(accessReviewResource);
  const url = useOpenShiftURL();

  React.useEffect(() => {
    const kServeDisabled = !enabledPlatforms.kServe || !kServeInstalled;
    const modelMeshDisabled = !enabledPlatforms.modelMesh || !modelMeshInstalled;
    if (kServeDisabled && modelMeshDisabled) {
      setAlert({
        variant: AlertVariant.warning,
        message:
          'Disabling both model serving platforms prevents new projects from deploying models. Models can still be deployed from existing projects that already have a serving platform.',
      });
    } else if (initialValue.modelMesh && !enabledPlatforms.modelMesh) {
      setAlert({
        variant: AlertVariant.info,
        message:
          'Disabling multi-model serving means that models in new projects or existing projects with no currently deployed models will be deployed from their own model server. Existing projects with currently deployed models will continue to use the serving platform selected for that project.',
      });
    } else if (initialValue.kServe && !enabledPlatforms.kServe) {
      setAlert({
        variant: AlertVariant.info,
        message:
          'Disabling single-model serving means that models in new projects or existing projects with no currently deployed models will be deployed from a shared model server. Existing projects with currently deployed models will continue to use the serving platform selected for that project.',
      });
    } else {
      setAlert(undefined);
    }
  }, [enabledPlatforms, initialValue, kServeInstalled, modelMeshInstalled]);

  return (
    <SettingSection
      title="Model serving platforms"
      description={
        <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            Select the serving platforms that can be used for deploying models on this cluster.
          </FlexItem>
          <Popover
            bodyContent={
              <>
                To modify the availability of model serving platforms, ask your cluster admin to
                manage the respective components in the{' '}
                {allowUpdate && url ? (
                  <Button
                    isInline
                    variant="link"
                    onClick={() => {
                      window.open(
                        `${url}/k8s/cluster/datasciencecluster.opendatahub.io~v1~DataScienceCluster`,
                      );
                    }}
                  >
                    DataScienceCluster
                  </Button>
                ) : (
                  'DataScienceCluster'
                )}{' '}
                resource.
              </>
            }
          >
            <OutlinedQuestionCircleIcon />
          </Popover>
        </Flex>
      }
    >
      <Stack hasGutter>
        <StackItem>
          <Checkbox
            label="Single-model serving platform"
            isDisabled={!kServeInstalled}
            isChecked={kServeInstalled && enabledPlatforms.kServe}
            onChange={(e, enabled) => {
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
          <Checkbox
            label="Multi-model serving platform"
            isDisabled={!modelMeshInstalled}
            isChecked={modelMeshInstalled && enabledPlatforms.modelMesh}
            onChange={(e, enabled) => {
              const newEnabledPlatforms: ModelServingPlatformEnabled = {
                ...enabledPlatforms,
                modelMesh: enabled,
              };
              setEnabledPlatforms(newEnabledPlatforms);
            }}
            aria-label="Multi-model serving platform enabled checkbox"
            id="multi-model-serving-platform-enabled-checkbox"
            data-testid="multi-model-serving-platform-enabled-checkbox"
            name="multiModelServingPlatformEnabledCheckbox"
          />
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
    </SettingSection>
  );
};

export default ModelServingPlatformSettings;
