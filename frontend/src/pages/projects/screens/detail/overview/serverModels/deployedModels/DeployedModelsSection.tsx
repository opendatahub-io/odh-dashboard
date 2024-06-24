import * as React from 'react';
import {
  Alert,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardFooter,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  Flex,
  FlexItem,
  Label,
  Spinner,
  Text,
  TextContent,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ProjectObjectType, SectionType } from '~/concepts/design/utils';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import {
  getInferenceServiceFromServingRuntime,
  getProjectModelServingPlatform,
} from '~/pages/modelServing/screens/projects/utils';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import CollapsibleSection from '~/concepts/design/CollapsibleSection';
import OverviewCard from '~/pages/projects/screens/detail/overview/components/OverviewCard';
import AddModelFooter from '~/pages/projects/screens/detail/overview/serverModels/AddModelFooter';
import { InferenceServiceKind } from '~/k8sTypes';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import ModelServingContextProvider from '~/pages/modelServing/ModelServingContext';
import DeployedModelsCard from './DeployedModelsCard';

interface DeployedModelsSectionProps {
  isMultiPlatform: boolean;
}

const DeployedModelsSection: React.FC<DeployedModelsSectionProps> = ({ isMultiPlatform }) => {
  const navigate = useNavigate();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const {
    inferenceServices: { data: inferenceServices, loaded: inferenceServicesLoaded },
    servingRuntimes: { data: modelServers, loaded: modelServersLoaded },
  } = React.useContext(ProjectDetailsContext);

  const servingPlatformStatuses = useServingPlatformStatuses();
  const { error: platformError } = getProjectModelServingPlatform(
    currentProject,
    servingPlatformStatuses,
  );
  const [deployedModels, setDeployedModels] = React.useState<InferenceServiceKind[]>([]);

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
      <EmptyState>
        <EmptyStateHeader
          titleText="Problem loading deployed models"
          icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
          headingLevel="h2"
        />
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
      const navToModels = () =>
        navigate(
          `/projects/${currentProject.metadata.name}?section=${ProjectSectionID.MODEL_SERVER}`,
        );

      return (
        <OverviewCard
          objectType={ProjectObjectType.deployedModels}
          sectionType={SectionType.serving}
          title="Deployed models"
          headerInfo={<Label>Multi-model serving enabled</Label>}
        >
          <CardBody>
            <TextContent>
              <Text component="small">
                Multiple models can be deployed from a single model server. Manage model servers and
                and deploy models from the{' '}
                <Button component="a" isInline variant="link" onClick={navToModels}>
                  Models
                </Button>{' '}
                tab.
              </Text>
            </TextContent>
          </CardBody>
          <CardFooter>
            <Flex gap={{ default: 'gapLg' }}>
              <FlexItem>
                <TextContent>
                  <Text component="small">No deployed models</Text>
                </TextContent>
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
            <Label>
              {isMultiPlatform ? 'Multi-model serving enabled' : 'Single-model serving enabled'}
            </Label>
          }
        >
          <CardBody>
            {platformError ? (
              <Alert isInline title="Loading error" variant="danger">
                {platformError.message}
              </Alert>
            ) : (
              <TextContent>
                <Text component="small">
                  {isMultiPlatform
                    ? 'Before deploying a model, you must first add a model server.'
                    : 'Each model is deployed on its own model server.'}
                </Text>
              </TextContent>
            )}
          </CardBody>
          {!platformError ? <AddModelFooter /> : null}
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
