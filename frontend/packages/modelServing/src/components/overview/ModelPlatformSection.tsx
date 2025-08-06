import React from 'react';
import {
  Alert,
  Content,
  Flex,
  FlexItem,
  CardBody,
  Stack,
  Label,
  CardFooter,
} from '@patternfly/react-core';
import CollapsibleSection from '@odh-dashboard/internal/concepts/design/CollapsibleSection';
import { ProjectObjectType, SectionType } from '@odh-dashboard/internal/concepts/design/utils';
import OverviewCard from '@odh-dashboard/internal/pages/projects/screens/detail/overview/components/OverviewCard';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import { NavigateBackToRegistryButton } from '@odh-dashboard/internal/concepts/modelServing/NavigateBackToRegistryButton';
import {
  useProjectServingPlatform,
  type ModelServingPlatform,
} from '../../concepts/useProjectServingPlatform';
import { DeployButton } from '../deploy/DeployButton';
import { PlatformSelectionGallery } from '../platforms/platformSelection';
import { ResetPlatformButton } from '../platforms/ResetPlatformButton';

const galleryWidth = {
  minWidths: { default: '100%', lg: 'calc(50% - 1rem / 2)' },
  maxWidths: { default: '100%', lg: 'calc(50% - 1rem / 2)' },
};

const ModelPlatformSection: React.FC<{ platforms: ModelServingPlatform[] }> = ({ platforms }) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);

  const {
    activePlatform,
    setProjectPlatform,
    resetProjectPlatform,
    newProjectPlatformLoading,
    projectPlatformError,
  } = useProjectServingPlatform(currentProject, platforms);

  // If no platform is selected -
  if (!activePlatform) {
    return (
      <CollapsibleSection title="Serve models" data-testid="section-model-server">
        <Flex gap={{ default: 'gapMd' }} direction={{ default: 'column' }}>
          <FlexItem>
            <Content
              data-testid="no-model-serving-platform-selected"
              style={{ paddingLeft: 'var(--pf-t--global--spacer--md)' }}
              component="small"
            >
              Select the type of model serving platform to be used when deploying models from this
              project.
            </Content>
          </FlexItem>
          <FlexItem>
            <PlatformSelectionGallery
              platforms={platforms}
              onSelect={setProjectPlatform}
              loadingPlatformId={newProjectPlatformLoading?.properties.id}
              useOverviewCard
              galleryProps={{ ...galleryWidth }}
            />
          </FlexItem>
          {projectPlatformError && (
            <FlexItem>
              <Alert isInline title="Error" variant="danger">
                {projectPlatformError}
              </Alert>
            </FlexItem>
          )}
          <FlexItem>
            <Alert
              isInline
              variant="info"
              title="You can change the model serving type before the first model is deployed from this project. After deployment, switching types requires deleting all models and servers."
            />
          </FlexItem>
        </Flex>
      </CollapsibleSection>
    );
  }

  // If a platform is selected -
  const {
    enableCardText: { enabledText },
    deployedModelsView: { startHintTitle, startHintDescription },
  } = activePlatform.properties;

  return (
    <CollapsibleSection title="Serve models" data-testid="section-model-server">
      <OverviewCard
        objectType={ProjectObjectType.deployedModels}
        sectionType={SectionType.serving}
        title={startHintTitle}
        headerInfo={
          <Flex gap={{ default: 'gapSm' }}>
            <Label>{enabledText}</Label>
            <ResetPlatformButton
              platforms={platforms}
              hasDeployments={false}
              isLoading={!!newProjectPlatformLoading}
              onReset={resetProjectPlatform}
            />
          </Flex>
        }
      >
        <CardBody>
          <Stack hasGutter>
            {projectPlatformError && (
              <Alert isInline title="Loading error" variant="danger">
                {projectPlatformError}
              </Alert>
            )}
            <Content component="small">{startHintDescription}</Content>
          </Stack>
        </CardBody>
        <CardFooter>
          <Flex gap={{ default: 'gapMd' }}>
            <DeployButton project={currentProject} variant="link" />
            <NavigateBackToRegistryButton isInline />
          </Flex>
        </CardFooter>
      </OverviewCard>
    </CollapsibleSection>
  );
};

export default ModelPlatformSection;
