import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  Gallery,
  GalleryItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ServingRuntimePlatform } from '~/types';
import ModelServingPlatformCard from '~/pages/modelServing/screens/projects/ModelServingPlatformCard';
import ModelServingPlatformButtonAction from '~/pages/modelServing/screens/projects/ModelServingPlatformButtonAction';
import EmptyModelServingPlatform from '~/pages/modelServing/screens/projects/EmptyModelServingPlatform';

type ModelServingPlatformSelectProps = {
  onSelect: (platform: ServingRuntimePlatform) => void;
  emptyTemplates: boolean;
  emptyPlatforms: boolean;
};

const ModelServingPlatformSelect: React.FC<ModelServingPlatformSelectProps> = ({
  onSelect,
  emptyTemplates,
  emptyPlatforms,
}) => {
  const [alertShown, setAlertShown] = React.useState(true);
  if (emptyPlatforms) {
    return <EmptyModelServingPlatform />;
  }

  return (
    <Stack hasGutter>
      <StackItem>
        Select the type of model serving platform to be used when deploying models in this project.
      </StackItem>
      <StackItem>
        <Gallery hasGutter maxWidths={{ default: '400px' }}>
          <GalleryItem>
            <ModelServingPlatformCard
              id="single-serving-platform-card"
              action={
                <ModelServingPlatformButtonAction
                  emptyTemplates={emptyTemplates}
                  onClick={() => onSelect(ServingRuntimePlatform.SINGLE)}
                  isProjectModelMesh={false}
                />
              }
              title="Single-model serving platform"
              description="Each model is deployed on its own model server. This platform works well for large models or models that need dedicated resources."
            />
          </GalleryItem>
          <GalleryItem>
            <ModelServingPlatformCard
              id="multi-serving-platform-card"
              action={
                <ModelServingPlatformButtonAction
                  emptyTemplates={emptyTemplates}
                  onClick={() => onSelect(ServingRuntimePlatform.MULTI)}
                  isProjectModelMesh
                />
              }
              title="Multi-model serving platform"
              description="Multiple models can be deployed on a single-model server. This platform works well for sharing resources amongst deployed models"
            />
          </GalleryItem>
        </Gallery>
      </StackItem>
      {alertShown && (
        <StackItem>
          <Alert
            variant="warning"
            title="The model serving type can be changed until the first model is deployed on this project. After that, you will need to create a new project in order to use a different model serving type."
            isInline
            actionClose={<AlertActionCloseButton onClose={() => setAlertShown(false)} />}
          />
        </StackItem>
      )}
    </Stack>
  );
};

export default ModelServingPlatformSelect;
