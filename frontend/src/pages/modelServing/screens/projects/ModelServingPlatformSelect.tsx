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
        Select the model serving type to be used when deploying models from this project.
      </StackItem>
      <StackItem>
        <Gallery hasGutter maxWidths={{ default: '400px' }}>
          <GalleryItem>
            <ModelServingPlatformCard
              id="single-serving-platform-card"
              action={
                <ModelServingPlatformButtonAction
                  testId="single-serving-deploy-button"
                  emptyTemplates={emptyTemplates}
                  onClick={() => onSelect(ServingRuntimePlatform.SINGLE)}
                  isProjectModelMesh={false}
                />
              }
              title="Single-model serving platform"
              description="Each model is deployed on its own model server. Choose this option when you want to deploy a large model such as a large language model (LLM)."
            />
          </GalleryItem>
          <GalleryItem>
            <ModelServingPlatformCard
              id="multi-serving-platform-card"
              action={
                <ModelServingPlatformButtonAction
                  testId="multi-serving-add-server-button"
                  emptyTemplates={emptyTemplates}
                  onClick={() => onSelect(ServingRuntimePlatform.MULTI)}
                  isProjectModelMesh
                />
              }
              title="Multi-model serving platform"
              description="Multiple models can be deployed on one shared model server. Choose this option when you want to deploy a number of small or medium-sized models that can share the server resources."
            />
          </GalleryItem>
        </Gallery>
      </StackItem>
      {alertShown && (
        <StackItem>
          <Alert
            variant="info"
            title="The model serving type can be changed until the first model is deployed from this project. After that, if you want to use a different model serving type, you must create a new project."
            isInline
            actionClose={<AlertActionCloseButton onClose={() => setAlertShown(false)} />}
          />
        </StackItem>
      )}
    </Stack>
  );
};

export default ModelServingPlatformSelect;
