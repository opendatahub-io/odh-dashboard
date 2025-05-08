import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import DetailsSection from '@odh-dashboard/internal/pages/projects/screens/detail/DetailsSection';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectSectionID } from '@odh-dashboard/internal/pages/projects/screens/detail/types';
// eslint-disable-next-line import/no-extraneous-dependencies
import ModelServingPlatformSelectButton from '@odh-dashboard/internal/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';
// eslint-disable-next-line import/no-extraneous-dependencies
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import { Flex, Label } from '@patternfly/react-core';
import { SelectPlatformView } from './SelectPlatformView';
import { NoModelsView } from './NoModelsView';
import { ProjectModelsProvider, ProjectModelsContext } from '../../ProjectModelsContext';
import { ModelServingContext, ModelServingProvider } from '../../ModelServingContext';

const ModelsProjectDetailsTab: React.FC = () => {
  const { availablePlatforms } = React.useContext(ModelServingContext);
  const {
    project,
    platform: projectPlatform,
    setModelServingPlatform,
    models,
  } = React.useContext(ProjectModelsContext);

  const isLoading = !project || !models || !availablePlatforms;
  const hasModels = models && models.length > 0;

  const activePlatform = React.useMemo(
    () =>
      availablePlatforms && availablePlatforms.length === 1
        ? availablePlatforms[0]
        : projectPlatform,
    [availablePlatforms, projectPlatform],
  );

  return (
    <>
      <DetailsSection
        id={ProjectSectionID.MODEL_SERVER}
        title={hasModels ? 'Models' : undefined}
        isLoading={isLoading}
        labels={[
          [
            <Flex gap={{ default: 'gapSm' }} key="serving-platform-label">
              <Label data-testid="serving-platform-label">hi</Label>
              {activePlatform && (
                // TODO: go back to platform selection page
                <ModelServingPlatformSelectButton
                  namespace="project.metadata.name"
                  servingPlatform={NamespaceApplicationCase.RESET_MODEL_SERVING_PLATFORM}
                  setError={() => undefined}
                  variant="link"
                  isInline
                  data-testid="change-serving-platform-button"
                />
              )}
            </Flex>,
          ],
        ]}
        isEmpty={!activePlatform}
        emptyState={
          !isLoading && (
            <SelectPlatformView
              platforms={availablePlatforms}
              setModelServingPlatform={setModelServingPlatform}
            />
          )
        }
      >
        {activePlatform &&
          (hasModels ? <>View models table</> : <NoModelsView platform={activePlatform} />)}
      </DetailsSection>
    </>
  );
};

const WithContext: React.FC = () => (
  <ModelServingProvider>
    <ProjectModelsProvider>
      <ModelsProjectDetailsTab />
    </ProjectModelsProvider>
  </ModelServingProvider>
);

export default WithContext;
