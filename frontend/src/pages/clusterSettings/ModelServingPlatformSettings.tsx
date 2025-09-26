import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  AlertVariant,
  Button,
  Checkbox,
  Flex,
  FlexItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import SettingSection from '#~/components/SettingSection';
import { ModelServingPlatformEnabled } from '#~/types';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import { DataScienceClusterModel } from '#~/api';
import { useOpenShiftURL } from '#~/utilities/clusterUtils';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';
import { useAccessAllowed, verbModelAccess } from '#~/concepts/userSSAR';

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

  const url = useOpenShiftURL();

  const [allowedToPatchDSC] = useAccessAllowed(verbModelAccess('patch', DataScienceClusterModel));

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
    <SettingSection
      title="Model serving platforms"
      description={
        <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            Select the serving platforms that can be used for deploying models on this cluster.
          </FlexItem>
          <DashboardHelpTooltip
            content={
              <>
                To modify the availability of model serving platforms, ask your cluster admin to
                manage the respective components in the{' '}
                {allowedToPatchDSC && url ? (
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
          />
        </Flex>
      }
    >
      <Stack hasGutter>
        <StackItem>
          <Checkbox
            label="Single-model serving platform"
            description="Each model is deployed on its own model server. Choose this option when you want to deploy a large model such as a large language model (LLM)."
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
