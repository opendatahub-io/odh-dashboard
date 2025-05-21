import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  AlertVariant,
  Button,
  Checkbox,
  Flex,
  FlexItem,
  FormGroup,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import SettingSection from '~/components/SettingSection';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import { ModelServingPlatformEnabled } from '~/types';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import { useKServeDeploymentMode } from '~/pages/modelServing/useKServeDeploymentMode';
import { DataScienceClusterModel } from '~/api';
import { DeploymentMode } from '~/k8sTypes';
import { useOpenShiftURL } from '~/utilities/clusterUtils';
import DashboardHelpTooltip from '~/concepts/dashboard/DashboardHelpTooltip';
import { useAccessAllowed, verbModelAccess } from '~/concepts/userSSAR';

type ModelServingPlatformSettingsProps = {
  initialValue: ModelServingPlatformEnabled;
  enabledPlatforms: ModelServingPlatformEnabled;
  setEnabledPlatforms: (platforms: ModelServingPlatformEnabled) => void;
  defaultDeploymentMode: DeploymentMode;
  setDefaultDeploymentMode: (mode: DeploymentMode) => void;
};

const ModelServingPlatformSettings: React.FC<ModelServingPlatformSettingsProps> = ({
  initialValue,
  enabledPlatforms,
  setEnabledPlatforms,
  defaultDeploymentMode,
  setDefaultDeploymentMode,
}) => {
  const { isRawAvailable, isServerlessAvailable } = useKServeDeploymentMode();
  const [alert, setAlert] = React.useState<{ variant: AlertVariant; message: string }>();
  const {
    kServe: { installed: kServeInstalled },
    modelMesh: { installed: modelMeshInstalled },
  } = useServingPlatformStatuses();

  const url = useOpenShiftURL();

  const [allowedToPatchDSC] = useAccessAllowed(verbModelAccess('patch', DataScienceClusterModel));

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
          'Projects with models already deployed will be unaffected by deselecting multi-model serving.',
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
  }, [enabledPlatforms, initialValue, kServeInstalled, modelMeshInstalled]);

  const options: SimpleSelectOption[] = [
    {
      key: DeploymentMode.RawDeployment,
      label: 'Standard (No additional dependencies)',
      isDisabled: !allowedToPatchDSC,
    },
    {
      key: DeploymentMode.Serverless,
      label: 'Advanced (Serverless and Service Mesh)',
      isDisabled: !isServerlessAvailable || !allowedToPatchDSC,
    },
  ];

  return (
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
            body={
              kServeInstalled &&
              isRawAvailable && (
                <FormGroup
                  fieldId="default-deployment-mode-select"
                  label="Default deployment mode"
                  labelHelp={
                    <DashboardHelpTooltip content="Deployment modes define which technology stack will be used to deploy a model, offering different levels of management and scalability. The default deployment mode will be automatically selected during deployment." />
                  }
                >
                  <SimpleSelect
                    toggleProps={{ id: 'default-deployment-mode-select' }}
                    dataTestId="default-deployment-mode-select"
                    value={defaultDeploymentMode}
                    onChange={(key: string) => {
                      const mode = Object.values(DeploymentMode).find((v) => key === v);
                      if (mode) {
                        setDefaultDeploymentMode(mode);
                      }
                    }}
                    options={options}
                    isDisabled={!enabledPlatforms.kServe}
                    popperProps={{ maxWidth: undefined }}
                  />
                </FormGroup>
              )
            }
          />
        </StackItem>
        <StackItem>
          <Checkbox
            label="Multi-model serving platform"
            description="Multiple models can be deployed on one shared model server. Useful for deploying a number of small or medium-sized models that can share the server resources."
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
