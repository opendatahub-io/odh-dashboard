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
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes.js';
import { ModelServingPlatform, ModelServingPlatformCard } from 'extension-points';

export const SelectPlatformView: React.FC<{
  platforms?: ModelServingPlatform[];
  cards?: ModelServingPlatformCard[];
  project: ProjectKind;
}> = ({ platforms, cards, project }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const a = 'a';
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
            <Content>
              <Content component="p">
                Select the model serving type to be used when deploying from this project.
              </Content>
            </Content>
          </StackItem>
          <StackItem>
            <Gallery hasGutter>
              {cards?.map((c) => (
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
                          onClick={async () => {
                            await platforms
                              ?.find((p) => p.properties.id === c.properties.platform)
                              ?.properties.enable(project);
                          }}
                        >
                          {c.properties.selectText}
                        </Button>
                      </Bullseye>
                    </CardFooter>
                  </Card>
                </GalleryItem>
              ))}
              {/* {kServeEnabled && (
                <GalleryItem>
                  <EmptySingleModelServingCard
                    setErrorSelectingPlatform={setErrorSelectingPlatform}
                  />
                </GalleryItem>
              )}
              {modelMeshEnabled && (
                <GalleryItem>
                  <EmptyMultiModelServingCard
                    setErrorSelectingPlatform={setErrorSelectingPlatform}
                  />
                </GalleryItem>
              )}
              {isNIMAvailable && (
                <GalleryItem>
                  <EmptyNIMModelServingCard setErrorSelectingPlatform={setErrorSelectingPlatform} />
                </GalleryItem>
              )} */}
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
