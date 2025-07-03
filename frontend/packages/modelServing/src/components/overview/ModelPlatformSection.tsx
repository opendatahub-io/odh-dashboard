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
  Button,
} from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import CollapsibleSection from '@odh-dashboard/internal/concepts/design/CollapsibleSection';
import { ProjectObjectType, SectionType } from '@odh-dashboard/internal/concepts/design/utils';
import OverviewCard from '@odh-dashboard/internal/pages/projects/screens/detail/overview/components/OverviewCard';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { useProjectServingPlatform } from '../../concepts/useProjectServingPlatform';
import { DeployButton } from '../deploy/DeployButton';
import { PlatformSelectionGallery } from '../platformSelection';
import { isModelServingPlatformExtension } from '../../../extension-points';

const galleryWidth = {
  minWidths: { default: '100%', lg: 'calc(50% - 1rem / 2)' },
  maxWidths: { default: '100%', lg: 'calc(50% - 1rem / 2)' },
};

const ModelPlatformSection: React.FC = () => {
  const availablePlatforms = useExtensions(isModelServingPlatformExtension);
  const { currentProject } = React.useContext(ProjectDetailsContext);

  const {
    activePlatform,
    setProjectPlatform,
    resetProjectPlatform,
    newProjectPlatformLoading,
    projectPlatformError,
  } = useProjectServingPlatform(currentProject, availablePlatforms);

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
              platforms={availablePlatforms}
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
            {availablePlatforms.length > 1 && (
              <Button
                data-testid="change-serving-platform-button"
                variant="link"
                isInline
                onClick={resetProjectPlatform}
                icon={<PencilAltIcon />}
                isDisabled={!!newProjectPlatformLoading}
              >
                Change
              </Button>
            )}
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
          <DeployButton platform={activePlatform} variant="secondary" />
        </CardFooter>
      </OverviewCard>
    </CollapsibleSection>
  );
};

export default ModelPlatformSection;
