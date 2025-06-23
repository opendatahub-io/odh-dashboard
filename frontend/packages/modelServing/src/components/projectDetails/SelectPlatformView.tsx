import React from 'react';
import { Content, Flex, FlexItem, Stack, StackItem, Alert } from '@patternfly/react-core';
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import EmptyModelServingPlatform from '@odh-dashboard/internal/pages/modelServing/screens/projects/EmptyModelServingPlatform';
import { ModelServingPlatform } from '../../concepts/useProjectServingPlatform';
import { PlatformSelectionGallery } from '../platformSelection';

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
            <PlatformSelectionGallery
              platforms={platforms}
              onSelect={setModelServingPlatform}
              loadingPlatformId={newPlatformLoading?.properties.id}
              useOverviewCard={false}
            />
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
