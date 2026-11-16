import { useTrackEvent } from '@odh-dashboard/analytics/react';
import {
  ProjectSelectorNavigator as ProjectSelectorNavigatorFeature,
  type ProjectSelectorNavigatorProps,
} from '@odh-dashboard/autox-core/ui/components/feature';
import React from 'react';
import { fireAutomlProjectDropdownOptionSelected } from '~/app/utilities/tracking';

const ProjectSelectorNavigator = (props: ProjectSelectorNavigatorProps): React.JSX.Element => {
  const trackEvent = useTrackEvent();

  return (
    <ProjectSelectorNavigatorFeature
      {...props}
      onProjectSelected={(projectName) =>
        fireAutomlProjectDropdownOptionSelected(trackEvent, projectName)
      }
    />
  );
};

export default ProjectSelectorNavigator;
