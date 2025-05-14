import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import DetailsSection from '@odh-dashboard/internal/pages/projects/screens/detail/DetailsSection';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectSectionID } from '@odh-dashboard/internal/pages/projects/screens/detail/types';
import { Button, Flex, Label } from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import { SelectPlatformView } from './SelectPlatformView';
import { NoModelsView } from './NoModelsView';
import { ModelServingContext } from '../../concepts/ModelServingContext';

const ModelsProjectDetailsView: React.FC = () => {
  const {
    availablePlatforms,
    project,
    platform: projectPlatform,
    setModelServingPlatform,
    resetModelServingPlatform,
    newModelServingPlatformLoading,
    models,
  } = React.useContext(ModelServingContext);

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
    <DetailsSection
      id={ProjectSectionID.MODEL_SERVER}
      title={hasModels ? 'Models' : undefined}
      isLoading={isLoading}
      labels={[
        [
          <Flex gap={{ default: 'gapSm' }} key="serving-platform-label">
            <Label data-testid="serving-platform-label">
              {activePlatform?.properties.enableCardText.enabledText}
            </Label>
            {activePlatform && availablePlatforms && availablePlatforms.length > 1 && (
              <Button
                variant="link"
                isInline
                icon={<PencilAltIcon />}
                isLoading={newModelServingPlatformLoading !== undefined}
                isDisabled={newModelServingPlatformLoading !== undefined}
                onClick={() => {
                  resetModelServingPlatform();
                }}
              >
                Change
              </Button>
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
            newPlatformLoading={newModelServingPlatformLoading}
          />
        )
      }
    >
      {activePlatform &&
        (hasModels ? <>View models table</> : <NoModelsView platform={activePlatform} />)}
    </DetailsSection>
  );
};

export default ModelsProjectDetailsView;
