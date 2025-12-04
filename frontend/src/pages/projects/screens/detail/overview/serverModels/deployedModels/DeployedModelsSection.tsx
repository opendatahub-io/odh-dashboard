import * as React from 'react';
import {
  Alert,
  Bullseye,
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  Label,
  Spinner,
  Stack,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { getProjectModelServingPlatform } from '#~/pages/modelServing/screens/projects/utils';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import CollapsibleSection from '#~/concepts/design/CollapsibleSection';
import OverviewCard from '#~/pages/projects/screens/detail/overview/components/OverviewCard';
import AddModelFooter from '#~/pages/projects/screens/detail/overview/serverModels/AddModelFooter';
import { InferenceServiceKind } from '#~/k8sTypes';
import ModelServingContextProvider from '#~/pages/modelServing/ModelServingContext';
import { isProjectNIMSupported } from '#~/pages/modelServing/screens/projects/nimUtils';
import { NamespaceApplicationCase } from '#~/pages/projects/types';
import ModelServingPlatformSelectButton from '#~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';
import ModelServingPlatformSelectErrorAlert from '#~/concepts/modelServing/Platforms/ModelServingPlatformSelectErrorAlert.tsx';
import DeployedModelsCard from './DeployedModelsCard';

const DeployedModelsSection: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const {
    inferenceServices: {
      data: { items: inferenceServices },
      loaded: inferenceServicesLoaded,
    },
    servingRuntimes: {
      data: { items: modelServers },
      loaded: modelServersLoaded,
    },
  } = React.useContext(ProjectDetailsContext);

  const servingPlatformStatuses = useServingPlatformStatuses();
  const { error: platformError } = getProjectModelServingPlatform(
    currentProject,
    servingPlatformStatuses,
  );
  const [deployedModels, setDeployedModels] = React.useState<InferenceServiceKind[]>([]);

  const isKServeNIMEnabled = isProjectNIMSupported(currentProject);

  const [errorSelectingPlatform, setErrorSelectingPlatform] = React.useState<Error>();

  React.useEffect(() => {
    if (!inferenceServicesLoaded || !modelServersLoaded) {
      return;
    }

    setDeployedModels(inferenceServices);
  }, [inferenceServices, inferenceServicesLoaded]);

  const renderError = (message?: string): React.ReactElement => (
    <Bullseye>
      <EmptyState
        headingLevel="h2"
        icon={ExclamationCircleIcon}
        titleText="Problem loading deployments"
      >
        <EmptyStateBody>{message}</EmptyStateBody>
      </EmptyState>
    </Bullseye>
  );

  const renderContent = () => {
    if (!inferenceServicesLoaded && !modelServersLoaded) {
      return (
        <Card>
          <CardBody>
            <Bullseye>
              <Spinner />
            </Bullseye>
          </CardBody>
        </Card>
      );
    }

    if (deployedModels.length === 0) {
      return (
        <OverviewCard
          objectType={ProjectObjectType.deployedModels}
          sectionType={SectionType.serving}
          title={'Deployments'}
          headerInfo={
            <Flex gap={{ default: 'gapSm' }}>
              <Label>
                {isKServeNIMEnabled ? 'NVIDIA NIM serving enabled' : 'Single-model serving enabled'}
              </Label>
              {servingPlatformStatuses.platformEnabledCount > 1 && (
                <ModelServingPlatformSelectButton
                  namespace={currentProject.metadata.name}
                  servingPlatform={NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}
                  setError={setErrorSelectingPlatform}
                  variant="link"
                  isInline
                  data-testid="change-serving-platform-button"
                />
              )}
            </Flex>
          }
        >
          <CardBody>
            <Stack hasGutter>
              {errorSelectingPlatform && (
                <ModelServingPlatformSelectErrorAlert
                  error={errorSelectingPlatform}
                  clearError={() => setErrorSelectingPlatform(undefined)}
                />
              )}
              {platformError ? (
                <Alert isInline title="Loading error" variant="danger">
                  {platformError.message}
                </Alert>
              ) : (
                <Content component="small">
                  {'Each model is deployed on its own model server.'}
                </Content>
              )}
            </Stack>
          </CardBody>
          {!platformError ? <AddModelFooter isNIM={isKServeNIMEnabled} /> : null}
        </OverviewCard>
      );
    }
    return <DeployedModelsCard deployedModels={deployedModels} servingRuntimes={modelServers} />;
  };

  return (
    <CollapsibleSection title="Serve models" data-testid="model-server-section">
      <ModelServingContextProvider
        namespace={currentProject.metadata.name}
        getErrorComponent={renderError}
      >
        {renderContent()}
      </ModelServingContextProvider>
    </CollapsibleSection>
  );
};

export default DeployedModelsSection;
