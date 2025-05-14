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
import { ModelServingPlatform } from '../../concepts/modelServingPlatforms';

export const SelectPlatformView: React.FC<{
  platforms?: ModelServingPlatform[];
  setModelServingPlatform: (platform: ModelServingPlatform) => void;
  newPlatformLoading?: ModelServingPlatform | null;
}> = ({ platforms, setModelServingPlatform, newPlatformLoading }) => {
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
              {platforms.map((p) => (
                <GalleryItem key={p.properties.id}>
                  <Card
                    style={{
                      height: '100%',
                      border: '1px solid var(--pf-t--global--border--color--default)',
                      borderRadius: 16,
                    }}
                    data-testid="single-serving-platform-card"
                  >
                    <CardTitle>
                      <Content component={ContentVariants.h2}>
                        {p.properties.enableCardText.title}
                      </Content>
                    </CardTitle>
                    <CardBody>{p.properties.enableCardText.description}</CardBody>
                    <CardFooter>
                      <Bullseye>
                        <Button
                          isLoading={newPlatformLoading?.properties.id === p.properties.id}
                          isDisabled={newPlatformLoading?.properties.id === p.properties.id}
                          variant="secondary"
                          onClick={() => {
                            setModelServingPlatform(p);
                          }}
                        >
                          {p.properties.enableCardText.selectText}
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
