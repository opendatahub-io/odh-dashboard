import React from 'react';
import {
  Gallery,
  GalleryItem,
  Content,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Alert,
  CardTitle,
  CardBody,
  CardFooter,
  Card,
  Bullseye,
  Button,
  ContentVariants,
} from '@patternfly/react-core';
// eslint-disable-next-line import/no-extraneous-dependencies
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
// eslint-disable-next-line import/no-extraneous-dependencies
import EmptyModelServingPlatform from '@odh-dashboard/internal/pages/modelServing/screens/projects/EmptyModelServingPlatform';
import { useExtensions } from '@odh-dashboard/plugin-core';
import {
  ModelServingPlatformExtension,
  ModelServingPlatformCard,
  isModelServingPlatformCard,
} from '../../extension-points';

export const SelectPlatformView: React.FC<{
  platforms?: ModelServingPlatformExtension[];
  setModelServingPlatform: (platform: ModelServingPlatformExtension) => void;
}> = ({ platforms, setModelServingPlatform }) => {
  const cards = useExtensions<ModelServingPlatformCard>(isModelServingPlatformCard);

  if (!platforms || platforms.length === 0) {
    return <EmptyModelServingPlatform />;
  }

  return (
    <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapLg' }}>
      <FlexItem
        flex={{ default: 'flex_1' }}
        style={{ borderRight: '1px solid var(--pf-t--global--border--color--default)' }}
      >
        <EmptyDetailsView
          iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
          imageAlt="add a model server"
        />
      </FlexItem>
      <FlexItem flex={{ default: 'flex_1' }}>
        <Stack hasGutter>
          <StackItem>
            <Content component="p">
              Select the model serving type to be used when deploying from this project.
            </Content>
          </StackItem>
          <StackItem>
            <Gallery hasGutter>
              {cards.map((c) => (
                <GalleryItem key={c.properties.platform}>
                  <Card
                    style={{
                      height: '100%',
                      border: '1px solid var(--pf-t--global--border--color--default)',
                      borderRadius: 16,
                    }}
                    data-testid="single-serving-platform-card"
                  >
                    <CardTitle>
                      <Content component={ContentVariants.h2}>{c.properties.title}</Content>
                    </CardTitle>
                    <CardBody>{c.properties.description}</CardBody>
                    <CardFooter>
                      <Bullseye>
                        <Button
                          variant="secondary"
                          onClick={async () => {
                            const platform = platforms.find(
                              (p) => p.properties.id === c.properties.platform,
                            );
                            if (platform) {
                              setModelServingPlatform(platform);
                            }
                          }}
                        >
                          {c.properties.selectText}
                        </Button>
                      </Bullseye>
                    </CardFooter>
                  </Card>
                </GalleryItem>
              ))}
            </Gallery>
          </StackItem>
          {/* {errorSelectingPlatform && (
            <ModelServingPlatformSelectErrorAlert
              error={errorSelectingPlatform}
              clearError={() => setErrorSelectingPlatform(undefined)}
            />
          )} */}
          <StackItem>
            <Alert
              variant="info"
              isInline
              isPlain
              title="You can change the model serving type before the first model is deployed from this project. After deployment, switching types requires deleting all models and servers."
            />
          </StackItem>
        </Stack>
      </FlexItem>
    </Flex>
  );
};
