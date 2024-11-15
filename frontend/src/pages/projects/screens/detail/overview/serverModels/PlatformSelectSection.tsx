import * as React from 'react';
import { Alert, Gallery, Stack, Text, TextContent } from '@patternfly/react-core';
import CollapsibleSection from '~/concepts/design/CollapsibleSection';
import ModelServingPlatformSelectErrorAlert from '~/pages/modelServing/screens/ModelServingPlatformSelectErrorAlert';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import SelectNIMCard from './SelectNIMCard';
import SelectSingleModelCard from './SelectSingleModelCard';
import SelectMultiModelCard from './SelectMultiModelCard';

const PlatformSelectSection: React.FC = () => {
  const [errorSelectingPlatform, setErrorSelectingPlatform] = React.useState<Error>();

  const servingPlatformStatuses = useServingPlatformStatuses();
  const kServeEnabled = servingPlatformStatuses.kServe.enabled;
  const isNIMAvailable = servingPlatformStatuses.kServeNIM.enabled;
  const modelMeshEnabled = servingPlatformStatuses.modelMesh.enabled;

  const threeEnabled = [kServeEnabled, modelMeshEnabled, isNIMAvailable].every((v) => v);
  const galleryWidths = threeEnabled
    ? {
        minWidths: { default: '100%', lg: 'calc(33.33% - 1rem / 3 * 2)' },
        maxWidths: { default: '100%', lg: 'calc(33.33% - 1rem / 3 * 2)' },
      }
    : {
        minWidths: { default: '100%', lg: 'calc(50% - 1rem / 2)' },
        maxWidths: { default: '100%', lg: 'calc(50% - 1rem / 2)' },
      };

  return (
    <CollapsibleSection title="Serve models" data-testid="section-model-server">
      <Stack hasGutter>
        <TextContent
          data-testid="no-model-serving-platform-selected"
          style={{ paddingLeft: 'var(--pf-v5-global--spacer--md)' }}
        >
          <Text component="small">
            Select the type of model serving platform to be used when deploying models from this
            project.
          </Text>
        </TextContent>
        <Gallery hasGutter {...galleryWidths}>
          {kServeEnabled && (
            <SelectSingleModelCard setErrorSelectingPlatform={setErrorSelectingPlatform} />
          )}
          {modelMeshEnabled && (
            <SelectMultiModelCard setErrorSelectingPlatform={setErrorSelectingPlatform} />
          )}
          {isNIMAvailable && (
            <SelectNIMCard setErrorSelectingPlatform={setErrorSelectingPlatform} />
          )}
        </Gallery>
        {errorSelectingPlatform && (
          <ModelServingPlatformSelectErrorAlert
            error={errorSelectingPlatform}
            clearError={() => setErrorSelectingPlatform(undefined)}
          />
        )}
        <Alert
          isInline
          variant="info"
          title="The model serving type can be changed until the first model is deployed from this project. After that, if you want to use a different model serving type, you must create a new project."
        />
      </Stack>
    </CollapsibleSection>
  );
};

export default PlatformSelectSection;
