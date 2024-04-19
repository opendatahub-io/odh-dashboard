import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ModelServingContext } from '~/pages/modelServing/ModelServingContext';
import { getProjectModelServingPlatform } from '~/pages/modelServing/screens/projects/utils';
import { ServingRuntimePlatform } from '~/types';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import { getProjectDisplayName } from '~/concepts/projects/utils';
import EmptyDetailsView from '~/components/EmptyDetailsView';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import ServeModelButton from '~/pages/modelServing/screens/global/ServeModelButton';

const EmptyModelServing: React.FC = () => {
  const navigate = useNavigate();
  const {
    servingRuntimes: { data: servingRuntimes },
    project,
  } = React.useContext(ModelServingContext);
  const servingPlatformStatuses = useServingPlatformStatuses();

  if (
    getProjectModelServingPlatform(project, servingPlatformStatuses).platform !==
      ServingRuntimePlatform.SINGLE &&
    servingRuntimes.length === 0
  ) {
    return (
      <EmptyDetailsView
        title="No deployed models"
        description="To get started, deploy a model from the Models section of a project."
        iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
        imageAlt="deploy a model"
        createButton={
          <Button
            data-testid="empty-state-action-button"
            variant="link"
            onClick={() =>
              navigate(
                project
                  ? `/projects/${project.metadata.name}?section=${ProjectSectionID.MODEL_SERVER}`
                  : '/projects',
              )
            }
          >
            {project ? `Go to ${getProjectDisplayName(project)}` : 'Select a project'}
          </Button>
        }
      />
    );
  }

  return (
    <EmptyDetailsView
      title="No deployed models"
      description="To get started, deploy a model."
      iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
      imageAlt="deploy a model"
      createButton={<ServeModelButton />}
    />
  );
};

export default EmptyModelServing;
