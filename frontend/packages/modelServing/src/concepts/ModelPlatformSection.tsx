import React from 'react';
import {
  Alert,
  Content,
  Flex,
  FlexItem,
  Gallery,
  CardBody,
  Stack,
  Label,
  GalleryItem,
  CardFooter,
  Button,
} from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import CollapsibleSection from '@odh-dashboard/internal/concepts/design/CollapsibleSection';
import { ProjectObjectType, SectionType } from '@odh-dashboard/internal/concepts/design/utils';
import OverviewCard from '@odh-dashboard/internal/pages/projects/screens/detail/overview/components/OverviewCard';
import AddModelFooter from '@odh-dashboard/internal/pages/projects/screens/detail/overview/serverModels/AddModelFooter';
import {
  ModelServingPlatformContext,
  ModelServingPlatformContextType,
} from './ModelServingPlatformContext';
import { ModelServingPlatform } from './modelServingPlatforms';

const galleryWidth = {
  minWidths: { default: '100%', lg: 'calc(50% - 1rem / 2)' },
  maxWidths: { default: '100%', lg: 'calc(50% - 1rem / 2)' },
};

const PlatformEnablementCard: React.FC<{
  platform: ModelServingPlatform;
  onSelect: () => void;
  loading?: boolean;
}> = ({ platform, onSelect, loading }) => (
  <OverviewCard
    objectType={platform.properties.enableCardText.objectType}
    sectionType={SectionType.serving}
    title={platform.properties.enableCardText.title}
    data-testid={`${platform.properties.id}-platform-card`}
  >
    <CardBody>{platform.properties.enableCardText.description}</CardBody>
    <CardFooter>
      <Button
        isLoading={loading}
        isDisabled={loading}
        variant="link"
        isInline
        onClick={onSelect}
        data-testid={`${platform.properties.id}-select-button`}
      >
        {platform.properties.enableCardText.selectText}
      </Button>
    </CardFooter>
  </OverviewCard>
);

const ModelPlatformSection: React.FC = () => {
  const {
    platform: currentProjectServingPlatform,
    availablePlatforms,
    setPlatform,
    newPlatformLoading,
    platformError,
    resetPlatform,
  } = React.useContext<ModelServingPlatformContextType>(ModelServingPlatformContext);

  // If no platform is selected -
  if (!currentProjectServingPlatform) {
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
            <Gallery hasGutter {...galleryWidth}>
              {availablePlatforms?.map((p: ModelServingPlatform) => (
                <GalleryItem key={p.properties.id}>
                  <PlatformEnablementCard
                    platform={p}
                    onSelect={() => setPlatform(p)}
                    loading={newPlatformLoading?.properties.id === p.properties.id}
                  />
                </GalleryItem>
              ))}
            </Gallery>
          </FlexItem>
          {platformError && (
            <FlexItem>
              <Alert isInline title="Error" variant="danger">
                {platformError}
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
  } = currentProjectServingPlatform.properties;

  return (
    <CollapsibleSection title="Serve models" data-testid="section-model-server">
      <OverviewCard
        objectType={ProjectObjectType.modelServer}
        sectionType={SectionType.setup}
        title={startHintTitle}
        headerInfo={
          <Flex gap={{ default: 'gapSm' }}>
            <Label>{enabledText}</Label>
            {(availablePlatforms?.length ?? 0) > 1 && (
              <Button
                data-testid="change-serving-platform-button"
                variant="link"
                isInline
                onClick={resetPlatform}
                icon={<PencilAltIcon />}
                isDisabled={!!newPlatformLoading}
              >
                Change
              </Button>
            )}
          </Flex>
        }
      >
        <CardBody>
          <Stack hasGutter>
            {platformError && (
              <Alert isInline title="Loading error" variant="danger">
                {platformError}
              </Alert>
            )}
            <Content component="small">{startHintDescription}</Content>
          </Stack>
        </CardBody>
        <AddModelFooter />
      </OverviewCard>
    </CollapsibleSection>
  );
};

export default ModelPlatformSection;
