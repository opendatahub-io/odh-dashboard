import * as React from 'react';
import {
  Alert,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardFooter,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  Spinner,
  Stack,
} from '@patternfly/react-core';
import { useSearchParams } from 'react-router-dom';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import {
  getInferenceServiceFromServingRuntime,
  getProjectModelServingPlatform,
} from '#~/pages/modelServing/screens/projects/utils';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import CollapsibleSection from '#~/concepts/design/CollapsibleSection';
import OverviewCard from '#~/pages/projects/screens/detail/overview/components/OverviewCard';
import AddModelFooter from '#~/pages/projects/screens/detail/overview/serverModels/AddModelFooter';
import { InferenceServiceKind } from '#~/k8sTypes';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import ModelServingContextProvider from '#~/pages/modelServing/ModelServingContext';
import { isProjectNIMSupported } from '#~/pages/modelServing/screens/projects/nimUtils';
import { NamespaceApplicationCase } from '#~/pages/projects/types';
import ModelServingPlatformSelectButton from '#~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';
import ModelServingPlatformSelectErrorAlert from '#~/pages/modelServing/screens/ModelServingPlatformSelectErrorAlert';
import DeployedModelsCard from './DeployedModelsCard';

interface DeployedModelsSectionProps {
  isMultiPlatform: boolean;
}

const DeployedModelsSection: React.FC<DeployedModelsSectionProps> = ({ isMultiPlatform }) => {
  const [queryParams, setQueryParams] = useSearchParams();
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
    if (isMultiPlatform) {
      const modelInferenceServices = modelServers.reduce<InferenceServiceKind[]>(
        (acc, modelServer) => {
          const services = getInferenceServiceFromServingRuntime(inferenceServices, modelServer);
          acc.push(...services);
          return acc;
        },
        [],
      );
      setDeployedModels(modelInferenceServices);
    } else {
      setDeployedModels(inferenceServices);
    }
  }, [
    inferenceServices,
    inferenceServicesLoaded,
    isMultiPlatform,
    modelServers,
    modelServersLoaded,
  ]);

  const renderError = (message?: string): React.ReactElement => (
    <Bullseye>
      <EmptyState
        headingLevel="h2"
        icon={ExclamationCircleIcon}
        titleText="Problem loading deployed models"
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

    if (isMultiPlatform && modelServers.length && deployedModels.length === 0) {
      const navToModels = () => {
        // Instead of calling navigate(), change tabs by changing the section query param to retain other query params.
        // This is how the GenericHorizontalBar component changes tabs internally.
        queryParams.set('section', ProjectSectionID.MODEL_SERVER);
        setQueryParams(queryParams);
      };

      return (
        <OverviewCard
          objectType={ProjectObjectType.deployedModels}
          sectionType={SectionType.serving}
          title="Deployed models"
          headerInfo={
            <Flex gap={{ default: 'gapSm' }}>
              <Label>Multi-model serving enabled</Label>
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
              <Content component="small">
                Multiple models can be deployed from a single model server. Manage model servers and
                and deploy models from the{' '}
                <Button component="a" isInline variant="link" onClick={navToModels}>
                  Models
                </Button>{' '}
                tab.
              </Content>
            </Stack>
          </CardBody>
          <CardFooter>
            <Flex gap={{ default: 'gapLg' }}>
              <FlexItem>
                <Content>
                  <Content component="small">No deployed models</Content>
                </Content>
              </FlexItem>
              <FlexItem>
                <Button component="a" isInline variant="link" onClick={navToModels}>
                  Go to <b>Models</b>
                </Button>
              </FlexItem>
            </Flex>
          </CardFooter>
        </OverviewCard>
      );
    }

    if (deployedModels.length === 0) {
      return (
        <OverviewCard
          objectType={
            isMultiPlatform ? ProjectObjectType.modelServer : ProjectObjectType.deployedModels
          }
          sectionType={isMultiPlatform ? SectionType.setup : SectionType.serving}
          title={isMultiPlatform ? 'No model servers' : 'Deployed models'}
          headerInfo={
            <Flex gap={{ default: 'gapSm' }}>
              <Label>
                {isKServeNIMEnabled
                  ? 'NVIDIA NIM serving enabled'
                  : isMultiPlatform
                  ? 'Multi-model serving enabled'
                  : 'Single-model serving enabled'}
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
                  {isMultiPlatform
                    ? 'Before deploying a model, you must first add a model server.'
                    : 'Each model is deployed on its own model server.'}
                </Content>
              )}
            </Stack>
          </CardBody>
          {!platformError ? <AddModelFooter isNIM={isKServeNIMEnabled} /> : null}
        </OverviewCard>
      );
    }
    return (
      <DeployedModelsCard
        deployedModels={deployedModels}
        servingRuntimes={modelServers}
        isMultiPlatform={isMultiPlatform}
      />
    );
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
